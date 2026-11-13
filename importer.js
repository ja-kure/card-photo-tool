import {loosePptxRows,photoPreviews} from './pptx-fields.js';
import * as pdfjs from './vendor/pdf.mjs';
pdfjs.GlobalWorkerOptions.workerSrc=new URL('./vendor/pdf.worker.mjs',import.meta.url).href;
const clean=v=>String(v??'').normalize('NFKC').trim();
export const date=v=>clean(v).replace(/(\d{4})[年./-](\d{1,2})[月./-](\d{1,2})日?/,(_,y,m,d)=>`${y}.${m.padStart(2,'0')}.${d.padStart(2,'0')}`);
export function matrixRows(matrix){
 const aliases=[['認定番号','認証番号','会員番号','인증번호'],['氏名','名前','姓名','이름'],['認定日','認証日','인증일','発行日','발급일','날짜','日付'],['有効期限','満了日','更新日','만료일','갱신일']];
 for(let i=0;i<Math.min(30,matrix.length);i++){
  const labels=matrix[i].map(v=>clean(v).replace(/\s/g,'')),cols=aliases.map(a=>labels.findIndex(v=>a.includes(v)));
  if(cols.slice(0,3).every(c=>c>=0))return matrix.slice(i+1).map(r=>cols.map(c=>clean(r[c]))).filter(r=>r.some(Boolean)).map(r=>[r[0],r[1],date(r[2]),date(r[3])]);
 }return [];
}
export function textRows(text){
 return text.split('\n').flatMap(line=>{const m=clean(line).match(/^(?:\d+\s+)?([A-Za-z]*\d{3,}[A-Za-z0-9-]*)\s+(.+?)\s+(\d{4}[年./-]\d{1,2}[月./-]\d{1,2}日?)(?:\s+(\d{4}[年./-]\d{1,2}[月./-]\d{1,2}日?))?\s*$/);return m?[[m[1],m[2].replace(/\s+/g,' '),date(m[3]),date(m[4])]]:[];});
}
const elements=(node,local)=>[...node.getElementsByTagNameNS('*',local)];
const xml=s=>{const d=new DOMParser().parseFromString(s,'application/xml');if(elements(d,'parsererror').length)throw Error('PPTX XML을 읽지 못했습니다.');return d;};
const paragraphs=node=>elements(node,'p').map(p=>elements(p,'t').map(t=>t.textContent).join('')).join('\n');
export async function importOrder(file){
 if(file.size>25e6)throw Error('25MB 이하 파일을 넣어 주세요.');
 const buf=await file.arrayBuffer(),ext=file.name.split('.').pop().toLowerCase();let rows=[],text='',inferred=false,previews=[];
 if(ext==='pdf'){
  const pdf=await pdfjs.getDocument({data:buf}).promise;if(pdf.numPages>50)throw Error('50페이지 이하로 나눠 주세요.');
  for(let i=1;i<=pdf.numPages;i++){const page=await pdf.getPage(i),content=await page.getTextContent();let line='',lastY=null;for(const item of content.items){if(!('str'in item))continue;const y=item.transform[5];if(lastY!==null&&Math.abs(lastY-y)>3){text+=line+'\n';line='';}line+=item.str+' ';lastY=y;if(item.hasEOL){text+=line+'\n';line='';lastY=null;}}text+=line+'\n';}rows=textRows(text);await pdf.destroy();
 }else if(ext==='pptx'){
  const zip=await JSZip.loadAsync(buf);const names=Object.keys(zip.files).filter(n=>/^ppt\/slides\/slide\d+\.xml$/.test(n)).sort((a,b)=>+a.match(/slide(\d+)/)[1]-+b.match(/slide(\d+)/)[1]);
  if(names.length>50)throw Error('슬라이드를 50장 이하로 나눠 주세요.');
  for(const name of names){const entry=zip.file(name);if(entry._data.uncompressedSize>5e6)throw Error('슬라이드 데이터가 너무 큽니다.');const doc=xml(await entry.async('string'));const tables=elements(doc,'tbl');let tableRows=[];for(const table of tables)tableRows.push(...matrixRows(elements(table,'tr').map(tr=>elements(tr,'tc').map(paragraphs))));
   const slideText=paragraphs(doc);text+=slideText+'\n';let found=tableRows.length?tableRows:textRows(slideText);if(!found.length){found=loosePptxRows(doc);inferred=true;}previews.push(...await photoPreviews(doc,zip,name,found));rows.push(...found);
  }
 }else if(['xlsx','xlsm','csv','tsv'].includes(ext)){
  const wb=XLSX.read(buf,{type:'array',cellDates:false});for(const name of wb.SheetNames){const sh=wb.Sheets[name];if(sh['!ref']&&XLSX.utils.decode_range(sh['!ref']).e.r>10000)throw Error('주문 부분만 별도 파일로 저장해 주세요.');const m=XLSX.utils.sheet_to_json(sh,{header:1,raw:false,defval:''});rows.push(...matrixRows(m));text+=m.map(r=>r.join(' ')).join('\n')+'\n';}
 }else throw Error('PDF·XLSX·CSV·TSV·PPTX를 넣어 주세요.');
 if(rows.length>20)throw Error(`${rows.length}명이 추출되었습니다. 20명 이하로 나눠 주세요.`);
 rows=rows.map(r=>[r[0],r[1],date(r[2]),date(r[3])]);return {rows,previews,text:text.slice(0,20000),warnings:rows.length?(inferred?['텍스트 위치로 이름·번호를 추정했습니다. 연결 순서를 확인하세요. 원문에 없는 날짜는 비워 두었습니다.']:[]):['주문 행을 찾지 못했습니다. 표의 認定番号·氏名·認定日 열 또는 원문을 확인해 주세요. 스캔·이미지는 자동 인식하지 않습니다.']};
}
