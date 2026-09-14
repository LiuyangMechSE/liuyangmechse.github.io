import {siteSchema, type SiteContent} from './lib/content';
import {getStagedMedia, mediaPaths} from './static-files';

const REPOSITORY = 'LiuyangMechSE/liuyangmechse.github.io';
const API = `https://api.github.com/repos/${REPOSITORY}`;
const COMMIT_URL = `https://github.com/${REPOSITORY}/commit/`;
const encoder = new TextEncoder();
const decoder = new TextDecoder('utf-8', {fatal: true});
const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);
const jsonText = (value: unknown) => JSON.stringify(value, null, 2) + '\n';
const conflict = () => Error('The website changed on GitHub while you were editing. Your draft is still open. Download a backup, discard the draft, and reload the latest website before applying the conflicting change again.');

/** Merge independent profile/publication changes; never guess about simultaneous edits. */
export function mergeWebsiteContent(base: SiteContent, local: SiteContent, remote: SiteContent): SiteContent {
 const before = siteSchema.parse(base), draft = siteSchema.parse(local), latest = siteSchema.parse(remote);
 const merged: Record<string, unknown> = {};
 for (const key of Object.keys(before) as (keyof SiteContent)[]) {
  if (same(draft[key], before[key])) merged[key] = latest[key];
  else if (same(latest[key], before[key]) || same(draft[key], latest[key])) merged[key] = draft[key];
  else throw conflict();
 }
 return siteSchema.parse(merged);
}

type TreeEntry = {path: string; type: string; sha: string; mode?: string};
type TreeWrite = {path: string; mode: '100644'; type: 'blob'; sha: string};
type Progress = (text: string) => void;
export type PublishResult = {commitUrl: string; sha: string; content: SiteContent};

function checkedSha(value: unknown): string {
 if (typeof value !== 'string' || !/^[0-9a-f]{40}$/.test(value)) throw Error('GitHub returned an invalid file version. Nothing has been published.');
 return value;
}
function decodeJsonBlob(blob: {encoding?: string; content?: string}): unknown {
 try {
  if (blob.encoding !== 'base64' || typeof blob.content !== 'string') throw Error();
  const bytes = Uint8Array.from(atob(blob.content.replace(/\s/g, '')), character => character.charCodeAt(0));
  return JSON.parse(decoder.decode(bytes));
 } catch { throw Error('The saved website files could not be read from GitHub. Your draft has been kept.'); }
}
function base64(bytes: Uint8Array): string {
 let value = '';
 for (let offset = 0; offset < bytes.length; offset += 32768) value += String.fromCharCode(...bytes.subarray(offset, offset + 32768));
 return btoa(value);
}
async function gitBlobSha(bytes: Uint8Array): Promise<string> {
 const prefix = encoder.encode(`blob ${bytes.byteLength}\0`), data = new Uint8Array(prefix.length + bytes.length);
 data.set(prefix); data.set(bytes, prefix.length);
 return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-1', data)), byte => byte.toString(16).padStart(2, '0')).join('');
}

