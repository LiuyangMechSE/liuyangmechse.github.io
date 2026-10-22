import {readFileSync} from 'node:fs';
import {dirname,join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {afterEach,beforeEach,describe,it,expect,vi} from 'vitest';
import {cleanup,render,fireEvent,waitFor} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {LanguageProvider} from '../src/language';
import Portfolio from '../src/portfolio';
import {initialContent} from '../src/lib/content';
import {clearDraft,loadDraft} from '../src/static-files';

const sourceRoot=join(dirname(fileURLToPath(import.meta.url)),'../src');
const typography=readFileSync(join(sourceRoot,'research-typography.css'),'utf8');
const mainSource=readFileSync(join(sourceRoot,'main.tsx'),'utf8');
let style:HTMLStyleElement;
beforeEach(async()=>{
 cleanup();localStorage.clear();await clearDraft();
 vi.stubGlobal('fetch',vi.fn(async()=>new Response(JSON.stringify(initialContent),{status:200})));
 vi.stubGlobal('requestAnimationFrame',vi.fn(()=>1));vi.stubGlobal('cancelAnimationFrame',vi.fn());
 style=document.createElement('style');style.textContent=typography;document.head.append(style);
});
afterEach(()=>{cleanup();style.remove();vi.restoreAllMocks();});

// CSSOM checks protect selector scope and the explicit size hierarchy. Real
// browser QA additionally checks the full built cascade, fonts and text bounds.
describe('research typography',()=>{
 it('scopes every typography rule to Research and loads it after the shared theme',()=>{
  const selectors=Array.from(style.sheet!.cssRules).flatMap(rule=>(rule as CSSStyleRule).selectorText.split(','));
  expect(selectors.length).toBeGreaterThan(20);expect(selectors.every(s=>s.includes('.research-page'))).toBe(true);
  expect(typography).not.toMatch(/!important|@font-face|url\(/);
  const main=mainSource;
  expect(main.indexOf("import './research-typography.css'")).toBeGreaterThan(main.indexOf("import './globals.css'"));
 });

 it.each([['/research.html','en','Play','Pause'],['/zh/research.html','zh-CN','播放','暂停']])('preserves %s content, controls and readable type roles',async(path,lang,play,pause)=>{
  window.history.replaceState({},'',path);render(<LanguageProvider><Portfolio canEdit={false}/></LanguageProvider>);
  await waitFor(()=>expect(document.querySelector('main')?.getAttribute('aria-busy')).toBe('false'));
  expect(document.documentElement.lang).toBe(lang);
  expect(document.querySelectorAll('.research-demo').length).toBe(3);expect(document.querySelectorAll('.project-paper-figure').length).toBe(4);expect(document.querySelectorAll('video').length).toBe(1);
  const headings=Array.from(document.querySelectorAll('.entry h3'));expect(headings.length).toBe(6);
  for(const heading of headings){const s=getComputedStyle(heading);expect(s.fontSize).toBe('18px');expect(s.fontWeight).toBe('600');expect(s.lineHeight).toBe('1.45');}
  expect(getComputedStyle(document.querySelector('#octopus-arm .venue')!).fontStyle).toBe('normal');
  for(const [selector,size] of [['.scene-label','13px'],['.chart-title','13px'],['.scene-small','11px'],['.chart-small','11px'],['.scene-equation','15px']])expect(getComputedStyle(document.querySelector(selector)!).fontSize).toBe(size);
  const family=getComputedStyle(document.querySelector('.research-page')!).getPropertyValue('--research-font-body');
  expect(family).toContain('Arial');if(lang==='zh-CN')expect(family).toContain('Noto Sans CJK SC');
  for(const button of document.querySelectorAll<HTMLButtonElement>('.mechanics-play')){
   expect(button.getAttribute('aria-label')).toContain(play);await userEvent.click(button);expect(button.getAttribute('aria-label')).toContain(pause);await userEvent.click(button);expect(button.getAttribute('aria-label')).toContain(play);
  }
  expect(document.querySelectorAll('.mechanics-control input').length).toBe(4);
  for(const slider of document.querySelectorAll<HTMLInputElement>('.mechanics-control input')){
   const value=((Number(slider.min)+Number(slider.max))/2).toFixed(2),control=slider.closest('.mechanics-control')!;
   fireEvent.change(slider,{target:{value}});expect(Number(slider.value)).toBe(Number(value));expect(control.querySelector('output')!.textContent).toContain(value);
  }
  for(const details of document.querySelectorAll<HTMLDetailsElement>('.mechanics-details')){
   await userEvent.click(details.querySelector('summary')!);expect(details.open).toBe(true);await userEvent.click(details.querySelector('summary')!);expect(details.open).toBe(false);
  }
  const video=document.querySelector('video')!;expect(video.controls).toBe(true);expect(video.playsInline).toBe(true);expect(video.getAttribute('src')).toContain('art-lighting-trial10-20261019-web.mp4');
  expect(document.querySelector('.editor-bar')).toBeNull();expect(await loadDraft()).toBeNull();
 });
});
