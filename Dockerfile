FROM node:20-alpine
WORKDIR /app
RUN apk add --no-cache git
COPY package.json ./
RUN npm ci || npm i
COPY server.mjs ./
EXPOSE 8080
CMD ["node","server.mjs"]
