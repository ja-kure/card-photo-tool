const all=(n,k)=>[...n.getElementsByTagNameNS('*',k)];
export function loosePptxRows(doc){
 const blocks=all(doc,'sp').map(sp=>{const text=all(sp,'t').map(t=>t.textContent).join(' ').normalize('NFKC').trim(),off=all(sp,'off')[0];return {text,x:Number(off?.getAttribute('x')||0),y:Number(off?.getAttribute('y')||0)};}).filter(b=>b.text);
 const numbers=[],names=[],dates=[];
 for(const b of blocks){
  const dm=b.text.match(/(?:\d{4}[年./-]\d{1,2}[月./-]\d{1,2}日?)/);if(dm)dates.push({...b,value:dm[0]});
  if(dm)continue;
  const nm=b.text.match(/\b[A-Za-z]*\d{3,}[A-Za-z0-9-]*\b/);if(nm){const rest=b.text.replace(nm[0],'').replace(dm?.[0]||'\u0000','').replace(/(?:認定番号|番号|氏名|名前|認定日|日付|인증번호|이름|날짜)\s*[:：]?/g,'').trim();numbers.push({...b,value:nm[0],inline:rest});}
  else if(!dm&&/^[\p{L}\p{M}\s・·.]+$/u.test(b.text))names.push(b);
 }
 const used=new Set();return numbers.map(n=>{let name=n.inline;if(!name){const candidates=names.filter(b=>!used.has(b)).sort((a,b)=>(Math.abs(a.x-n.x)*3+Math.abs(a.y-n.y))-(Math.abs(b.x-n.x)*3+Math.abs(b.y-n.y)));const b=candidates[0];if(b){name=b.text;used.add(b);}}
 const dt=dates.slice().sort((a,b)=>(Math.abs(a.x-n.x)*3+Math.abs(a.y-n.y))-(Math.abs(b.x-n.x)*3+Math.abs(b.y-n.y)))[0];const row=[n.value,name||'',dt?.value||'',dates.filter(d=>d!==dt).sort((a,b)=>Math.abs(a.x-n.x)-Math.abs(b.x-n.x))[0]?.value||''];row.anchor={x:n.x,y:n.y};return {x:n.x,y:n.y,row};}).sort((a,b)=>Math.abs(a.y-b.y)<800000?a.x-b.x:a.y-b.y).map(n=>n.row);
}

export async function photoPreviews(doc,zip,slide,rows){
 const rel=zip.file(slide.replace('slides/','slides/_rels/')+'.rels');if(!rel)return rows.map(()=>null);
 const relationships=new DOMParser().parseFromString(await rel.async('string'),'application/xml');
 const pics=all(doc,'pic').map(p=>{const off=all(p,'off')[0],ext=all(p,'ext')[0],blip=all(p,'blip')[0];return {x:Number(off?.getAttribute('x')||0)+Number(ext?.getAttribute('cx')||0)/2,y:Number(off?.getAttribute('y')||0)+Number(ext?.getAttribute('cy')||0)/2,id:blip?.getAttributeNS('http://schemas.openxmlformats.org/officeDocument/2006/relationships','embed')};});
 const used=new Set();return Promise.all(rows.map(async row=>{if(!row.anchor)return null;const pic=pics.filter(p=>!used.has(p)).sort((a,b)=>(Math.abs(a.x-row.anchor.x)*3+Math.abs(a.y-row.anchor.y))-(Math.abs(b.x-row.anchor.x)*3+Math.abs(b.y-row.anchor.y)))[0];if(!pic)return null;used.add(pic);
 const rel=all(relationships,'Relationship').find(r=>r.getAttribute('Id')===pic.id&&r.getAttribute('TargetMode')!=='External');if(!rel)return null;
 const path=new URL(rel.getAttribute('Target'),'https://pptx.invalid/'+slide).pathname.slice(1),entry=zip.file(path),type={png:'image/png',jpeg:'image/jpeg',jpg:'image/jpeg',webp:'image/webp'}[path.split('.').pop().toLowerCase()];if(!entry||!type||entry._data.uncompressedSize>25e6)return null;return URL.createObjectURL(new Blob([await entry.async('uint8array')],{type}));
 }));
}
