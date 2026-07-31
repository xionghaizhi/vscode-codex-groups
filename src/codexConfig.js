const fs = require('fs');
const os = require('os');
const path = require('path');
const RESERVED_MODEL_PROVIDERS = ['amazon-bedrock', 'openai', 'ollama', 'lmstudio'];

function configuredCustomModelProviderId(options = {}) {
  const codexHome = options.codexHome || process.env.CODEX_HOME || path.join(os.homedir(), '.codex');
  const configPath = options.configPath || path.join(codexHome, 'config.toml');
  let text;
  try {
    text = fs.readFileSync(configPath, 'utf8');
  } catch (error) {
    return null;
  }
  let providerId;
  for (const line of text.split(/\r?\n/)) {
    if (/^\s*\[/.test(line)) return null;
    const match = line.match(/^\s*model_provider\s*=\s*["']([A-Za-z0-9_-]+)["']\s*(?:#.*)?$/);
    if (match && RESERVED_MODEL_PROVIDERS.includes(match[1])) return null;
    if (match) {
      providerId = match[1];
      break;
    }
  }
  if (!providerId) return null;
  const providerKey = `(?:${providerId}|"${providerId}"|'${providerId}')`;
  const providerTable = new RegExp(`^\\s*\\[\\s*model_providers\\s*\\.\\s*${providerKey}\\s*\\]\\s*(?:#.*)?$`, 'm');
  return providerTable.test(text) ? providerId : null;
}

module.exports = { configuredCustomModelProviderId };
