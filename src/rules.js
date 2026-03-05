const fs = require("fs");
const path = require("path");

const rulesPath = path.join(process.cwd(), "rules", "rules.json");

function loadRules() {
  const raw = fs.readFileSync(rulesPath, "utf8");
  return JSON.parse(raw);
}

function matchRule(rule, text) {
  if (!text) return false;
  const m = rule.match || {};
  if (m.type === "contains") return text.toLowerCase().includes((m.text || "").toLowerCase());
  if (m.type === "equals") return text.trim().toLowerCase() === (m.text || "").trim().toLowerCase();
  if (m.type === "regex") return new RegExp(m.text, "i").test(text);
  return false;
}

function findReply(text) {
  const cfg = loadRules();
  for (const r of cfg.rules || []) {
    if (matchRule(r, text)) return r.reply;
  }
  return null;
}

function getRulesRaw() {
  return loadRules();
}

function setRulesRaw(obj) {
  fs.writeFileSync(rulesPath, JSON.stringify(obj, null, 2), "utf8");
}

module.exports = { findReply, getRulesRaw, setRulesRaw };
