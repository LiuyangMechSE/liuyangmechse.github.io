const OWNER_ID = 254038789;
const REPOSITORY = 'LiuyangMechSE/liuyangmechse.github.io';

/** UI authorization only. GitHub enforces repository permissions on every publish. */
export async function verifyEditorOwner(token: string): Promise<string> {
 const credential = token.trim();
 if (!credential || /\s/.test(credential)) throw Error('Enter your GitHub access token.');
 async function read(path: string): Promise<any> {
  let response: Response;
  try {
   response = await fetch('https://api.github.com' + path, {
    method: 'GET', cache: 'no-store', credentials: 'omit', redirect: 'error',
    signal: AbortSignal.timeout(15000),
    headers: {Accept: 'application/vnd.github+json', Authorization: `Bearer ${credential}`, 'X-GitHub-Api-Version': '2022-11-28'},
   });
  } catch { throw Error('Could not verify your access with GitHub. Check your connection and try again.'); }
  if (!response.ok) throw Error('GitHub could not authorize this token. Use your website repository token with Contents: Read and write.');
  try { return await response.json(); }
  catch { throw Error('GitHub returned an unreadable response. Please try again.'); }
 }
 const owner = await read('/user');
 if (owner.id !== OWNER_ID) throw Error('This editor is reserved for the LiuyangMechSE account.');
 const repository = await read('/repos/' + REPOSITORY);
 if (repository.full_name?.toLowerCase() !== REPOSITORY.toLowerCase() || !(repository.permissions?.push || repository.permissions?.admin)) {
  throw Error('This token does not have access to edit the website repository.');
 }
 return credential;
}
