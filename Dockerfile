# Multi-stage Dockerfile: build client then build server image

# --- Build client ---
FROM node:20-alpine AS client-build
WORKDIR /app
COPY client/package.json client/package-lock.json* ./client/
COPY client/ ./client/
WORKDIR /app/client
RUN npm ci
RUN npm run build

# --- Build server ---
FROM node:20-alpine AS server-build
WORKDIR /app
COPY server/package.json server/package-lock.json* ./server/
COPY server/ ./server/
WORKDIR /app/server
RUN npm ci --only=production

# Copy built client into server public
COPY --from=client-build /app/client/dist /app/server/public

ENV NODE_ENV=production
WORKDIR /app/server
EXPOSE 5000
CMD ["node", "src/index.js"]
