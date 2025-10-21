import express from "express";
import qrcode from "qrcode";
import fetch from "node-fetch";
import makeWASocket, {
  useMultiFileAuthState,
  fetchLatestBaileysVersion
} from "@whiskeysockets/baileys";

const app = express();
app.use(express.json());

// ==== ENV ====
const PORT = process.env.PORT || 8080;
const EV_API_KEY = process.env.EV_API_KEY || "";            // Protects your endpoints
const N8N_WEBHOOK = process.env.N8N_WEBHOOK || "";           // Optional: forward inbound
const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET || "";     // Optional: n8n shared secret

// ==== Simple bearer auth middleware ====
function requireBearer(req, res, next) {
  if (!EV_API_KEY) return next(); // if not set, endpoints are open (dev only)
  const hdr = req.headers.authorization || "";
  const token = hdr.startsWith("Bearer ") ? hdr.slice(7) : "";
  if (token && token === EV_API_KEY) return next();
  return res.status(401).json({ error: "unauthorized" });
}

// ==== Instances registry ====
const instances = new Map(); // name -> { sock, getQR, ready }

// Helper: E.164 UK normalization → "<digits>@c.us"
function toJid(raw) {
  let p = String(raw || "").trim().replace(/[^\d+]/g, "");
  if (!p) throw new Error("empty phone");
  if (!p.startsWith("+") && /^0\d{10}$/.test(p)) p = "+44" + p.slice(1);
  p = p.replace(/^\+/, ""); // baileys wants digits only before '@c.us'
  return `${p}@c.us`;
}

async function ensure(name) {
  if (instances.has(name)) return instances.get(name);

  const { state, saveCreds } = await useMultiFileAuthState(`storage/${name}`);
  const { version } = await fetchLatestBaileysVersion();
  let lastQR = "";
  let ready = false;

  const sock = makeWASocket({
    auth: state,
    version,
    printQRInTerminal: false
  });

  sock.ev.on("creds.update", saveCreds);
  sock.ev.on("connection.update", (u) => {
    if (u.qr) {
      lastQR = u.qr;
      ready = false;
    }
    if (u.connection === "open") ready = true;
  });

  // Inbound forwarder → n8n (optional)
  sock.ev.on("messages.upsert", async (payload) => {
    if (!N8N_WEBHOOK) return;
    try {
      await fetch(N8N_WEBHOOK, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          ...(WEBHOOK_SECRET ? { "x-shared-secret": WEBHOOK_SECRET } : {})
        },
        body: JSON.stringify({ event: "messages.upsert", data: payload })
      });
    } catch (e) {
      console.error("Failed to forward to n8n:", e?.message || e);
    }
  });

  const inst = {
    sock,
    getQR: () => lastQR,
    isReady: () => ready
  };
  instances.set(name, inst);
  return inst;
}

// ========== Routes ==========
app.get("/health", (req, res) => {
  const status = {};
  for (const [k, v] of instances.entries()) {
    status[k] = { connected: v.isReady() };
  }
  res.json({ ok: true, instances: status });
});

app.post("/instances", requireBearer, async (req, res) => {
  const { instanceName } = req.body || {};
  if (!instanceName) return res.status(400).json({ error: "instanceName required" });
  await ensure(instanceName);
  res.json({ ok: true, instanceName });
});

app.get("/instances/:name/qr", requireBearer, async (req, res) => {
  const { name } = req.params;
  const inst = await ensure(name);
  const qr = inst.getQR();
  if (!qr) return res.status(409).json({ status: inst.isReady() ? "connected" : "no-qr" });
  const dataUrl = await qrcode.toDataURL(qr);
  const base64 = dataUrl.split(",")[1];
  res.json({ image: base64 });
});

app.post("/message/sendText/:name", requireBearer, async (req, res) => {
  const { name } = req.params;
  const { chatId, phone, text } = req.body || {};
  if (!text) return res.status(400).json({ error: "text required" });

  const inst = await ensure(name);
  const jid = chatId || toJid(phone);
  await inst.sock.sendMessage(jid, { text });
  res.json({ ok: true, to: jid });
});

// Start server
app.listen(PORT, () => console.log("WA server up on port", PORT));
