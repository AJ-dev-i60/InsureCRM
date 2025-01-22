# Use Node.js LTS version as the base image
FROM node:20-slim

# Install curl and other required dependencies
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
    curl \
    python3 \
    build-essential && \
    rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Copy package files first
COPY package.json package-lock.json ./

# Clean install dependencies, including devDependencies for build
RUN npm ci

# Copy application code
COPY . .

# Remove devDependencies after build
RUN npm prune --production

# Create a non-root user and switch to it
RUN addgroup --system --gid 1001 nodejs \
    && adduser --system --uid 1001 --ingroup nodejs nodeuser \
    && chown -R nodeuser:nodejs /app

USER nodeuser

# Expose the port the app runs on
EXPOSE 3000

# Set environment variables
ENV NODE_ENV=production \
    PORT=3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:${PORT}/health || exit 1

# Start the application
CMD ["npm", "start"]
