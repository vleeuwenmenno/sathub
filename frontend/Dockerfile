FROM ubuntu:22.04

# Install Node.js
RUN apt-get update && apt-get install -y curl && \
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash - && \
    apt-get install -y nodejs && \
    apt-get clean && rm -rf /var/lib/apt/lists/*

# Create user with UID 1000
RUN useradd -m -u 1000 hostuser

# Set working directory
WORKDIR /app

# Expose Vite dev server port
EXPOSE 5173

# Start development server (install deps if needed)
CMD ["sh", "-c", "chown -R hostuser:hostuser /app && su hostuser -c 'npm install && npm run dev'"]
