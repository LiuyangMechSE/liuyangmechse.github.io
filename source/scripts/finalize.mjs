import {readdir,writeFile} from 'node:fs/promises';
import {join} from 'node:path';
async function walk(dir,prefix=''){let files=[];for(const entry of await readdir(dir,{withFileTypes:true})){const name=prefix+entry.name;files.push(...(entry.isDirectory()?await walk(join(dir,entry.name),name+'/'):[name]));}return files;}
const files=(await walk('dist')).filter(f=>f!=='export-manifest.json');
files.push('export-manifest.json');
await writeFile('dist/export-manifest.json',JSON.stringify({files:files.sort()},null,2)+'\n');
console.log('GitHub Pages files and editor export manifest are ready.');
