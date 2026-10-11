'use strict';
// Keep documentation and runnable prototypes in their declared categories.
const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'../..'),docs=path.join(root,'docs');
const categories=new Set(['api','architecture','demo-static','feature','project','review','security']);
const controls=new Set(['README.md','DIRECTORY-LAYOUT.md','BGSSAI-Standards.md']);
const issues=[],files=[];
function walk(dir){for(const entry of fs.readdirSync(dir,{withFileTypes:true})){const file=path.join(dir,entry.name);if(entry.isDirectory())walk(file);else files.push(file)}}
function relative(file){return path.relative(root,file).replaceAll('\\','/')}
for(const entry of fs.readdirSync(docs,{withFileTypes:true})){
 if(entry.isDirectory()?!categories.has(entry.name):!controls.has(entry.name))issues.push('Unclassified docs entry: '+entry.name);
}
walk(docs);
for(const file of files){
 const name=relative(file),parts=name.split('/'),inPrototype=parts[1]==='demo-static',ext=path.extname(file);
 if(inPrototype){
  if(['.md','.py','.cjs','.mjs'].includes(ext))issues.push('Move documentation or tooling out of prototypes: '+name);
  if(parts.length===3){if(!['index.html','PAGE-FLOW.html'].includes(parts[2]))issues.push('Unexpected prototype root file: '+name)}
  else if(parts[2]!=='web'||!['admin','user'].includes(parts[3]))issues.push('Prototype must declare its runtime: '+name);
  else if(parts.length===5){if(ext!=='.html')issues.push('Page resources belong in assets: '+name)}
  else if(parts[4]!=='assets')issues.push('Page resources belong in assets: '+name);
 }else{
  if(ext==='.html'&&(!['feature','architecture'].includes(parts[1])||!/(?:^diagram-|-(?:flow|diagram)\.html$)/i.test(path.basename(file))))issues.push('HTML outside prototypes must be a named design diagram: '+name);
  if(parts.slice(2,-1).some(part=>['admin','user'].includes(part)))issues.push('Split runtime directories are only allowed for prototypes: '+name);
 }
}
const web=path.join(docs,'demo-static/web');
for(const entry of fs.readdirSync(web,{withFileTypes:true})){
 if(!entry.isDirectory()||!['admin','user'].includes(entry.name))issues.push('Do not flatten pages or assets into web: '+entry.name);
}
for(const runtime of ['admin','user'])for(const entry of ['index.html','PAGE-FLOW.html']){
 if(!fs.existsSync(path.join(web,runtime,entry)))issues.push('Missing runtime entry: '+runtime+'/'+entry);
}
let links=0;
function checkLink(file,link){
 if(/^(?:#|[a-z][\w+.-]*:|\/\/)/i.test(link)||["'+",'"+','${','<','>','\\'].some(token=>link.includes(token)))return;
 const pathname=link.split(/[?#]/,1)[0];if(!pathname)return;
 const target=path.resolve(path.dirname(file),decodeURIComponent(pathname));
 links++;
 if(relative(file).startsWith('docs/demo-static/')&&target.startsWith(docs+path.sep)&&!target.startsWith(path.join(docs,'demo-static')+path.sep))issues.push('Keep documentation links out of operational prototypes: '+relative(file)+' -> '+link);
 if(!target.startsWith(root+path.sep))issues.push('Local link escapes the repository: '+relative(file)+' -> '+link);
 else if(!fs.existsSync(target))issues.push('Missing local link: '+relative(file)+' -> '+link);
}
for(const file of [path.join(root,'README.md'),path.join(root,'AGENTS.md'),...files.filter(file=>['.md','.html'].includes(path.extname(file)))]){
 const text=fs.readFileSync(file,'utf8');
 for(const match of text.matchAll(/!?\[[^\]\n]*\]\(([^\s)]+)\)/g))checkLink(file,match[1]);
 for(const match of text.matchAll(/\b(?:href|src)=["']([^"']+)["']/g))checkLink(file,match[1]);
}
const reference=path.join(web,'admin/assets/aecg-reference');
const referenceIndex=path.join(web,'admin/reference-aecg.html');
const catalog=JSON.parse(fs.readFileSync(path.join(reference,'catalog.json'),'utf8'));
for(const entry of catalog){
 for(const field of ['html','image'])checkLink(referenceIndex,'assets/aecg-reference/'+entry[field]);
 const htmlFile=path.join(reference,entry.html);
 if(fs.existsSync(htmlFile)){
  const dataRoot=fs.readFileSync(htmlFile,'utf8').match(/data-root="([^"]*)"/)?.[1];
  if(dataRoot===undefined||path.resolve(path.dirname(htmlFile),dataRoot)!==reference)issues.push('Incorrect reference resource root: '+relative(htmlFile));
 }
}
const dataRoot=fs.readFileSync(referenceIndex,'utf8').match(/data-root="([^"]*)"/)?.[1];
if(dataRoot===undefined||path.resolve(path.dirname(referenceIndex),dataRoot)!==reference)issues.push('Incorrect reference catalog root');
if(issues.length){console.error(issues.join('\n'));process.exitCode=1}
else console.log(`Directory layout and ${links} local links verified; ${catalog.length} reference pages and screenshots accounted for.`);
