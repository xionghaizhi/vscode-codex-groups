const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { tempDir, writeJson, readJson } = require('./test-utils');
const { ConversationMetadataStore } = require('../src/metadataStore');

module.exports = {
  name: 'metadata store',
  tests: [
    {
      name: 'creates metadata when file is missing',
      run() {
        const dir = tempDir('codex-meta-missing');
        const store = new ConversationMetadataStore({
          metadataPath: path.join(dir, 'meta.json'),
          oldTitlesPath: path.join(dir, 'titles.json'),
        });
        const metadata = store.load();
        assert.strictEqual(metadata.version, 1);
        assert.deepStrictEqual(metadata.conversations, {});
        assert.deepStrictEqual(metadata.migrations, { oldTitlesImported: true });
        assert.ok(Number.isFinite(metadata.updatedAtMs));
        assert.deepStrictEqual(readJson(path.join(dir, 'meta.json')), metadata);
      },
    },
    {
      name: 'migrates old title aliases without losing existing metadata',
      run() {
        const dir = tempDir('codex-meta-migrate');
        writeJson(path.join(dir, 'meta.json'), {
          version: 1,
          conversations: {
            a: { title: 'keep', group: 'g1', projectRoot: '/project' },
          },
        });
        writeJson(path.join(dir, 'titles.json'), { a: 'old', b: 'new title', c: '' });
        const store = new ConversationMetadataStore({
          metadataPath: path.join(dir, 'meta.json'),
          oldTitlesPath: path.join(dir, 'titles.json'),
        });
        const metadata = store.load();
        assert.deepStrictEqual(metadata.conversations, {
          a: { title: 'keep', group: 'g1', projectRoot: '/project' },
          b: { title: 'new title' },
        });
        assert.deepStrictEqual(metadata.migrations, { oldTitlesImported: true });
        assert.ok(Number.isFinite(metadata.updatedAtMs));
      },
    },
    {
      name: 'creates metadata and migrates old titles when metadata is missing',
      run() {
        const dir = tempDir('codex-meta-missing-migrate');
        writeJson(path.join(dir, 'titles.json'), { a: ' old title ', b: '' });
        const store = new ConversationMetadataStore({
          metadataPath: path.join(dir, 'meta.json'),
          oldTitlesPath: path.join(dir, 'titles.json'),
        });
        const metadata = store.load();
        assert.deepStrictEqual(metadata.conversations, { a: { title: 'old title' } });
        assert.deepStrictEqual(metadata.migrations, { oldTitlesImported: true });
        assert.ok(Number.isFinite(metadata.updatedAtMs));
        assert.deepStrictEqual(readJson(path.join(dir, 'meta.json')), metadata);
      },
    },
    {
      name: 'does not reimport old titles after title is cleared',
      run() {
        const dir = tempDir('codex-meta-migrate-once');
        const file = path.join(dir, 'meta.json');
        writeJson(path.join(dir, 'titles.json'), { b: 'new title' });
        const store = new ConversationMetadataStore({
          metadataPath: file,
          oldTitlesPath: path.join(dir, 'titles.json'),
        });
        const metadata = store.load();
        delete metadata.conversations.b.title;
        store.write(metadata);
        assert.deepStrictEqual(store.load().conversations, { b: {} });
      },
    },
    {
      name: 'imports missing titles from session index for known metadata rows',
      run() {
        const dir = tempDir('codex-meta-session-index');
        const file = path.join(dir, 'meta.json');
        const sessionIndex = path.join(dir, 'session_index.jsonl');
        writeJson(file, {
          version: 1,
          conversations: {
            a: { group: 'g', projectRoot: '/p' },
            b: { title: 'keep', group: 'g', projectRoot: '/p' },
          },
        });
        fs.writeFileSync(sessionIndex, [
          JSON.stringify({ id: 'a', thread_name: 'from session' }),
          JSON.stringify({ id: 'b', thread_name: 'ignored' }),
          '{ bad json',
        ].join('\n'));
        const store = new ConversationMetadataStore({
          metadataPath: file,
          oldTitlesPath: path.join(dir, 'titles.json'),
          sessionIndexPath: sessionIndex,
        });
        const metadata = store.load();
        assert.strictEqual(metadata.conversations.a.title, 'from session');
        assert.strictEqual(metadata.conversations.b.title, 'keep');
        assert.deepStrictEqual(metadata.migrations, {
          oldTitlesImported: true,
          sessionIndexTitlesImported: true,
        });
      },
    },
    {
      name: 'ignores invalid old titles when metadata is valid',
      run() {
        const dir = tempDir('codex-meta-invalid-old-title');
        const file = path.join(dir, 'meta.json');
        writeJson(file, { version: 1, conversations: { a: { title: 'keep' } } });
        fs.writeFileSync(path.join(dir, 'titles.json'), '{ invalid json');
        const store = new ConversationMetadataStore({
          metadataPath: file,
          oldTitlesPath: path.join(dir, 'titles.json'),
        });
        const metadata = store.load();
        assert.deepStrictEqual(metadata.conversations, { a: { title: 'keep' } });
        assert.deepStrictEqual(metadata.migrations, { oldTitlesImported: true });
      },
    },
    {
      name: 'rejects invalid metadata json and does not overwrite it',
      run() {
        const dir = tempDir('codex-meta-invalid');
        const file = path.join(dir, 'meta.json');
        fs.writeFileSync(file, '{ invalid json');
        const store = new ConversationMetadataStore({
          metadataPath: file,
          oldTitlesPath: path.join(dir, 'titles.json'),
        });
        assert.throws(() => store.load(), /metadata JSON 解析失败/);
        assert.strictEqual(fs.readFileSync(file, 'utf8'), '{ invalid json');
      },
    },
    {
      name: 'rejects invalid metadata object shapes',
      run() {
        const dir = tempDir('codex-meta-invalid-shape');
        const cases = [
          [],
          { version: 1, conversations: [] },
          { version: 1, conversations: { a: 'bad' } },
          { version: 1, conversations: {}, pendingGroup: [] },
        ];
        for (const data of cases) {
          const file = path.join(dir, `${cases.indexOf(data)}.json`);
          writeJson(file, data);
          const store = new ConversationMetadataStore({
            metadataPath: file,
            oldTitlesPath: path.join(dir, 'titles.json'),
          });
          assert.throws(() => store.load(), /metadata|conversation/);
        }
      },
    },
    {
      name: 'cleans pending group and migrations edge shapes',
      run() {
        const dir = tempDir('codex-meta-clean-shapes');
        const file = path.join(dir, 'meta.json');
        writeJson(file, {
          version: 1,
          conversations: { a: { title: 'A' } },
          pendingGroup: { projectRoot: ' /p ', group: ' G ', startedAtMs: 'bad' },
          migrations: 'bad',
        });
        const store = new ConversationMetadataStore({
          metadataPath: file,
          oldTitlesPath: path.join(dir, 'titles.json'),
        });
        const metadata = store.load();
        assert.deepStrictEqual(metadata.pendingGroup, { projectRoot: '/p', group: 'G' });
        assert.deepStrictEqual(metadata.migrations, { oldTitlesImported: true });
      },
    },
    {
      name: 'resets pending group and preserves conversations',
      run() {
        const dir = tempDir('codex-meta-reset');
        const file = path.join(dir, 'meta.json');
        writeJson(file, {
          version: 1,
          conversations: { a: { group: 'g' } },
          pendingGroup: { projectRoot: '/project', group: 'g' },
        });
        const store = new ConversationMetadataStore({
          metadataPath: file,
          oldTitlesPath: path.join(dir, 'titles.json'),
        });
        store.resetPendingGroup();
        const metadata = readJson(file);
        assert.deepStrictEqual(metadata.conversations, { a: { group: 'g' } });
        assert.strictEqual(metadata.pendingGroup, undefined);
        assert.deepStrictEqual(metadata.migrations, { oldTitlesImported: true });
        assert.ok(Number.isFinite(metadata.updatedAtMs));
      },
    },
  ],
};
