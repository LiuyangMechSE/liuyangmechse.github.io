// Read-only GitHub authorization checks. All responses are mocked.
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import ts from 'typescript';

const source = await readFile(new URL('../src/editor-access.ts', import.meta.url), 'utf8');
const compiled = ts.transpileModule(source, {compilerOptions: {module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022}}).outputText;
const {verifyEditorOwner} = await import('data:text/javascript;base64,' + Buffer.from(compiled).toString('base64'));
const originalFetch = globalThis.fetch;
const repository = {full_name: 'LiuyangMechSE/liuyangmechse.github.io', permissions: {push: true}};
let calls;
function mock({id = 254038789, repo = repository, status = 200, offline = false} = {}) {
 calls = [];
 globalThis.fetch = async (url, options) => {
  calls.push(url);
  assert.equal(options.method, 'GET');
  assert.equal(options.credentials, 'omit');
  assert.equal(options.redirect, 'error');
  assert.equal(options.headers.Authorization, 'Bearer test-owner-token');
  assert.ok(!url.includes('test-owner-token'));
  assert.equal(options.body, undefined);
  if (offline) throw Error('offline');
  const body = url === 'https://api.github.com/user' ? {id} : repo;
  return new Response(JSON.stringify(body), {status});
 };
}
try {
 mock();
 assert.equal(await verifyEditorOwner(' test-owner-token '), 'test-owner-token');
 assert.deepEqual(calls, ['https://api.github.com/user', 'https://api.github.com/repos/LiuyangMechSE/liuyangmechse.github.io']);
 mock({id: 1});
 await assert.rejects(verifyEditorOwner('test-owner-token'), /reserved/);
 assert.equal(calls.length, 1, 'another account is rejected before checking repository access');
 mock({repo: {...repository, permissions: {push: false}}});
 await assert.rejects(verifyEditorOwner('test-owner-token'), /does not have access/);
 mock({repo: {...repository, full_name: 'other/repository'}});
 await assert.rejects(verifyEditorOwner('test-owner-token'), /does not have access/);
 for (const status of [401, 403, 404]) {
  mock({status});
  await assert.rejects(verifyEditorOwner('test-owner-token'), /could not authorize/);
 }
 mock({offline: true});
 await assert.rejects(verifyEditorOwner('test-owner-token'), /Could not verify/);
 mock();
 await assert.rejects(verifyEditorOwner(''), /Enter your/);
 await assert.rejects(verifyEditorOwner('invalid token'), /Enter your/);
 assert.equal(calls.length, 0);
 console.log('Editor access checks passed: owner, other user, repository permissions, failed authorization, network failure and invalid input.');
} finally { globalThis.fetch = originalFetch; }
