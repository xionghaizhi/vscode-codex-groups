const fs = require('fs');
const path = require('path');

const DEFAULT_METADATA_PATH = '/root/.codex/codex-vscode-conversation-meta.json';
const DEFAULT_OLD_TITLES_PATH = '/root/.codex/codex-vscode-conversation-titles.json';
const DEFAULT_SESSION_INDEX_PATH = '/root/.codex/session_index.jsonl';

class ConversationMetadataStore {
  constructor(options = {}) {
    this.metadataPath = options.metadataPath || DEFAULT_METADATA_PATH;
    this.oldTitlesPath = options.oldTitlesPath || DEFAULT_OLD_TITLES_PATH;
    this.sessionIndexPath = options.sessionIndexPath
      || (options.metadataPath ? path.join(path.dirname(this.metadataPath), 'session_index.jsonl') : DEFAULT_SESSION_INDEX_PATH);
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
    changed = this.migrateSessionIndexTitles(normalized) || changed;
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

  migrateSessionIndexTitles(metadata) {
    metadata.migrations = metadata.migrations || {};
    if (metadata.migrations.sessionIndexTitlesImported) {
      return false;
    }
    const titles = this.readSessionIndexTitles();
    let changed = false;
    for (const [id, current] of Object.entries(metadata.conversations)) {
      const title = cleanString(titles[id]);
      if (!current.title && title) {
        metadata.conversations[id] = { ...current, title };
        changed = true;
      }
    }
    if (Object.keys(titles).length === 0 && !changed) {
      return false;
    }
    metadata.migrations.sessionIndexTitlesImported = true;
    return true;
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

  readSessionIndexTitles() {
    if (!fs.existsSync(this.sessionIndexPath)) {
      return {};
    }
    const titles = {};
    for (const line of fs.readFileSync(this.sessionIndexPath, 'utf8').split(/\r?\n/)) {
      if (!line.trim()) {
        continue;
      }
      try {
        const item = JSON.parse(line);
        const id = cleanString(item.id);
        const title = cleanString(item.thread_name);
        if (id && title) {
          titles[id] = title;
        }
      } catch (error) {
        // session_index.jsonl 可包含半写入行，忽略坏行保留已有元数据。
      }
    }
    return titles;
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
    if (data.migrations.sessionIndexTitlesImported === true) {
      metadata.migrations.sessionIndexTitlesImported = true;
    }
  }
  normalizeArchivedGroups(metadata, data.archivedGroups, file);
  normalizeConversations(metadata, data.conversations, file);
  normalizePendingGroup(metadata, data.pendingGroup, file);
  return metadata;
}

function normalizeArchivedGroups(metadata, archivedGroups, file) {
  if (archivedGroups == null) {
    return;
  }
  if (typeof archivedGroups !== 'object' || Array.isArray(archivedGroups)) {
    throw new Error(`metadata.archivedGroups 必须是对象：${file}`);
  }
  const next = {};
  for (const value of Object.values(archivedGroups)) {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      continue;
    }
    const projectRoot = cleanString(value.projectRoot).replace(/\\/g, '/').replace(/\/+$/, '');
    const group = cleanString(value.group);
    if (!projectRoot || !group) {
      continue;
    }
    const item = { projectRoot, group };
    if (Number.isFinite(value.archivedAtMs)) {
      item.archivedAtMs = value.archivedAtMs;
    }
    next[JSON.stringify([projectRoot, group])] = item;
  }
  if (Object.keys(next).length) {
    metadata.archivedGroups = next;
  }
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
  DEFAULT_SESSION_INDEX_PATH,
  normalizeMetadata,
};