/** Publish content and uploaded media in one fast-forward commit. Token is never stored. */
export async function publishWebsite({token, content, base, onProgress}: {
 token: string; content: SiteContent; base: SiteContent; onProgress?: Progress;
}): Promise<PublishResult> {
 const credential = token.trim();
 if (!credential || /\s/.test(credential)) throw Error('Enter your GitHub access token to publish.');
 const local = siteSchema.parse(content), baseline = siteSchema.parse(base);
 const progress = (text: string) => onProgress?.(text);
 async function request<T>(path: string, method = 'GET', body?: unknown): Promise<T> {
  let response: Response;
  try {
   response = await fetch(API + path, {
    method, cache: 'no-store', credentials: 'omit', redirect: 'error',
    headers: {Accept: 'application/vnd.github+json', Authorization: `Bearer ${credential}`, 'X-GitHub-Api-Version': '2022-11-28', ...(body === undefined ? {} : {'Content-Type': 'application/json'})},
    ...(body === undefined ? {} : {body: JSON.stringify(body)}),
   });
  } catch {
   throw Error('Could not reach GitHub. Check your connection and try publishing again. Your draft has been kept.');
  }
  if (!response.ok) {
   if (response.status === 401) throw Error('GitHub did not accept this token. Create a valid token and try again.');
   if (response.status === 403 || response.status === 404) throw Error('GitHub could not allow this save. Check that the token selects liuyangmechse.github.io and has Contents: Read and write. Repository rules or a GitHub rate limit may also block publishing.');
   if (response.status === 409 || (response.status === 422 && method === 'PATCH')) throw conflict();
   throw Error(`GitHub could not finish the save (HTTP ${response.status}). Your draft has been kept; try again.`);
  }
  try { return await response.json() as T; }
  catch { throw Error('GitHub returned an unreadable response. Check the repository before trying again.'); }
 }
 const result = (sha: string, published: SiteContent): PublishResult => ({sha, commitUrl: COMMIT_URL + checkedSha(sha), content: published});
 progress('Checking your GitHub access…');
 const repository = await request<{full_name?: string; permissions?: {push?: boolean; admin?: boolean}}>('');
 if (repository.full_name?.toLowerCase() !== REPOSITORY.toLowerCase() || !(repository.permissions?.push || repository.permissions?.admin)) {
  throw Error('This GitHub account cannot publish to liuyangmechse.github.io. Use the repository owner’s token with Contents: Read and write.');
 }
 const head = checkedSha((await request<{object: {sha: string}}>('/git/ref/heads/main')).object.sha);
 const treeSha = checkedSha((await request<{tree: {sha: string}}>(`/git/commits/${head}`)).tree.sha);
 const tree = await request<{tree: TreeEntry[]; truncated?: boolean}>(`/git/trees/${treeSha}?recursive=1`);
 if (tree.truncated || !Array.isArray(tree.tree)) throw Error('The repository file list is incomplete. Publishing was stopped to protect the existing website.');
 const files = new Map(tree.tree.filter(entry => entry.type === 'blob').map(entry => [entry.path, checkedSha(entry.sha)]));
 async function readJson(path: string): Promise<unknown> {
  const sha = files.get(path);
  if (!sha) throw Error(`The repository is missing ${path}. Publishing was stopped to protect the existing website.`);
  return decodeJsonBlob(await request<{encoding: string; content: string}>(`/git/blobs/${sha}`));
 }
 progress('Comparing your draft with the published website…');
 const remote = siteSchema.parse(await readJson('content.json'));
 const merged = mergeWebsiteContent(baseline, local, remote);
 const paths = mediaPaths(merged);
 const media: {path: string; sha: string; bytes?: Uint8Array}[] = [];
 // Check every file before creating any remote objects. Missing uploads never become broken links.
 for (const path of paths) {
  const staged = getStagedMedia(path), existing = files.get(path);
  if (staged) {
   const bytes = new Uint8Array(await staged.arrayBuffer()), sha = await gitBlobSha(bytes);
   if (existing && existing !== sha) throw Error('An uploaded image has the same filename as a different image on GitHub. Upload that image again to give it a new filename.');
   media.push({path, sha, ...(existing ? {} : {bytes})});
  } else {
   const sha = existing ?? files.get('source/public/' + path);
   if (!sha) throw Error(`The upload ${path} is missing from this device and GitHub. Choose the file again before publishing.`);
   media.push({path, sha});
  }
 }
 const manifest = await readJson('export-manifest.json') as {files?: unknown};
 if (!Array.isArray(manifest.files) || manifest.files.some(path => typeof path !== 'string' || !path || path.startsWith('/') || path.includes('..') || path.includes(':'))) {
  throw Error('The website export file list is invalid. Publishing was stopped to protect your backup download.');
 }
 const writes: TreeWrite[] = [];
 const addFile = (path: string, sha: string) => {if (files.get(path) !== sha) writes.push({path, mode: '100644', type: 'blob', sha});};
 const contentText = jsonText(merged), contentSha = await gitBlobSha(encoder.encode(contentText));
 const manifestText = jsonText({...manifest, files: Array.from(new Set([...manifest.files as string[], ...paths, 'content.json', 'export-manifest.json'])).sort()});
 const manifestSha = await gitBlobSha(encoder.encode(manifestText));
 const contentChanged = files.get('content.json') !== contentSha || files.get('source/public/content.json') !== contentSha;
 const manifestChanged = files.get('export-manifest.json') !== manifestSha;
 const mediaChanged = media.some(file => files.get(file.path) !== file.sha || files.get('source/public/' + file.path) !== file.sha);
 if (!contentChanged && !manifestChanged && !mediaChanged) {
  progress('This version is already saved on GitHub.');
  return result(head, merged);
 }
 async function uploadBlob(text: string, encoding: 'utf-8' | 'base64', expected: string): Promise<string> {
  const sha = checkedSha((await request<{sha: string}>('/git/blobs', 'POST', {content: text, encoding})).sha);
  if (sha !== expected) throw Error('GitHub did not confirm the uploaded file correctly. Publishing was stopped.');
  return sha;
 }
 for (const [index, file] of media.entries()) {
  if (file.bytes) {progress(`Uploading media ${index + 1} of ${media.length}…`); await uploadBlob(base64(file.bytes), 'base64', file.sha);}
  addFile(file.path, file.sha); addFile('source/public/' + file.path, file.sha);
 }
 progress('Saving website content…');
 if (contentChanged) {
  await uploadBlob(contentText, 'utf-8', contentSha);
  addFile('content.json', contentSha); addFile('source/public/content.json', contentSha);
 }
 if (manifestChanged) {await uploadBlob(manifestText, 'utf-8', manifestSha); addFile('export-manifest.json', manifestSha);}
 const nextTree = checkedSha((await request<{sha: string}>('/git/trees', 'POST', {base_tree: treeSha, tree: writes})).sha);
 const nextCommit = checkedSha((await request<{sha: string}>('/git/commits', 'POST', {
  message: 'Save website changes from the editor', tree: nextTree, parents: [head],
 })).sha);
 const currentHead = checkedSha((await request<{object: {sha: string}}>('/git/ref/heads/main')).object.sha);
 if (currentHead !== head) throw conflict();
 progress('Publishing your changes…');
 // A non-fast-forward update is rejected even if a commit arrives after the check above.
 const updated = await request<{object: {sha: string}}>('/git/refs/heads/main', 'PATCH', {sha: nextCommit, force: false});
 if (checkedSha(updated.object.sha) !== nextCommit) throw Error('GitHub could not confirm the save. Check the repository before trying again.');
 progress('Saved permanently to GitHub. The public website will update after deployment.');
 return result(nextCommit, merged);
}
