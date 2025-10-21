import { start } from "evolution-api";

await start({
  server: {
    port: process.env.PORT || 8080,
    baseUrl: process.env.PUBLIC_BASE_URL,
    secretKey: process.env.EV_API_KEY,
  },
  database: { type: "json", path: "./storage" },
  webhook: {
    enabled: true,
    url: process.env.N8N_WEBHOOK || "",
    events: ["messages.upsert", "qrcode.updated", "connection.update"],
    secret: process.env.WEBHOOK_SECRET || "",
  },
  throttle: { messagesPerMinute: 12, burst: 6 },
});
