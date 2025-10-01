#!/usr/bin/env bash
set -euo pipefail
IFS=$'\n\t'

PROJECT_ROOT=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)
COMPOSE_BIN=${COMPOSE_BIN:-""}
declare -a COMPOSE_CMD=()
POSTGRES_VOLUME=${POSTGRES_VOLUME:-"development-sathub_postgres_data"}
DEFAULT_WAIT_SECONDS=${DEFAULT_WAIT_SECONDS:-15}
DEFAULT_RESTART_TIMEOUT=${DEFAULT_RESTART_TIMEOUT:-120}

print_usage() {
  cat <<'USAGE'
SatHub helper script

Usage: ./satctl.sh <command> [options]

Commands
  up [service...]                Start the stack (default builds all services).
    --no-build                   Skip the compose build step.

  down                           Stop all services.

  status                        Show docker compose service status summary.

  logs [service]                 Stream logs optionally filtered by service or pattern.
    -f, --follow                 Follow logs.
    --tail <n>                   Include the last N lines (default: all).
    --since <duration>           Show logs since duration (e.g. 10m, 1h).
    -g, --grep <pattern>         Filter logs using grep (extended regex).
    -C, --context <n>            Show N lines before and after matches (no follow).
    -B, --before <n>             Show N lines before matches (no follow).
    -A, --after <n>              Show N lines after matches (no follow).

  clean                          Stop services and remove persistent volumes.

  seed [scenario]                Seed the database (default scenario: base).
    scenario options: base, test-85, test-90

  restart                        Clean, start, wait for backend, and seed data.
    --scenario <name>            Seed scenario to apply (default: base).
    --timeout <seconds>          Wait timeout for backend readiness (default: 120).
    --no-clean                   Skip volume cleanup before restarting.

  release                        Run the release script.

  help                           Show this help message.
USAGE
}

command_exists() {
  command -v "$1" >/dev/null 2>&1
}

