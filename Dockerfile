FROM node:20-alpine
WORKDIR /app

# Git + build tools so the dependency can build its TS
RUN apk add --no-cache git openssh python3 make g++

# (Optional) npm stability knobs
ENV npm_config_audit=false
ENV npm_config_fund=false
ENV npm_config_loglevel=warn
ENV npm_config_fetch_retries=5
ENV npm_config_fetch_retry_maxtimeout=120000
ENV npm_config_fetch_retry_mintimeout=20000

# Install your app deps (includes evolution-api from GitHub)
COPY package.json ./
RUN npm i

# 🔧 Build the evolution-api package so that dist/ exists
RUN cd node_modules/evolution-api && npm i && npm run build && cd /app

# App code
COPY server.mjs ./server.mjs

EXPOSE 8080
CMD ["node","server.mjs"]
