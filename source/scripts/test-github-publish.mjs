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
 await writeFile(join(temporary, 'media.cjs'), 'exports.getStagedMedia = path => globalThis.__publishTestMedia.get(path); exports.mediaPaths = content => [...new Set([content.portrait,...content.sections.flatMap(s=>s.items.flatMap(i=>[i.media,i.figure?.src??" "]))].filter(p=>p.startsWith("media/")))];');
 const publisher = (await readFile(join(project, 'src/github-publish.ts'), 'utf8')).replace("'./lib/content'", "'./content.cjs'").replace("'./static-files'", "'./media.cjs'");
 await writeFile(join(temporary, 'publisher.cjs'), ts.transpileModule(publisher, {compilerOptions: {module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022}}).outputText);
 const {publishWebsite} = require(join(temporary, 'publisher.cjs'));
 const {siteSchema} = require(join(temporary, 'content.cjs'));
 const base = siteSchema.parse(JSON.parse(await readFile(join(project, 'public/content.json'), 'utf8')));
 const clone = value => structuredClone(value);
 function mock(remote = base, {race = false, patchConflict = false, unauthorized = false} = {}) {
  staged.clear();
  const calls = [], blobs = new Map(), entries = new Map();
  function add(path, bytes) {const buffer = Buffer.from(bytes), sha = gitSha(buffer); blobs.set(sha, buffer); entries.set(path, sha); return sha;}
  add('content.json', json(remote)); add('source/public/content.json', json(remote));
  const media = [...new Set([remote.portrait, ...remote.sections.flatMap(s => s.items.flatMap(i => [i.media, i.figure?.src ?? '']))].filter(p => p.startsWith('media/')))];
  for (const path of media) {add(path, 'existing:' + path); add('source/public/' + path, 'existing:' + path);}
  add('unrelated-keep.txt', 'unchanged');
  add('export-manifest.json', json({files: ['content.json', 'export-manifest.json', 'index.html', 'research.html', ...media].sort()}));
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
 process.stdout.write(`${count} offline publishing checks passed.\n`);
} finally {
 delete globalThis.__publishTestMedia;
 await rm(temporary, {recursive: true, force: true});
}