run_compose() {
  if [[ ${#COMPOSE_CMD[@]} -eq 0 ]]; then
    echo "Internal error: docker compose command not initialised." >&2
    exit 1
  fi
  "${COMPOSE_CMD[@]}" "$@"
}

ensure_compose_available() {
  if ! command_exists docker; then
    echo "Error: docker is not installed or not in PATH." >&2
    exit 1
  fi
  if [[ -n $COMPOSE_BIN ]]; then
    # Custom override provided
    if ! read -r -a COMPOSE_CMD <<<"$COMPOSE_BIN"; then
      echo "Error parsing COMPOSE_BIN='$COMPOSE_BIN'." >&2
      exit 1
    fi
    if ! "${COMPOSE_CMD[@]}" version >/dev/null 2>&1; then
      echo "Error: specified COMPOSE_BIN command '$COMPOSE_BIN' is not executable." >&2
      exit 1
    fi
    return
  fi

  if docker compose version >/dev/null 2>&1; then
    COMPOSE_CMD=(docker compose)
    return
  fi

  if command_exists docker-compose && docker-compose version >/dev/null 2>&1; then
    COMPOSE_CMD=(docker-compose)
    return
  fi

  echo "Error: docker compose plugin or docker-compose binary not found." >&2
  echo "Install Docker Compose v2 or set COMPOSE_BIN to a compatible command." >&2
  exit 1
}

logs_with_grep() {
  local follow=$1
  local pattern=$2
  local before=$3
  local after=$4
  shift 4

  if [[ $follow -eq 1 ]]; then
    if [[ -n $before || -n $after ]]; then
      echo "Context flags (--context/--before/--after) aren't supported when following logs with --grep." >&2
      exit 1
    fi
    run_compose "$@" | grep --line-buffered -E "$pattern" || true
  else
    local grep_args=("-E" "$pattern")
    if [[ -n $before ]]; then
      grep_args=("-B" "$before" "${grep_args[@]}")
    fi
    if [[ -n $after ]]; then
      grep_args=("-A" "$after" "${grep_args[@]}")
    fi
    run_compose "$@" | grep "${grep_args[@]}" || true
  fi
}

cmd_up() {
  local build=1
  local services=()
  while [[ $# -gt 0 ]]; do
    case "$1" in
      --no-build)
        build=0
        shift
        ;;
      -h|--help)
        cat <<'HELP'
Usage: ./satctl.sh up [service...] [--no-build]

Starts the requested services (or all when omitted). Builds images unless --no-build is provided.
HELP
        return 0
        ;;
      --)
        shift
        services+=("$@")
        break
        ;;
      -*)
        echo "Unknown option for up: $1" >&2
        exit 1
        ;;
      *)
        services+=("$1")
        shift
        ;;
    esac
  done

  local args=("up" "-d")
  if [[ $build -eq 1 ]]; then
    args+=("--build")
  fi
  if [[ ${#services[@]} -gt 0 ]]; then
    args+=("${services[@]}")
  fi
  run_compose "${args[@]}"
}

cmd_down() {
  run_compose down
}

check_port() {
  local port=$1
  if [[ -z $port || $port == "-" ]]; then
    echo ""
    return
  fi
  
  # Try localhost connection with timeout
  if timeout 1 bash -c "echo >/dev/tcp/localhost/$port" 2>/dev/null; then
    echo "✓"
  else
    echo "✗"
  fi
}

cmd_status() {
  local include_all=0
  local check_ports=0

  while [[ $# -gt 0 ]]; do
    case "$1" in
      -a|--all)
        include_all=1
        shift
        ;;
      -c|--check-ports)
        check_ports=1
        shift
        ;;
      -h|--help)
        cat <<'HELP'
Usage: ./satctl.sh status [--all] [--check-ports]

Options
  -a, --all          Include stopped containers (docker compose ps --all).
  -c, --check-ports  Check if ports are actually listening (slower).

Examples
  ./satctl.sh status
  ./satctl.sh status --all
  ./satctl.sh status --check-ports
HELP
        return 0
        ;;
      *)
        echo "Unknown option for status: $1" >&2
        exit 1
        ;;
    esac
  done

  local args=("ps")
  if [[ $include_all -eq 1 ]]; then
    args+=("--all")
  fi

  if [[ $check_ports -eq 1 ]]; then
    echo "SERVICE      STATUS            PORT  LISTENING"
    echo "------------------------------------------------"
  else
    echo "SERVICE      STATUS            PORT"
    echo "----------------------------------------"
  fi
  
  # Create a temp file to store service/port info
  local tmpfile
  tmpfile=$(mktemp)
  
  run_compose "${args[@]}" | awk '
    NR==1 {
      # Find the position of SERVICE column
      service_pos = index($0, "SERVICE")
      # Find where CREATED column starts (end of SERVICE column)
      created_pos = index($0, "CREATED")
      # Find PORTS column position
      ports_pos = index($0, "PORTS")
      next
    }
    NF>0 && service_pos > 0 && created_pos > 0 {
      # Extract SERVICE field using column positions
      service = substr($0, service_pos, created_pos - service_pos)
      # Trim whitespace
      gsub(/^[[:space:]]+|[[:space:]]+$/, "", service)
      
      status = "unknown"
      port = "-"
      
      # Look for status in the line
      if ($0 ~ /Up[^a-z]/) {
        if ($0 ~ /\(healthy\)/) {
          status = "✓ Up (healthy)"
        } else {
          status = "✓ Up"
        }
      } else if ($0 ~ /Exit/) {
        status = "✗ Exited"
      } else if ($0 ~ /Restarting/) {
        status = "↻ Restarting"
      }
      
      # Extract ports (if column exists)
      if (ports_pos > 0) {
        ports_text = substr($0, ports_pos)
        # Match pattern like 0.0.0.0:PORT->TARGET/tcp or :::PORT->TARGET/tcp
        if (match(ports_text, /:([0-9]+)->/)) {
          # Extract the port number after the colon
          port_start = RSTART + 1
          port_end = index(substr(ports_text, port_start), "->")
          if (port_end > 0) {
            port = substr(ports_text, port_start, port_end - 1)
          }
        }
        # If no external port, look for just exposed port like "8080/tcp"
        else if (match(ports_text, /([0-9]+)\/(tcp|udp)/)) {
          port_start = RSTART
          port_end = index(substr(ports_text, port_start), "/")
          if (port_end > 0) {
            port = substr(ports_text, port_start, port_end - 1) " (internal)"
          }
        }
      }
      
      print service "|" status "|" port
    }
  ' > "$tmpfile"
  
  # Read the temp file and optionally check ports
  while IFS='|' read -r service status port; do
    if [[ $check_ports -eq 1 ]]; then
      # Extract numeric port if present (remove " (internal)" suffix)
      port_num=$(echo "$port" | grep -oE '^[0-9]+')
      if [[ -n $port_num && $port_num != "-" ]]; then
        listening=$(check_port "$port_num")
      else
        listening=""
      fi
      printf "%-12s %-17s %-5s %s\n" "$service" "$status" "$port" "$listening"
    else
      printf "%-12s %-17s %s\n" "$service" "$status" "$port"
    fi
  done < "$tmpfile"
  
  rm -f "$tmpfile"
}

cmd_logs() {
  local follow=0
  local tail_opt=""
  local since_opt=""
  local pattern=""
  local before=""
  local after=""
  local context=""
  local service=""

  while [[ $# -gt 0 ]]; do
    case "$1" in
      -f|--follow)
        follow=1
        shift
        ;;
      --tail)
        tail_opt="$2"
        shift 2
        ;;
      --since)
        since_opt="$2"
        shift 2
        ;;
      -g|--grep)
        pattern="$2"
        shift 2
        ;;
      -C|--context)
        context="$2"
        shift 2
        ;;
      -B|--before)
        before="$2"
        shift 2
        ;;
      -A|--after)
        after="$2"
        shift 2
        ;;
      -h|--help)
        cat <<'HELP'
