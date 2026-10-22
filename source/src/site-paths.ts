/** The two public sites share assets, published content and the owner draft. */
export const isChineseSite = () => typeof window !== 'undefined' && /\/zh(?:\/|$)/.test(window.location.pathname);
export const isEditorPage = () => typeof window !== 'undefined' && window.location.pathname.endsWith('/editor.html');
export const siteFile = (path:string) => (isChineseSite()?'../':'./')+path;
