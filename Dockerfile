FROM node:20-alpine
WORKDIR /app

# Needed for installing from npm and QR generation libs
RUN apk add --no-cache git

# Install deps
COPY package.json ./
RUN npm ci || npm i

# App
COPY server.mjs ./

# Persisted auth will live in /app/storage (mount a disk here in Render)
EXPOSE 8080
CMD ["node","server.mjs"]