Usage: ./satctl.sh logs [service] [options]

Options
  -f, --follow           Follow log output.
  --tail <n>             Display the last N lines.
  --since <duration>     Show logs since duration (e.g. 5m, 2h).
  -g, --grep <pattern>   Filter logs with extended grep pattern.
  -C, --context <n>      Include N lines before/after matches (no follow).
  -B, --before <n>       Include N lines before matches (no follow).
  -A, --after <n>        Include N lines after matches (no follow).

Examples
  ./satctl.sh logs backend --tail 200
  ./satctl.sh logs frontend -g "ERROR" -C 2
  ./satctl.sh logs -f
HELP
        return 0
        ;;
      -*)
        echo "Unknown option for logs: $1" >&2
        exit 1
        ;;
      *)
        if [[ -n $service ]]; then
          echo "Only one service can be specified for logs." >&2
          exit 1
        fi
        service="$1"
        shift
        ;;
    esac
  done

  if [[ -n $context ]]; then
    before="$context"
    after="$context"
  fi

  if [[ -n $before || -n $after ]]; then
    if [[ $follow -eq 1 ]]; then
      echo "--before/--after/--context cannot be combined with --follow." >&2
      exit 1
    fi
  fi

  local args=("logs")
  if [[ $follow -eq 1 ]]; then
    args+=("-f")
  fi
  if [[ -n $tail_opt ]]; then
    args+=("--tail" "$tail_opt")
  fi
  if [[ -n $since_opt ]]; then
    args+=("--since" "$since_opt")
  fi
  if [[ -n $service ]]; then
    args+=("$service")
  fi

  if [[ -n $pattern ]]; then
    logs_with_grep "$follow" "$pattern" "$before" "$after" "${args[@]}"
  else
    run_compose "${args[@]}"
  fi
}

