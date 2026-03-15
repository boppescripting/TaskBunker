# ---- Build frontend ----
FROM node:20-alpine AS frontend-builder
WORKDIR /app
COPY package.json ./
RUN npm install
COPY . .
RUN npm run build

# ---- Build server ----
FROM node:20-alpine AS server-builder
WORKDIR /app/server
COPY server/package.json ./
RUN npm install
COPY server/ .
RUN npm run build

# ---- Runtime ----
FROM node:20-alpine
WORKDIR /app

# Server compiled output + deps
COPY --from=server-builder /app/server/dist ./dist
COPY --from=server-builder /app/server/node_modules ./node_modules

# Frontend static files — served from /app/frontend (__dirname/../frontend)
COPY --from=frontend-builder /app/dist ./frontend

ENV NODE_ENV=production
EXPOSE 3001

CMD ["node", "/app/dist/index.js"]
