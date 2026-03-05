const { cfg } = require("./config");

function graphUrl(path) {
  return `https://graph.facebook.com/${cfg.graphVersion}${path}`;
}

async function sendText(to, text) {
  const url = graphUrl(`/${cfg.phoneNumberId}/messages`);
  const body = {
    messaging_product: "whatsapp",
    to,
    type: "text",
    text: { body: text }
  };

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${cfg.whatsappToken}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(body)
  });

  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(`sendText failed: ${res.status}`);
    err.details = json;
    throw err;
  }
  return json;
}

async function getMediaUrl(mediaId) {
  const url = graphUrl(`/${mediaId}`);
  const res = await fetch(url, {
    headers: { "Authorization": `Bearer ${cfg.whatsappToken}` }
  });
  const json = await res.json();
  if (!res.ok) {
    const err = new Error(`getMediaUrl failed: ${res.status}`);
    err.details = json;
    throw err;
  }
  return json.url;
}

async function downloadMediaToBuffer(mediaUrl) {
  const res = await fetch(mediaUrl, {
    headers: { "Authorization": `Bearer ${cfg.whatsappToken}` }
  });
  if (!res.ok) throw new Error(`download media failed: ${res.status}`);
  const arr = await res.arrayBuffer();
  return Buffer.from(arr);
}

module.exports = { sendText, getMediaUrl, downloadMediaToBuffer };
