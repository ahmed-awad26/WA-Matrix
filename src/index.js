const express = require("express");
const path = require("path");
const fs = require("fs");

const { cfg } = require("./config");
const { ensureDir, verifyMetaSignature } = require("./utils");
const { addMessage, loadMessages, loadLists, addList, addToList } = require("./storage");
const { findReply, getRulesRaw, setRulesRaw } = require("./rules");
const { sendText, getMediaUrl, downloadMediaToBuffer } = require("./whatsapp");
const { aiReply } = require("./ai");

const app = express();

// Capture raw body for signature verification (optional)
app.use((req, res, next) => {
  let data = [];
  req.on("data", chunk => data.push(chunk));
  req.on("end", () => {
    req.rawBody = Buffer.concat(data);
    next();
  });
});

// Parse JSON after capturing rawBody
app.use((req, res, next) => {
  if (req.rawBody && req.rawBody.length) {
    try { req.body = JSON.parse(req.rawBody.toString("utf8")); }
    catch { req.body = {}; }
  } else {
    req.body = {};
  }
  next();
});

ensureDir(cfg.downloadsDir);

function basicAuth(req, res, next) {
  const h = req.headers.authorization || "";
  if (!h.startsWith("Basic ")) return res.status(401).set("WWW-Authenticate", "Basic").end();
  const decoded = Buffer.from(h.slice(6), "base64").toString("utf8");
  const [u, p] = decoded.split(":");
  if (u === cfg.dashUser && p === cfg.dashPass) return next();
  return res.status(401).set("WWW-Authenticate", "Basic").end();
}

// Dashboard static
app.use("/dashboard", basicAuth, express.static(path.join(process.cwd(), "public", "dashboard")));

// Dashboard API
app.get("/api/status", basicAuth, (req, res) => {
  res.json({ ok: true, name: "WA-Matrix", graphVersion: cfg.graphVersion, autoDownloadMedia: cfg.autoDownloadMedia });
});

app.get("/api/messages", basicAuth, (req, res) => {
  const db = loadMessages();
  const limit = Math.min(parseInt(req.query.limit || "200", 10), 500);
  res.json({ items: db.items.slice(-limit).reverse() });
});

app.get("/api/lists", basicAuth, (req, res) => {
  res.json(loadLists());
});

app.get("/api/rules", basicAuth, (req, res) => {
  res.json(getRulesRaw());
});

app.put("/api/rules", basicAuth, (req, res) => {
  setRulesRaw(req.body);
  res.json({ ok: true });
});

app.post("/api/send", basicAuth, async (req, res) => {
  try {
    const { to, text } = req.body || {};
    if (!to || !text) return res.status(400).json({ ok: false, error: "to/text required" });
    const out = await sendText(to, text);
    res.json({ ok: true, out });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message, details: e.details || null });
  }
});

// Webhook verify (GET)
app.get("/webhook", (req, res) => {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];
  if (mode === "subscribe" && token === cfg.verifyToken) return res.status(200).send(challenge);
  return res.sendStatus(403);
});

// Webhook receive (POST)
app.post("/webhook", async (req, res) => {
  try {
    // Optional signature verification
    const sig = req.headers["x-hub-signature-256"];
    if (!verifyMetaSignature(cfg.appSecret, req.rawBody || Buffer.from(""), sig)) {
      return res.sendStatus(403);
    }

    const body = req.body || {};
    const entry = (body.entry || [])[0];
    const change = entry?.changes?.[0]?.value;

    const messages = change?.messages || [];
    const contacts = change?.contacts || [];

    const name = contacts?.[0]?.profile?.name || "";
    for (const m of messages) {
      const from = m.from;
      const msgId = m.id;
      const type = m.type;

      // Store in logs
      addMessage({ from, name, msgId, type, raw: m });

      // Text
      if (type === "text") {
        const text = m.text?.body || "";

        // Commands
        if (text.startsWith("!stats")) {
          const db = loadMessages();
          await sendText(from, `Stats: stored=${db.items.length}`);
          continue;
        }
        if (text.startsWith("!lists")) {
          const lists = loadLists();
          const names = Object.keys(lists.lists || {});
          await sendText(from, names.length ? `Lists: ${names.join(", ")}` : "No lists yet.");
          continue;
        }
        if (text.startsWith("!addlist")) {
          const listName = text.replace("!addlist", "").trim();
          if (!listName) { await sendText(from, "Usage: !addlist اسم"); continue; }
          addList(listName);
          await sendText(from, `List created: ${listName}`);
          continue;
        }
        if (text.startsWith("!add")) {
          // !add listName +201...
          const parts = text.split(/\s+/).filter(Boolean);
          if (parts.length < 3) { await sendText(from, "Usage: !add اسم +201xxxxxxxxx"); continue; }
          const listName = parts[1];
          const phone = parts[2];
          addToList(listName, phone);
          await sendText(from, `Added ${phone} to ${listName}`);
          continue;
        }
        if (text.startsWith("!ai")) {
          const q = text.replace("!ai", "").trim();
          if (!q) { await sendText(from, "اكتب السؤال بعد !ai"); continue; }
          const r = await aiReply(q);
          await sendText(from, r || "AI غير مُفعّل حالياً.");
          continue;
        }

        // Rules auto-reply
        const reply = findReply(text);
        if (reply?.type === "text" && reply.text) {
          await sendText(from, reply.text);
        }
      }

      // Media download
      const mediaTypes = new Set(["image", "video", "audio", "document", "sticker"]);
      if (mediaTypes.has(type) && cfg.autoDownloadMedia) {
        const mediaId = m[type]?.id;
        const mime = m[type]?.mime_type || "";
        if (mediaId) {
          try {
            const url = await getMediaUrl(mediaId);
            const buf = await downloadMediaToBuffer(url);

            const ext =
              mime.includes("jpeg") ? "jpg" :
              mime.includes("png") ? "png" :
              mime.includes("mp4") ? "mp4" :
              mime.includes("pdf") ? "pdf" : "bin";

            const fileName = `${Date.now()}_${from}_${mediaId}.${ext}`;
            const outPath = path.join(cfg.downloadsDir, fileName);
            fs.writeFileSync(outPath, buf);

            await sendText(from, `تم حفظ الملف ✅\n${fileName}`);
          } catch (e) {
            await sendText(from, `فشل تنزيل الميديا: ${e.message}`);
          }
        }
      }
    }

    return res.sendStatus(200);
  } catch (e) {
    // Never break webhook
    return res.sendStatus(200);
  }
});

app.get("/", (req, res) => res.send("WA-Matrix is running ✅"));

const port = 3000;
app.listen(port, () => {
  console.log(`WA-Matrix listening on http://127.0.0.1:${port}`);
  console.log(`Dashboard: http://127.0.0.1:${port}/dashboard`);
});
