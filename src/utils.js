const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

function ensureDir(p) {
  if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true });
}

function readJsonSafe(filePath, fallback) {
  try {
    if (!fs.existsSync(filePath)) return fallback;
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch {
    return fallback;
  }
}

function writeJsonAtomic(filePath, obj) {
  const dir = path.dirname(filePath);
  ensureDir(dir);
  const tmp = filePath + ".tmp";
  fs.writeFileSync(tmp, JSON.stringify(obj, null, 2), "utf8");
  fs.renameSync(tmp, filePath);
}

function nowIso() {
  return new Date().toISOString();
}

// Optional webhook signature check (X-Hub-Signature-256)
function verifyMetaSignature(appSecret, rawBody, signatureHeader) {
  if (!appSecret) return true; // disabled
  if (!signatureHeader || !signatureHeader.startsWith("sha256=")) return false;
  const sig = signatureHeader.slice("sha256=".length);
  const hmac = crypto.createHmac("sha256", appSecret).update(rawBody).digest("hex");
  try {
    return crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(hmac));
  } catch {
    return false;
  }
}

module.exports = { ensureDir, readJsonSafe, writeJsonAtomic, nowIso, verifyMetaSignature };
