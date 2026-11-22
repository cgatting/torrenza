FROM node:22-bookworm-slim AS frontend-build
WORKDIR /app/frontend
ENV VITE_HOSTED=true
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

FROM node:22-bookworm-slim
ENV NODE_ENV=production PORT=5000 TORRENZA_DATA_DIR=/var/data TORRENZA_DOWNLOAD_DIR=/var/data/downloads TORRENZA_PYTHON=python3
RUN apt-get update && apt-get install -y --no-install-recommends python3 python3-libtorrent ca-certificates && rm -rf /var/lib/apt/lists/*
WORKDIR /app/backend
COPY backend/package*.json ./
RUN npm ci --omit=dev
COPY backend/ ./
COPY --from=frontend-build /app/frontend/dist ./dist
RUN mkdir -p /var/data/downloads
EXPOSE 5000
CMD ["node", "server.js"]
