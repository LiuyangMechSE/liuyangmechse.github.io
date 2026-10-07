// Offline contract checks for permanent saves. Every fetch is mocked; no token or network is used.
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {mkdtemp, readFile, rm, writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
const require = createRequire(import.meta.url), ts = require('typescript');
const project = resolve(fileURLToPath(new URL('..', import.meta.url)));
const temporary = await mkdtemp(join(tmpdir(), 'website-publish-test-'));
const staged = new Map();
globalThis.__publishTestMedia = staged;
const gitSha = bytes => createHash('sha1').update(`blob ${bytes.length}\0`).update(bytes).digest('hex');
const json = value => JSON.stringify(value, null, 2) + '\n';
const main = 'a'.repeat(40), treeSha = 'b'.repeat(40), nextTree = 'c'.repeat(40), nextCommit = 'd'.repeat(40), racedHead = 'e'.repeat(40);
const prefix = 'https://api.github.com/repos/LiuyangMechSE/liuyangmechse.github.io';
let count = 0;
try {
 let schemaSource = await readFile(join(project, 'src/lib/content.ts'), 'utf8');
 schemaSource = schemaSource.replace("'zod'", JSON.stringify(require.resolve('zod'))).replace("'../../public/content.json'", JSON.stringify(join(project, 'public/content.json')));
 await writeFile(join(temporary, 'content.cjs'), ts.transpileModule(schemaSource, {compilerOptions: {module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true, resolveJsonModule: true}}).outputText);
 await writeFile(join(temporary, 'draft.cjs'), 'exports.readDraftSnapshot = async () => globalThis.__publishTestDraft; exports.writeDraftSnapshot = async snapshot => {globalThis.__publishTestDraft = snapshot}; exports.deleteDraftSnapshot = async () => {delete globalThis.__publishTestDraft};');
 const staticSource = (await readFile(join(project, 'src/static-files.ts'), 'utf8')).replace("'./lib/content'", "'./content.cjs'").replace("'./draft-storage'", "'./draft.cjs'");
 await writeFile(join(temporary, 'static-files.cjs'), ts.transpileModule(staticSource, {compilerOptions: {module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022}}).outputText);
 await writeFile(join(temporary, 'media.cjs'), 'exports.getStagedMedia = path => globalThis.__publishTestMedia.get(path); exports.mediaPaths = require("./static-files.cjs").mediaPaths;');
 const publisher = (await readFile(join(project, 'src/github-publish.ts'), 'utf8')).replace("'./lib/content'", "'./content.cjs'").replace("'./static-files'", "'./media.cjs'");
 await writeFile(join(temporary, 'publisher.cjs'), ts.transpileModule(publisher, {compilerOptions: {module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022}}).outputText);
 const {publishWebsite} = require(join(temporary, 'publisher.cjs'));
 const {siteSchema, safeUrl} = require(join(temporary, 'content.cjs'));
 const {stageCv, saveDraft, loadDraft, getStagedMedia, mediaSource, mediaPaths, exportWebsite} = require(join(temporary, 'static-files.cjs'));
 const base = siteSchema.parse(JSON.parse(await readFile(join(project, 'public/content.json'), 'utf8')));
 const clone = value => structuredClone(value);
 function mock(remote = base, {race = false, patchConflict = false, unauthorized = false} = {}) {
  staged.clear();
  const calls = [], blobs = new Map(), entries = new Map();
  function add(path, bytes) {const buffer = Buffer.from(bytes), sha = gitSha(buffer); blobs.set(sha, buffer); entries.set(path, sha); return sha;}
  add('content.json', json(remote)); add('source/public/content.json', json(remote));
  const media = mediaPaths(remote);
  for (const path of media) {add(path, 'existing:' + path); add('source/public/' + path, 'existing:' + path);}
  add('unrelated-keep.txt', 'unchanged'); add('files/Liuyang-Cheng-CV.pdf', '%PDF-1.7\nprevious CV'); add('source/public/files/Liuyang-Cheng-CV.pdf', '%PDF-1.7\nprevious CV');
  add('export-manifest.json', json({files: ['content.json', 'export-manifest.json', 'index.html', 'research.html', 'files/Liuyang-Cheng-CV.pdf', ...media].sort()}));
  let reads = 0;
  globalThis.fetch = async (url, options) => {
   assert.ok(url.startsWith(prefix), 'requests stay on the fixed GitHub repository');
   assert.equal(options.headers.Authorization, 'Bearer test-token');
   assert.equal(options.credentials, 'omit');
   assert.equal(options.redirect, 'error');
   assert.ok(!url.includes('test-token'));
   assert.ok(!String(options.body).includes('test-token'));
   const path = url.slice(prefix.length), body = options.body && JSON.parse(options.body), method = options.method;
   calls.push({path, method, body});
   let value, status = 200;
   if (path === '' && method === 'GET') {value = {full_name: 'LiuyangMechSE/liuyangmechse.github.io', permissions: {push: !unauthorized}};}
   else if (path === '/git/ref/heads/main' && method === 'GET') {reads++; value = {object: {sha: race && reads > 1 ? racedHead : main}};}
   else if (path === `/git/commits/${main}` && method === 'GET') value = {tree: {sha: treeSha}};
   else if (path === `/git/trees/${treeSha}?recursive=1` && method === 'GET') value = {truncated: false, tree: [...entries].map(([path, sha]) => ({path, type: 'blob', sha, mode: '100644'}))};
   else if (path.startsWith('/git/blobs/') && method === 'GET') {const bytes = blobs.get(path.split('/').at(-1)); assert.ok(bytes, 'existing blob requested'); value = {encoding: 'base64', content: bytes.toString('base64')};}
   else if (path === '/git/blobs' && method === 'POST') {const bytes = Buffer.from(body.content, body.encoding === 'base64' ? 'base64' : 'utf8'), sha = gitSha(bytes); blobs.set(sha, bytes); value = {sha};}
   else if (path === '/git/trees' && method === 'POST') {assert.equal(body.base_tree, treeSha); value = {sha: nextTree};}
   else if (path === '/git/commits' && method === 'POST') {assert.deepEqual(body.parents, [main]); assert.equal(body.tree, nextTree); value = {sha: nextCommit};}
   else if (path === '/git/refs/heads/main' && method === 'PATCH') {assert.deepEqual(body, {sha: nextCommit, force: false}); value = {object: {sha: nextCommit}}; if (patchConflict) status = 422;}
   else assert.fail('Unexpected API request: ' + method + ' ' + path);
   return new Response(JSON.stringify(value), {status, headers: {'Content-Type': 'application/json'}});
  };
  return {calls, blobs, entries};
 }
 async function check(name, action) {await action(); count++; process.stdout.write('PASS ' + name + '\n');}
 await check('portrait and content commit atomically to deployed and source paths', async () => {
  const state = mock(), local = clone(base), path = 'media/new-portrait.png', bytes = Uint8Array.from([137, 80, 78, 71, 1, 2, 3]);
  staged.set(path, new Blob([bytes], {type: 'image/png'})); local.portrait = path;
  const result = await publishWebsite({token: 'test-token', content: local, base});
  const writes = state.calls.find(call => call.path === '/git/trees' && call.method === 'POST').body.tree;
  const root = writes.find(file => file.path === 'content.json'), source = writes.find(file => file.path === 'source/public/content.json');
  assert.equal(root.sha, source.sha); assert.equal(JSON.parse(state.blobs.get(root.sha)).portrait, path);
  assert.equal(writes.find(file => file.path === path).sha, gitSha(bytes));
  assert.equal(writes.find(file => file.path === 'source/public/' + path).sha, gitSha(bytes));
  assert.deepEqual(state.blobs.get(gitSha(bytes)), Buffer.from(bytes));
  assert.ok(!writes.some(file => file.path === 'unrelated-keep.txt'));
  const manifest = JSON.parse(state.blobs.get(writes.find(file => file.path === 'export-manifest.json').sha));
  assert.ok(manifest.files.includes(path)); assert.ok(manifest.files.includes('research.html')); assert.ok(manifest.files.includes(base.portrait));
  assert.equal(state.calls.filter(call => call.method === 'PATCH').length, 1);
  assert.equal(result.sha, nextCommit); assert.equal(result.commitUrl, `https://github.com/LiuyangMechSE/liuyangmechse.github.io/commit/${nextCommit}`);
 });
 await check('unchanged content creates no commit or blobs', async () => {
  const state = mock(), result = await publishWebsite({token: 'test-token', content: base, base});
  assert.equal(result.sha, main); assert.ok(state.calls.every(call => call.method === 'GET'));
 });
 await check('portrait edits preserve a concurrent publication update', async () => {
  const remote = clone(base); remote.sections.find(section => section.id === 'publications').intro += ' Updated publication information.';
  const state = mock(remote), local = clone(base); local.portrait = 'https://example.com/portrait.png';
  const result = await publishWebsite({token: 'test-token', content: local, base});
  assert.equal(result.content.portrait, local.portrait); assert.deepEqual(result.content.sections, remote.sections); assert.ok(state.calls.some(call => call.method === 'PATCH'));
 });
 await check('same-field conflicts stop before any remote write', async () => {
  const remote = clone(base); remote.bio += ' Remote change.';
  const state = mock(remote), local = clone(base); local.bio += ' Local change.';
  await assert.rejects(publishWebsite({token: 'test-token', content: local, base}), /changed on GitHub/);
  assert.ok(state.calls.every(call => call.method === 'GET'));
 });
 await check('missing upload stops before any remote write', async () => {
  const state = mock(), local = clone(base); local.portrait = 'media/lost-portrait.png';
  await assert.rejects(publishWebsite({token: 'test-token', content: local, base}), /missing from this device and GitHub/);
  assert.ok(state.calls.every(call => call.method === 'GET'));
 });
 await check('concurrent branch update stops before ref mutation', async () => {
  const state = mock(base, {race: true}), local = clone(base); local.bio += ' Updated.';
  await assert.rejects(publishWebsite({token: 'test-token', content: local, base}), /changed on GitHub/);
  assert.ok(!state.calls.some(call => call.method === 'PATCH'));
 });
 await check('final non-fast-forward conflict is surfaced safely', async () => {
  mock(base, {patchConflict: true}); const local = clone(base); local.bio += ' Updated.';
  await assert.rejects(publishWebsite({token: 'test-token', content: local, base}), /changed on GitHub/);
 });
 await check('read-only account cannot create git objects', async () => {
  const state = mock(base, {unauthorized: true}), local = clone(base); local.bio += ' Updated.';
  await assert.rejects(publishWebsite({token: 'test-token', content: local, base}), /cannot publish/);
  assert.ok(state.calls.every(call => call.method === 'GET'));
 });
 await check('replacement CV bytes and links publish to both paths while preserving the previous CV', async () => {
  const remote = clone(base); remote.sections.find(section => section.id === 'publications').intro += ' Fresh publications.';
  const state = mock(remote), local = clone(base), path = 'files/cv-new.pdf', bytes = Buffer.from('%PDF-1.7\nnew CV bytes\n%%EOF');
  local.links = local.links.filter(link => !/^CV(?:\s|$)/i.test(link.label)); local.links.push({label: 'CV (PDF)', url: path});
  staged.set(path, new Blob([bytes], {type: 'application/pdf'}));
  const result = await publishWebsite({token: 'test-token', content: local, base});
  const writes = state.calls.find(call => call.path === '/git/trees' && call.method === 'POST').body.tree;
  assert.equal(writes.find(file => file.path === path).sha, gitSha(bytes));
  assert.equal(writes.find(file => file.path === 'source/public/' + path).sha, gitSha(bytes));
  assert.deepEqual(state.blobs.get(gitSha(bytes)), bytes);
  const root = writes.find(file => file.path === 'content.json'), source = writes.find(file => file.path === 'source/public/content.json');
  assert.equal(root.sha, source.sha); assert.deepEqual(result.content.links, local.links); assert.deepEqual(result.content.sections, remote.sections);
  const manifest = JSON.parse(state.blobs.get(writes.find(file => file.path === 'export-manifest.json').sha));
  assert.ok(manifest.files.includes(path)); assert.ok(manifest.files.includes('files/Liuyang-Cheng-CV.pdf'));
  assert.ok(!writes.some(file => file.path.endsWith('files/Liuyang-Cheng-CV.pdf')));
 });
 await check('missing CV and conflicting remote CV filenames stop before remote writes', async () => {
  const local = clone(base); local.links.push({label: 'CV', url: 'files/cv-missing.pdf'});
  let state = mock();
  await assert.rejects(publishWebsite({token: 'test-token', content: local, base}), /missing from this device and GitHub/);
  assert.ok(state.calls.every(call => call.method === 'GET'));
  local.links.at(-1).url = 'files/Liuyang-Cheng-CV.pdf'; state = mock();
  staged.set('files/Liuyang-Cheng-CV.pdf', new Blob(['%PDF-1.7\ndifferent CV'], {type: 'application/pdf'}));
  await assert.rejects(publishWebsite({token: 'test-token', content: local, base}), /uploaded file has the same filename/);
  assert.ok(state.calls.every(call => call.method === 'GET'));
 });
 await check('simultaneous profile link changes retain the draft and stop before remote writes', async () => {
  const local = clone(base), remote = clone(base); local.links.push({label: 'CV', url: 'files/cv-local.pdf'}); remote.links.push({label: 'New profile', url: 'https://example.com/updated'});
  const state = mock(remote);
  await assert.rejects(publishWebsite({token: 'test-token', content: local, base}), /changed on GitHub/);
  assert.ok(state.calls.every(call => call.method === 'GET'));
 });
 await check('PDF staging checks actual bytes and keeps a normalized preview Blob', async () => {
  for (const type of ['', 'application/octet-stream', 'application/pdf']) {
   const file = new File(['%PDF-1.7\nCV\n%%EOF'], 'CV.PDF', {type}), path = await stageCv(file);
   assert.match(path, /^files\/cv-[0-9a-f-]+\.pdf$/); assert.equal(getStagedMedia(path).type, 'application/pdf');
   assert.equal(await getStagedMedia(path).text(), await file.text()); assert.match(mediaSource(path), /^blob:/);
  }
  await assert.rejects(stageCv(new File(['hello'], 'CV.pdf', {type: 'application/pdf'})), /not a PDF/);
  await assert.rejects(stageCv(new File(['%PDF-1.7'], 'CV.txt', {type: 'application/pdf'})), /Choose a PDF/);
  await assert.rejects(stageCv(new File(['%PDF-1.7'], 'CV.pdf', {type: 'text/html'})), /Choose a PDF/);
  await assert.rejects(stageCv(new File([], 'CV.pdf', {type: 'application/pdf'})), /nonempty PDF/);
  await assert.rejects(stageCv(new File(['%PDF-', new Uint8Array(25*1024*1024)], 'CV.pdf', {type: 'application/pdf'})), /no larger than 25 MB/);
  for (const path of ['files/../CV.pdf', 'files/..CV.pdf', 'files/CV.pdf/evil', 'files/%2e%2e%2fCV.pdf', 'files/CV.html']) assert.equal(safeUrl(path), false, path);
  assert.equal(safeUrl('files/Liuyang-Cheng-CV.pdf'), true);
  assert.equal(safeUrl('https://liuyangmechse.github.io/files/Liuyang-Cheng-CV.pdf'), true);
 });
 await check('draft reload restores PDF bytes and rejects an invalid PDF without disturbing active uploads', async () => {
  const path = await stageCv(new File(['%PDF-1.7\nrestored CV'], 'CV.pdf', {type: 'application/pdf'}));
  const local = clone(base); local.links.push({label: 'CV', url: path});
  await saveDraft(local, base); const saved = globalThis.__publishTestDraft;
  const restored = await loadDraft(); assert.deepEqual(restored.content, local); assert.equal(await getStagedMedia(path).text(), '%PDF-1.7\nrestored CV'); assert.match(mediaSource(path), /^blob:/);
  globalThis.__publishTestDraft = {...saved, uploads: [{path: 'files/cv-broken.pdf', blob: new Blob(['wrong'], {type: 'application/pdf'})}]};
  await assert.rejects(loadDraft(), /invalid file/); assert.equal(await getStagedMedia(path).text(), '%PDF-1.7\nrestored CV');
  globalThis.__publishTestDraft = {...saved, uploads: [{path: 'files/../cv-broken.pdf', blob: new Blob(['%PDF-1.7'], {type: 'application/pdf'})}]};
  await assert.rejects(loadDraft(), /invalid file/); globalThis.__publishTestDraft = saved;
 });
 await check('export uses staged PDF bytes, preserves existing files, and deduplicates filenames', async () => {
  const path = await stageCv(new File(['%PDF-1.7\nexported CV'], 'CV.pdf', {type: 'application/pdf'}));
  const local = clone(base); local.links.push({label: 'CV', url: path});
  const originalCreate = URL.createObjectURL, originalTimeout = globalThis.setTimeout, originalDocument = globalThis.document;
  let archive, downloaded = false; const fetched = [];
  URL.createObjectURL = blob => {archive = blob; return 'blob:test-export';}; globalThis.setTimeout = () => 0;
  globalThis.document = {createElement: tag => {assert.equal(tag, 'a'); return {click: () => {downloaded = true;}};}};
  globalThis.fetch = async url => {
   fetched.push(url); assert.notEqual(url, './' + path, 'staged upload must not be fetched from the old deployment');
   if (url === './export-manifest.json') return new Response(json({files: ['index.html', 'content.json', 'export-manifest.json', 'files/Liuyang-Cheng-CV.pdf', path, path]}));
   return new Response(url === './files/Liuyang-Cheng-CV.pdf' ? '%PDF-1.7\nprevious CV' : 'deployed asset');
  };
  try {await exportWebsite(local);} finally {URL.createObjectURL = originalCreate; globalThis.setTimeout = originalTimeout; globalThis.document = originalDocument;}
  assert.ok(downloaded); const bytes = Buffer.from(await archive.arrayBuffer()), files = new Map(); let offset = 0;
  while (bytes.readUInt32LE(offset) === 0x04034b50) {
   const size = bytes.readUInt32LE(offset + 18), nameLength = bytes.readUInt16LE(offset + 26), extraLength = bytes.readUInt16LE(offset + 28), name = bytes.subarray(offset + 30, offset + 30 + nameLength).toString();
   assert.ok(!files.has(name), 'one archive entry per file'); const start = offset + 30 + nameLength + extraLength; files.set(name, bytes.subarray(start, start + size)); offset = start + size;
  }
  assert.equal(files.get(path).toString(), '%PDF-1.7\nexported CV'); assert.equal(files.get('files/Liuyang-Cheng-CV.pdf').toString(), '%PDF-1.7\nprevious CV');
  assert.deepEqual(JSON.parse(files.get('content.json')), local); const manifest = JSON.parse(files.get('export-manifest.json'));
  assert.deepEqual(manifest.files, [...files.keys()].sort()); assert.ok(fetched.includes('./files/Liuyang-Cheng-CV.pdf'));
 });
 process.stdout.write(`${count} offline publishing checks passed.\n`);
} finally {
 delete globalThis.__publishTestMedia;
 delete globalThis.__publishTestDraft;
 await rm(temporary, {recursive: true, force: true});
}
