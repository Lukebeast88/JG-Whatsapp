FROM node:20-alpine
WORKDIR /app
RUN npm i -g evolution-api@latest
COPY server.mjs .
EXPOSE 8080
CMD ["node", "server.mjs"]
