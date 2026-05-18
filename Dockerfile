# Build stage
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# Serve stage
FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
# Use nginx template so env vars are substituted at container startup.
# Defaults work for Docker Compose; override on Railway with correct URLs.
ENV PORT=80
ENV BACKEND_URL=http://backend:8080
ENV ICECAST_URL=http://icecast:8000
COPY nginx.conf /etc/nginx/templates/default.conf.template
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
