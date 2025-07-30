FROM node:18-alpine

# Set working directory
WORKDIR /app

# Copy package files
COPY package.json pnpm-lock.yaml ./

# Install pnpm and dependencies
RUN npm install -g pnpm@10.13.1
RUN pnpm install --frozen-lockfile

# Copy source code
COPY src/ ./src/
COPY tsconfig.json ./

# Build the application
RUN pnpm run build

# Create workspace directory with proper permissions
RUN mkdir -p /app/workspace && chown -R node:node /app/workspace

# Switch to non-root user
USER node

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "const http = require('http'); \
    const options = { hostname: 'localhost', port: 3000, path: '/health', timeout: 2000 }; \
    const req = http.request(options, (res) => { \
      process.exit(res.statusCode === 200 ? 0 : 1); \
    }); \
    req.on('error', () => process.exit(1)); \
    req.on('timeout', () => process.exit(1)); \
    req.end();"

# Start the application
CMD ["pnpm", "start"] 