cmd_clean() {
  run_compose down
  docker volume rm "$POSTGRES_VOLUME" >/dev/null 2>&1 || true
}

run_seed() {
  local scenario=${1:-base}
  case "$scenario" in
    base|default)
      run_compose exec backend go run cmd/seed/seed.go
      ;;
    test-85)
      run_compose exec backend go run cmd/seed/seed.go --test-85
      ;;
    test-90)
      run_compose exec backend go run cmd/seed/seed.go --test-90
      ;;
    *)
      echo "Unknown seed scenario: $scenario" >&2
      exit 1
      ;;
  esac
}

cmd_seed() {
  local scenario="${1:-base}"
  case "$scenario" in
    -h|--help)
      cat <<'HELP'
Usage: ./satctl.sh seed [scenario]

Scenarios
  base (default)   Development seed with test users and 85% uptime station
  test-85          85% uptime test scenario
  test-90          90.5% uptime test scenario (adds to existing 85% scenario)
HELP
      return 0
      ;;
  esac
  run_seed "$scenario"
}

wait_for_backend() {
  local timeout=${1:-$DEFAULT_RESTART_TIMEOUT}
  local elapsed=0
  local interval=5
  echo "Waiting for backend to report as Up (timeout ${timeout}s)..."
  while [[ $elapsed -lt $timeout ]]; do
    if run_compose ps backend 2>/dev/null | grep -qE "backend\s+.*\s+Up"; then
      echo "Backend is running."
      return 0
    fi
    sleep "$interval"
    elapsed=$((elapsed + interval))
  done
  echo "Backend did not become ready within ${timeout}s." >&2
  return 1
}

cmd_restart() {
  local scenario="base"
  local timeout=$DEFAULT_RESTART_TIMEOUT
  local do_clean=1

  while [[ $# -gt 0 ]]; do
    case "$1" in
      --scenario)
        scenario="$2"
        shift 2
        ;;
      --timeout)
        timeout="$2"
        shift 2
        ;;
      --no-clean)
        do_clean=0
        shift
        ;;
      -h|--help)
        cat <<'HELP'
Usage: ./satctl.sh restart [--scenario <name>] [--timeout <seconds>] [--no-clean]

Sequence
  1. Optionally clean (down + volume removal).
  2. Start services with build.
  3. Wait until backend reports as Up (default timeout 120s).
  4. Execute the selected seeding scenario (default test-85).
HELP
        return 0
        ;;
      *)
        echo "Unknown option for restart: $1" >&2
        exit 1
        ;;
    esac
  done

  if [[ $do_clean -eq 1 ]]; then
    cmd_clean
  fi
  cmd_up
  wait_for_backend "$timeout"
  run_seed "$scenario"
}

cmd_release() {
  local script="${PROJECT_ROOT}/release.sh"
  if [[ ! -x $script ]]; then
    echo "release.sh not found or not executable." >&2
    exit 1
  fi
  "$script"
}

main() {
  ensure_compose_available

  if [[ $# -eq 0 ]]; then
    print_usage
    exit 0
  fi

  local command="$1"
  shift || true

  case "$command" in
    up)
      cmd_up "$@"
      ;;
    down)
      cmd_down "$@"
      ;;
    status)
      cmd_status "$@"
      ;;
    logs)
      cmd_logs "$@"
      ;;
    clean)
      cmd_clean "$@"
      ;;
    seed)
      cmd_seed "$@"
      ;;
    restart)
      cmd_restart "$@"
      ;;
    release)
      cmd_release "$@"
      ;;
    help|-h|--help)
      print_usage
      ;;
    *)
      echo "Unknown command: $command" >&2
      echo
      print_usage
      exit 1
      ;;
  esac
}

main "$@"
