const { cfg } = require("./config");

async function aiReply(userText) {
  // AI_MODE=off: no reply
  if (cfg.aiMode === "off") return null;

  // AI_MODE=echo: demo only
  if (cfg.aiMode === "echo") {
    return `AI (demo): ${userText}`;
  }

  // External integration intentionally left blank.
  return null;
}

module.exports = { aiReply };
