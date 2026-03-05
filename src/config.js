require("dotenv").config();

function must(name) {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env: ${name}`);
  return v;
}

const cfg = {
  graphVersion: process.env.GRAPH_VERSION || "v19.0",
  whatsappToken: must("WHATSAPP_TOKEN"),
  phoneNumberId: must("PHONE_NUMBER_ID"),
  verifyToken: must("VERIFY_TOKEN"),
  appSecret: process.env.APP_SECRET || "",
  dashUser: process.env.DASH_USER || "matrix",
  dashPass: process.env.DASH_PASS || "matrix",
  dataDir: process.env.DATA_DIR || "./data",
  downloadsDir: process.env.DOWNLOADS_DIR || "./downloads",
  autoDownloadMedia: (process.env.AUTO_DOWNLOAD_MEDIA || "true").toLowerCase() === "true",
  aiMode: (process.env.AI_MODE || "off").toLowerCase(),
  aiApiKey: process.env.AI_API_KEY || ""
};

module.exports = { cfg };
