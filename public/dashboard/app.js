async function jget(url) {
  const r = await fetch(url);
  return r.json();
}
async function jput(url, body) {
  const r = await fetch(url, { method:"PUT", headers:{ "Content-Type":"application/json" }, body: JSON.stringify(body) });
  return r.json();
}
async function jpost(url, body) {
  const r = await fetch(url, { method:"POST", headers:{ "Content-Type":"application/json" }, body: JSON.stringify(body) });
  return r.json();
}

const statusEl = document.getElementById("status");
const messagesEl = document.getElementById("messages");
const refreshBtn = document.getElementById("refreshBtn");

const toEl = document.getElementById("to");
const textEl = document.getElementById("text");
const sendBtn = document.getElementById("sendBtn");
const sendOut = document.getElementById("sendOut");

const rulesBox = document.getElementById("rulesBox");
const loadRules = document.getElementById("loadRules");
const saveRules = document.getElementById("saveRules");
const rulesOut = document.getElementById("rulesOut");

async function loadStatus() {
  const s = await jget("/api/status");
  statusEl.textContent = `OK | Graph=${s.graphVersion} | MediaDL=${s.autoDownloadMedia}`;
}

async function loadMessages() {
  const r = await jget("/api/messages?limit=80");
  messagesEl.innerHTML = r.items.map(x => {
    const txt = x.raw?.text?.body || "";
    return `<div class="msg">
      <div><b>${x.name || "Unknown"}</b> <span class="small">${x.from}</span></div>
      <div class="small">${x.type} | ${x.stored_at}</div>
      <div>${escapeHtml(txt)}</div>
    </div>`;
  }).join("");
}

function escapeHtml(s) {
  return (s || "").replace(/[&<>"']/g, c => ({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;" }[c]));
}

refreshBtn.onclick = loadMessages;

sendBtn.onclick = async () => {
  sendOut.textContent = "Sending...";
  const out = await jpost("/api/send", { to: toEl.value.trim(), text: textEl.value });
  sendOut.textContent = JSON.stringify(out, null, 2);
};

loadRules.onclick = async () => {
  const r = await jget("/api/rules");
  rulesBox.value = JSON.stringify(r, null, 2);
};

saveRules.onclick = async () => {
  rulesOut.textContent = "Saving...";
  try {
    const obj = JSON.parse(rulesBox.value);
    const out = await jput("/api/rules", obj);
    rulesOut.textContent = JSON.stringify(out, null, 2);
  } catch (e) {
    rulesOut.textContent = "JSON Error: " + e.message;
  }
};

(async function boot(){
  await loadStatus();
  await loadMessages();
})();
