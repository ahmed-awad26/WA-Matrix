const path = require("path");
const { cfg } = require("./config");
const { ensureDir, readJsonSafe, writeJsonAtomic, nowIso } = require("./utils");

ensureDir(cfg.dataDir);

const messagesFile = path.join(cfg.dataDir, "messages.json");
const listsFile = path.join(cfg.dataDir, "lists.json");

function loadMessages() {
  return readJsonSafe(messagesFile, { version: 1, items: [] });
}
function saveMessages(db) {
  writeJsonAtomic(messagesFile, db);
}
function addMessage(msg) {
  const db = loadMessages();
  db.items.push({ ...msg, stored_at: nowIso() });
  // keep last 2000
  if (db.items.length > 2000) db.items = db.items.slice(db.items.length - 2000);
  saveMessages(db);
}

function loadLists() {
  return readJsonSafe(listsFile, { version: 1, lists: {} });
}
function saveLists(db) {
  writeJsonAtomic(listsFile, db);
}
function addList(listName) {
  const db = loadLists();
  if (!db.lists[listName]) db.lists[listName] = [];
  saveLists(db);
}
function addToList(listName, phoneE164) {
  const db = loadLists();
  if (!db.lists[listName]) db.lists[listName] = [];
  if (!db.lists[listName].includes(phoneE164)) db.lists[listName].push(phoneE164);
  saveLists(db);
}

module.exports = {
  loadMessages, addMessage,
  loadLists, addList, addToList
};
