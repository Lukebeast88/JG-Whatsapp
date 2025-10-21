import express from "express";
import qrcode from "qrcode";
import makeWASocket, { useMultiFileAuthState, fetchLatestBaileysVersion } from "@whiskeysockets/baileys";

const app = express(); app.use(express.json());
const instances = new Map(); // name -> { sock, qr, state }

async function ensure(name) {
  if (instances.has(name)) return instances.get(name);
  const { state, saveCreds } = await useMultiFileAuthState(`storage/${name}`);
  const { version } = await fetchLatestBaileysVersion();
  const sock = makeWASocket({ auth: state, version, printQRInTerminal: false });

  let lastQR = "";
  sock.ev.on("creds.update", saveCreds);
  sock.ev.on("connection.update", u => { if (u.qr) lastQR = u.qr; });
  const inst = { sock, qr: () => lastQR };
  instances.set(name, inst);
  return inst;
}

app.post("/instances", async (req,res)=>{ const { instanceName }=req.body; await ensure(instanceName); res.json({ok:true,instanceName}); });
app.get("/instances/:name/qr", async (req,res)=>{
  const { name } = req.params; const inst = await ensure(name);
  const qr = inst.qr(); if (!qr) return res.status(409).json({status:"no-qr"});
  const image = await qrcode.toDataURL(qr); res.json({ image: image.split(",")[1] });
});
app.post("/message/sendText/:name", async (req,res)=>{
  const { name } = req.params; const { chatId, text } = req.body;
  const { sock } = await ensure(name); await sock.sendMessage(chatId, { text });
  res.json({ ok:true });
});

const port = process.env.PORT || 8080; app.listen(port, ()=> console.log("up on", port));
