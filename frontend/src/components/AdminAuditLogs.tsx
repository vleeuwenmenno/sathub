import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  Card,
  Typography,
  Box,
  Chip,
  Input,
  Select,
  Option,
  Button,
  Stack,
  Alert,
  CircularProgress,
  Table,
  Modal,
  ModalDialog,
  ModalClose,
  IconButton,
  FormControl,
  FormLabel,
} from "@mui/joy";
import {
  getAuditLogs,
  getIPInfo,
  type AuditLog,
  type AuditLogsResponse,
  type IPInfo,
} from "../api";
import RefreshIcon from "@mui/icons-material/Refresh";
import FilterListIcon from "@mui/icons-material/FilterList";
import ClearIcon from "@mui/icons-material/Clear";

const AdminAuditLogs: React.FC = () => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [limit] = useState(50);

  // Filters
  const [filters, setFilters] = useState({
    user_id: "",
    action: "",
    target_type: "",
    target_id: "",
    search: "",
    date_from: "",
    date_to: "",
  });

  const [showFilters, setShowFilters] = useState(false);
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [ipInfo, setIpInfo] = useState<IPInfo | null>(null);
  const [ipInfoLoading, setIpInfoLoading] = useState(false);
  const [ipInfoError, setIpInfoError] = useState<string | null>(null);

  const fetchLogs = async () => {
    try {
      setLoading(true);
      setError(null);

      const response: AuditLogsResponse = await getAuditLogs(
        page,
        limit,
        filters
      );
      setLogs(response.logs);
      setTotalPages(response.pagination.pages);
      setTotal(response.pagination.total);
    } catch (err) {
      setError("Failed to load audit logs");
      console.error("Error fetching audit logs:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [page, filters]);

  const handleFilterChange = (field: string, value: string) => {
    setFilters((prev) => ({ ...prev, [field]: value }));
    setPage(1); // Reset to first page when filters change
  };

  const clearFilters = () => {
    setFilters({
      user_id: "",
      action: "",
      target_type: "",
      target_id: "",
      search: "",
      date_from: "",
      date_to: "",
    });
    setPage(1);
  };

  const getActionColor = (action: string) => {
    if (action.includes("create") || action.includes("register"))
      return "success";
    if (action.includes("delete") || action.includes("ban")) return "danger";
    if (action.includes("update") || action.includes("change"))
      return "warning";
    if (action.includes("login") || action.includes("enable")) return "primary";
    return "neutral";
  };

  const formatAction = (action: string) => {
    return action.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
  };

  const formatMetadata = (metadata: Record<string, any> | undefined) => {
    if (!metadata || Object.keys(metadata).length === 0)
      return "No additional details";

    return Object.entries(metadata)
      .map(([key, value]) => `${key}: ${value}`)
      .join(", ");
  };

  const handleViewDetails = async (log: AuditLog) => {
    setSelectedLog(log);
    setDetailsOpen(true);

    // Fetch IP information if IP address is present
    if (log.ip_address) {
      setIpInfoLoading(true);
      setIpInfoError(null);
      setIpInfo(null);
      try {
        const info = await getIPInfo(log.ip_address);
        setIpInfo(info);
      } catch (error) {
        setIpInfoError("Failed to fetch IP information");
        console.error("Error fetching IP info:", error);
      } finally {
        setIpInfoLoading(false);
      }
    } else {
      setIpInfo(null);
      setIpInfoError(null);
      setIpInfoLoading(false);
    }
  };

  if (loading && logs.length === 0) {
    return (
      <Box
        sx={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          height: "400px",
        }}
      >
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ py: { xs: 1, md: 2 }, px: 0, maxWidth: "1400px", mx: "auto" }}>
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          mb: 3,
        }}
      >
        <Typography level="h2">Audit Logs</Typography>
        <Stack direction="row" spacing={1}>
          <IconButton onClick={() => setShowFilters(!showFilters)}>
            <FilterListIcon />
          </IconButton>
          <IconButton onClick={fetchLogs} disabled={loading}>
            <RefreshIcon />
          </IconButton>
        </Stack>
      </Box>

      {error && (
        <Alert color="danger" variant="soft" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {showFilters && (
        <Card sx={{ mb: 3 }}>
          <Typography level="h4" sx={{ mb: 2 }}>
            Filters
          </Typography>
          <Stack
            spacing={2}
            direction={{ xs: "column", md: "row" }}
            sx={{ flexWrap: "wrap" }}
          >
            <FormControl size="sm" sx={{ minWidth: 200 }}>
              <FormLabel>Search</FormLabel>
              <Input
                placeholder="Username, action, target..."
                value={filters.search}
                onChange={(e) => handleFilterChange("search", e.target.value)}
              />
            </FormControl>

            <FormControl size="sm" sx={{ minWidth: 150 }}>
              <FormLabel>Action</FormLabel>
              <Select
                value={filters.action}
                onChange={(_, value) =>
                  handleFilterChange("action", value as string)
                }
              >
                <Option value="">All Actions</Option>
                <Option value="user_login">User Login</Option>
                <Option value="user_register">User Register</Option>
                <Option value="comment_create">Comment Create</Option>
                <Option value="station_create">Station Create</Option>
                <Option value="post_create">Post Create</Option>
                <Option value="achievement_unlock">Achievement Unlock</Option>
                <Option value="admin_user_ban">Admin User Ban</Option>
                <Option value="admin_user_role_update">
                  Admin Role Update
                </Option>
              </Select>
            </FormControl>

            <FormControl size="sm" sx={{ minWidth: 150 }}>
              <FormLabel>Target Type</FormLabel>
              <Select
                value={filters.target_type}
                onChange={(_, value) =>
                  handleFilterChange("target_type", value as string)
                }
              >
                <Option value="">All Types</Option>
                <Option value="user">User</Option>
                <Option value="station">Station</Option>
                <Option value="post">Post</Option>
                <Option value="comment">Comment</Option>
                <Option value="system">System</Option>
              </Select>
            </FormControl>

            <FormControl size="sm" sx={{ minWidth: 150 }}>
              <FormLabel>From Date</FormLabel>
              <Input
                type="date"
                value={filters.date_from}
                onChange={(e) =>
                  handleFilterChange("date_from", e.target.value)
                }
              />
            </FormControl>

            <FormControl size="sm" sx={{ minWidth: 150 }}>
              <FormLabel>To Date</FormLabel>
              <Input
                type="date"
                value={filters.date_to}
                onChange={(e) => handleFilterChange("date_to", e.target.value)}
              />
            </FormControl>

            <Button
              variant="outlined"
              color="neutral"
              onClick={clearFilters}
              startDecorator={<ClearIcon />}
              size="sm"
              sx={{ alignSelf: "flex-end" }}
            >
              Clear
            </Button>
          </Stack>
        </Card>
      )}

      <Card>
        <Box
          sx={{
            mb: 2,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <Typography level="body-sm" color="neutral">
            Showing {logs.length} of {total} audit logs
          </Typography>
          {loading && <CircularProgress size="sm" />}
        </Box>

        <Box sx={{ overflow: "auto" }}>
          <Table stickyHeader>
            <thead>
              <tr>
                <th>Timestamp</th>
                <th>User</th>
                <th>Action</th>
                <th>Target</th>
                <th>Details</th>
                <th>IP Address</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <tr key={log.id}>
                  <td>{new Date(log.created_at).toLocaleString()}</td>
                  <td>
                    {log.username ||
                      (log.user_id
                        ? log.user_id.slice(0, 8) + "..."
                        : "System")}
                  </td>
                  <td>
                    <Chip
                      size="sm"
                      color={getActionColor(log.action)}
                      variant="soft"
                    >
                      {formatAction(log.action)}
                    </Chip>
                  </td>
                  <td>
                    {log.target_type &&
                      (log.target_type === "station" && log.target_id ? (
                        <Link
                          to={`/station/${log.target_id}`}
                          style={{ textDecoration: "none" }}
                        >
                          <Chip
                            size="sm"
                            variant="outlined"
                            sx={{ cursor: "pointer" }}
                          >
                            {log.target_type} ({log.target_id.slice(0, 8)}...)
                          </Chip>
                        </Link>
                      ) : log.target_type === "user" && log.target_id ? (
                        <Link
                          to={`/user/${log.target_id}`}
                          style={{ textDecoration: "none" }}
                        >
                          <Chip
                            size="sm"
                            variant="outlined"
                            sx={{ cursor: "pointer" }}
                          >
                            {log.target_type} ({log.target_id.slice(0, 8)}...)
                          </Chip>
                        </Link>
                      ) : (
                        <Chip size="sm" variant="outlined">
                          {log.target_type}
                          {log.target_id &&
                            ` (${log.target_id.slice(0, 8)}...)`}
                        </Chip>
                      ))}
                  </td>
                  <td style={{ maxWidth: 300 }}>
                    <Typography
                      level="body-sm"
                      sx={{
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {formatMetadata(log.metadata)}
                    </Typography>
                  </td>
                  <td>
                    {log.ip_address ? (
                      <a
                        href={`https://ip.mvl.sh/?ip=${log.ip_address}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ textDecoration: "none", color: "inherit" }}
                      >
                        <Typography
                          level="body-sm"
                          fontFamily="monospace"
                          sx={{
                            cursor: "pointer",
                            "&:hover": { color: "primary.main" },
                          }}
                        >
                          {log.ip_address}
                        </Typography>
                      </a>
                    ) : (
                      <Typography level="body-sm" fontFamily="monospace">
                        N/A
                      </Typography>
                    )}
                  </td>
                  <td>
                    <Button
                      size="sm"
                      variant="outlined"
                      onClick={() => handleViewDetails(log)}
                    >
                      Details
                    </Button>
                  </td>
                </tr>
              ))}
              {logs.length === 0 && !loading && (
                <tr>
                  <td
                    colSpan={7}
                    style={{ textAlign: "center", padding: "2rem" }}
                  >
                    <Typography color="neutral">No audit logs found</Typography>
                  </td>
                </tr>
              )}
            </tbody>
          </Table>
        </Box>

        {totalPages > 1 && (
          <Box
            sx={{ display: "flex", justifyContent: "center", mt: 3, gap: 1 }}
          >
            <Button
              disabled={page <= 1}
              onClick={() => setPage(page - 1)}
              size="sm"
            >
              Previous
            </Button>
            <Typography level="body-sm" sx={{ alignSelf: "center" }}>
              Page {page} of {totalPages}
            </Typography>
            <Button
              disabled={page >= totalPages}
              onClick={() => setPage(page + 1)}
              size="sm"
            >
              Next
            </Button>
          </Box>
        )}
      </Card>

      {/* Details Modal */}
      <Modal open={detailsOpen} onClose={() => setDetailsOpen(false)}>
        <ModalDialog sx={{ maxHeight: "80vh", overflow: "auto" }}>
          <ModalClose />
          <Typography level="h4">Audit Log Details</Typography>
          {selectedLog && (
            <Stack spacing={2}>
              <Box>
                <Typography level="body-sm" color="neutral">
                  ID
                </Typography>
                <Typography fontFamily="monospace">{selectedLog.id}</Typography>
              </Box>

              <Box>
                <Typography level="body-sm" color="neutral">
                  Timestamp
                </Typography>
                <Typography>
                  {new Date(selectedLog.created_at).toLocaleString()}
                </Typography>
              </Box>

              <Box>
                <Typography level="body-sm" color="neutral">
                  User
                </Typography>
                {selectedLog.user_id ? (
                  <Link
                    to={`/user/${selectedLog.user_id}`}
                    style={{ textDecoration: "none" }}
                  >
                    <Typography
                      sx={{ cursor: "pointer", color: "primary.main" }}
                    >
                      {selectedLog.username || selectedLog.user_id}
                    </Typography>
                  </Link>
                ) : (
                  <Typography>{selectedLog.username || "System"}</Typography>
                )}
              </Box>

              <Box>
                <Typography level="body-sm" color="neutral">
                  Action
                </Typography>
                <Chip color={getActionColor(selectedLog.action)} variant="soft">
                  {formatAction(selectedLog.action)}
                </Chip>
              </Box>

              <Box>
                <Typography level="body-sm" color="neutral">
                  Target
                </Typography>
                {selectedLog.target_type === "station" &&
                selectedLog.target_id ? (
                  <Link
                    to={`/station/${selectedLog.target_id}`}
                    style={{ textDecoration: "none" }}
                  >
                    <Typography
                      sx={{ cursor: "pointer", color: "primary.main" }}
                    >
                      {selectedLog.target_type} ({selectedLog.target_id})
                    </Typography>
                  </Link>
                ) : selectedLog.target_type === "user" &&
                  selectedLog.target_id ? (
                  <Link
                    to={`/user/${selectedLog.target_id}`}
                    style={{ textDecoration: "none" }}
                  >
                    <Typography
                      sx={{ cursor: "pointer", color: "primary.main" }}
                    >
                      {selectedLog.target_type} ({selectedLog.target_id})
                    </Typography>
                  </Link>
                ) : (
                  <Typography>
                    {selectedLog.target_type}
                    {selectedLog.target_id && ` (${selectedLog.target_id})`}
                  </Typography>
                )}
              </Box>

              {selectedLog.metadata &&
                Object.keys(selectedLog.metadata).length > 0 && (
                  <Box>
                    <Typography level="body-sm" color="neutral">
                      Metadata
                    </Typography>
                    <Box
                      component="pre"
                      sx={{
                        backgroundColor: "background.level1",
                        p: 2,
                        borderRadius: 1,
                        fontSize: "0.875rem",
                        overflow: "auto",
                        maxHeight: 200,
                      }}
                    >
                      {JSON.stringify(selectedLog.metadata, null, 2)}
                    </Box>
                  </Box>
                )}

              <Box>
                <Typography level="body-sm" color="neutral">
                  IP Address
                </Typography>
                <Typography fontFamily="monospace">
                  {selectedLog.ip_address || "N/A"}
                </Typography>
              </Box>

              {selectedLog.ip_address && (
                <Box>
                  <Typography level="body-sm" color="neutral">
                    IP Information
                  </Typography>
                  {ipInfoLoading && (
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                      <CircularProgress size="sm" />
                      <Typography level="body-sm">
                        Loading IP information...
                      </Typography>
                    </Box>
                  )}
                  {ipInfoError && (
                    <Alert color="warning" variant="soft" size="sm">
                      {ipInfoError}
                    </Alert>
                  )}
                  {ipInfo && (
                    <Box
                      component="pre"
                      sx={{
                        backgroundColor: "background.level1",
                        p: 2,
                        borderRadius: 1,
                        fontSize: "0.75rem",
                        overflow: "auto",
                        maxHeight: 300,
                        whiteSpace: "pre-wrap",
                        wordBreak: "break-word",
                      }}
                    >
                      {JSON.stringify(ipInfo, null, 2)}
                    </Box>
                  )}
                </Box>
              )}

              {selectedLog.user_agent && (
                <Box>
                  <Typography level="body-sm" color="neutral">
                    User Agent
                  </Typography>
                  <Typography
                    sx={{ wordBreak: "break-all", fontSize: "0.75rem" }}
                  >
                    {selectedLog.user_agent}
                  </Typography>
                </Box>
              )}
            </Stack>
          )}
        </ModalDialog>
      </Modal>
    </Box>
  );
};

export default AdminAuditLogs;
