import {useState} from 'react';
import Portfolio from './portfolio';
import {verifyEditorOwner} from './editor-access';

export default function OwnerEditor() {
 const [credential, setCredential] = useState('');
 const [input, setInput] = useState('');
 const [checking, setChecking] = useState(false);
 const [error, setError] = useState('');
 async function unlock(event: React.FormEvent<HTMLFormElement>) {
  event.preventDefault();
  if (checking) return;
  setChecking(true); setError('');
  try { setCredential(await verifyEditorOwner(input)); setInput(''); }
  catch (error) { setError(error instanceof Error ? error.message : 'Could not verify your access.'); }
  finally { setChecking(false); }
 }
 if (credential) return <Portfolio canEdit editorToken={credential}/>;
 return <main className="owner-access">
  <a href="./">← Back to website</a>
  <h1>Website editor</h1>
  <p>Authorize with your LiuyangMechSE GitHub account to open the editing controls.</p>
  <form onSubmit={unlock} className="edit-form">
   <label className="field"><span>GitHub access token</span>
    <input type="password" value={input} onChange={event=>setInput(event.target.value)} autoComplete="off" autoCapitalize="none" spellCheck={false} required disabled={checking}/>
   </label>
   <p className="authorization-note">Use a token for liuyangmechse.github.io with Contents: Read and write. Authorization stays in this tab and clears when you refresh or close it.</p>
   {error && <p className="publish-error" role="alert">{error}</p>}
   <button className="owner-unlock" type="submit" disabled={checking || !input.trim()}>{checking ? 'Verifying access…' : 'Open editor'}</button>
  </form>
 </main>;
}
