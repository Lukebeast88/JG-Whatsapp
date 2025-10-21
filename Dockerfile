FROM node:20-alpine

# Workdir
WORKDIR /app

# Install deps
COPY package.json ./
RUN npm i --omit=dev

# Copy app
COPY server.mjs ./server.mjs

# Health (optional small endpoint not needed here)
EXPOSE 8080

# Start
CMD ["npm","run","start"]
