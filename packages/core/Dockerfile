# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./
RUN npm install --legacy-peer-deps

# Copy source code
COPY . .

# Build the application with Vite
RUN npm run build

# Production stage
FROM node:20-alpine

WORKDIR /app

# Install serve for production
RUN npm install -g serve

# Copy built files from builder
COPY --from=builder /app/dist ./dist

# Expose port
EXPOSE 3003

# Serve the built application
CMD ["serve", "-s", "dist", "-l", "3003"]