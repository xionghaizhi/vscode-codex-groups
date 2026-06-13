const fs = require('fs');
const path = require('path');

const DEFAULT_METADATA_PATH = '/root/.codex/codex-vscode-conversation-meta.json';
const DEFAULT_OLD_TITLES_PATH = '/root/.codex/codex-vscode-conversation-titles.json';

class ConversationMetadataStore {
  constructor(options = {}) {
    this.metadataPath = options.metadataPath || DEFAULT_METADATA_PATH;
    this.oldTitlesPath = options.oldTitlesPath || DEFAULT_OLD_TITLES_PATH;
  }

  load() {
    let metadata = this.readMetadataFile();
    let changed = false;
    if (!metadata) {
      metadata = { version: 1, conversations: {} };
      changed = true;
    }
    const normalized = normalizeMetadata(metadata, this.metadataPath);
    changed = this.migrateOldTitles(normalized) || changed;
    if (changed) {
      return this.write(normalized);
    }
    return normalized;
  }

  resetPendingGroup() {
    const metadata = this.load();
    if (metadata.pendingGroup) {
      delete metadata.pendingGroup;
      this.write(metadata);
    }
    return metadata;
  }

  write(metadata) {
    const normalized = normalizeMetadata(metadata, this.metadataPath);
    normalized.updatedAtMs = Date.now();
    fs.mkdirSync(path.dirname(this.metadataPath), { recursive: true });
    writeJsonAtomic(this.metadataPath, normalized);
    return normalized;
  }

  readMetadataFile() {
    if (!fs.existsSync(this.metadataPath)) {
      return null;
    }
    try {
      return JSON.parse(fs.readFileSync(this.metadataPath, 'utf8'));
    } catch (error) {
      throw new Error(`metadata JSON 解析失败：${this.metadataPath} ${error.message}`);
    }
  }

  migrateOldTitles(metadata) {
    metadata.migrations = metadata.migrations || {};
    if (metadata.migrations.oldTitlesImported) {
      return false;
    }
    const titles = this.readOldTitles();
    let changed = false;
    for (const [id, title] of Object.entries(titles)) {
      const cleanTitle = cleanString(title);
      if (!cleanTitle) {
        continue;
      }
      const current = metadata.conversations[String(id)] || {};
      if (!current.title) {
        metadata.conversations[String(id)] = { ...current, title: cleanTitle };
        changed = true;
      }
    }
    metadata.migrations.oldTitlesImported = true;
    changed = true;
    return changed;
  }

  readOldTitles() {
    if (!fs.existsSync(this.oldTitlesPath)) {
      return {};
    }
    try {
      const data = JSON.parse(fs.readFileSync(this.oldTitlesPath, 'utf8'));
      return data && typeof data === 'object' && !Array.isArray(data) ? data : {};
    } catch (error) {
      return {};
    }
  }
}

function normalizeMetadata(data, file) {
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    throw new Error(`metadata JSON 必须是对象：${file}`);
  }
  const metadata = { version: 1, conversations: {} };
  if (Number.isFinite(data.updatedAtMs)) {
    metadata.updatedAtMs = data.updatedAtMs;
  }
  if (data.migrations && typeof data.migrations === 'object' && !Array.isArray(data.migrations)) {
    metadata.migrations = {};
    if (data.migrations.oldTitlesImported === true) {
      metadata.migrations.oldTitlesImported = true;
    }
  }
  normalizeConversations(metadata, data.conversations, file);
  normalizePendingGroup(metadata, data.pendingGroup, file);
  return metadata;
}

function normalizeConversations(metadata, conversations, file) {
  if (conversations == null) {
    return;
  }
  if (typeof conversations !== 'object' || Array.isArray(conversations)) {
    throw new Error(`metadata.conversations 必须是对象：${file}`);
  }
  for (const [id, value] of Object.entries(conversations)) {
    metadata.conversations[String(id)] = normalizeConversation(value, file);
  }
}

function normalizeConversation(value, file) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error(`conversation metadata 必须是对象：${file}`);
  }
  const next = {};
  setCleanField(next, 'title', value.title);
  setCleanField(next, 'group', value.group);
  setCleanField(next, 'projectRoot', value.projectRoot);
  if (Number.isFinite(value.updatedAtMs)) {
    next.updatedAtMs = value.updatedAtMs;
  }
  return next;
}

function normalizePendingGroup(metadata, pendingGroup, file) {
  if (pendingGroup == null) {
    return;
  }
  if (typeof pendingGroup !== 'object' || Array.isArray(pendingGroup)) {
    throw new Error(`metadata.pendingGroup 必须是对象：${file}`);
  }
  const group = cleanString(pendingGroup.group);
  const projectRoot = cleanString(pendingGroup.projectRoot);
  if (group && projectRoot) {
    metadata.pendingGroup = { projectRoot, group };
    if (Number.isFinite(pendingGroup.startedAtMs)) {
      metadata.pendingGroup.startedAtMs = pendingGroup.startedAtMs;
    }
  }
}

function setCleanField(target, key, value) {
  const clean = cleanString(value);
  if (clean) {
    target[key] = clean;
  }
}

function cleanString(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function writeJsonAtomic(file, data) {
  const tmp = `${file}.${process.pid}.${Date.now()}.tmp`;
  fs.writeFileSync(tmp, `${JSON.stringify(data, null, 2)}\n`);
  const fd = fs.openSync(tmp, 'r');
  try {
    fs.fsyncSync(fd);
  } finally {
    fs.closeSync(fd);
  }
  fs.renameSync(tmp, file);
}

module.exports = {
  ConversationMetadataStore,
  DEFAULT_METADATA_PATH,
  DEFAULT_OLD_TITLES_PATH,
  normalizeMetadata,
};
