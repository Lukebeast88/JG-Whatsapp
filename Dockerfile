FROM node:20-alpine
WORKDIR /app

# Install git so npm can pull from GitHub
RUN apk add --no-cache git

# Install deps
COPY package.json ./
RUN npm i --omit=dev

# Copy app
COPY server.mjs ./server.mjs

# Persisted creds will live on the mounted disk (/app/storage)
EXPOSE 8080
CMD ["npm","run","start"]
