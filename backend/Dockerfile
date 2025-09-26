FROM golang:1.25-alpine

# Enable CGO for SQLite support
ENV CGO_ENABLED=1

# Install git and build dependencies for CGO
RUN apk add --no-cache git gcc musl-dev sqlite

# Install air for live reloading
RUN go install github.com/air-verse/air@latest

# Set working directory
WORKDIR /app

# Copy go mod files
COPY go.mod go.sum ./

# Download dependencies
RUN go mod download

# Expose port
EXPOSE 4001

# Command to run air for live reloading
CMD ["air", "-c", ".air.toml"]
