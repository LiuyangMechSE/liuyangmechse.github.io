import {useState} from 'react';
import Portfolio from './portfolio';
import {LanguageToggle,useLanguage,languageHref} from './language';
import {verifyEditorOwner} from './editor-access';

export default function OwnerEditor() {
 const {language,t}=useLanguage();
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
  <LanguageToggle/><a href={languageHref("./",language)}>{t("← Back to website","← 返回网站")}</a>
  <h1>{t("Website editor","网站编辑器")}</h1>
  <p>{t("Authorize with your LiuyangMechSE GitHub account to open the editing controls.","请使用 LiuyangMechSE 的 GitHub 账号授权，以打开编辑功能。")}</p>
  <form onSubmit={unlock} className="edit-form">
   <label className="field"><span>{t("GitHub access token","GitHub 访问令牌")}</span>
    <input type="password" value={input} onChange={event=>setInput(event.target.value)} autoComplete="off" autoCapitalize="none" spellCheck={false} required disabled={checking}/>
   </label>
   <p className="authorization-note">{t("Use a token for liuyangmechse.github.io with Contents: Read and write. Authorization stays in this tab and clears when you refresh or close it.","请使用对 liuyangmechse.github.io 具有 Contents: Read and write 权限的令牌。授权仅保留在当前标签页中，刷新或关闭后即清除。")}</p>
   {error && <p className="publish-error" role="alert">{error}</p>}
   <button className="owner-unlock" type="submit" disabled={checking || !input.trim()}>{checking ? t('Verifying access…','正在验证权限…') : t('Open editor','打开编辑器')}</button>
  </form>
 </main>;
}
