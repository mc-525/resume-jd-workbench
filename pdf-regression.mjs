// Local-only regression runner. File paths are CLI arguments; no private fixture is stored.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {pathToFileURL} from 'node:url';
import fields from './resume-fields.js';
const {getDocument}=await import(pathToFileURL(process.argv[3]).href);
const pdf=await getDocument({data:new Uint8Array(fs.readFileSync(process.argv[2])),useSystemFonts:true}).promise;
const pages=[];
const characters=s=>[...s.replace(/\s/g,'')].sort().join('');
for(let i=1;i<=pdf.numPages;i++){
  const {items}=await(await pdf.getPage(i)).getTextContent();
  const text=fields.pdfText(items);
  assert.equal(characters(text),characters(items.map(x=>x.str||'').join('')),'PDF characters lost');
  pages.push(text);
}
const text=pages.join('\n'),groups=fields.classify(text);
const counts=Object.fromEntries([...new Set(groups.map(x=>x.title))].map(t=>[t,groups.filter(x=>x.title===t).length]));
assert.equal(counts['教育背景'],2);assert.equal(counts['工作经历'],2);
assert.equal(counts['项目经历'],3);assert.equal(counts['AI 实践'],3);assert.equal(counts['校园经历'],2);
const basic=groups.find(x=>x.title==='基本信息').data.fields;
assert.equal(basic.email,text.match(/[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}/)[0]);
assert.ok(basic.name&&basic.phone&&basic.wechat);
for(const g of groups.filter(x=>['工作经历','项目经历','校园经历'].includes(x.title))){
  assert.ok(g.data.fields.period&&g.data.fields.role);
  assert.ok(g.data.fields.company||g.data.fields.project);
}
const headings=/^(教育背景|实习经历|项目经历|AI能力与智能体实践|校园经历|专业技能|个人优势)$/;
const contentLines=text.split('\n').map(x=>x.trim()).filter(x=>x&&!headings.test(x.replace(/\s/g,'')));
assert.equal(characters(groups.map(x=>x.content).join('')),characters(contentLines.join('')),'Section content lost');
console.log(JSON.stringify({pages:pdf.numPages,modules:counts,contactFieldsVerified:true,allSourceCharactersRetained:true}));
await pdf.destroy();
