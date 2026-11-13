const nodes=(n,k)=>[...n.getElementsByTagNameNS('*',k)];
const parse=s=>new DOMParser().parseFromString(s,'application/xml');
export async function extractPhotos(file){
 if(file.size>50e6)throw Error('PPTX는 50MB 이하로 넣어 주세요.');
 const zip=await JSZip.loadAsync(await file.arrayBuffer());
 const slides=Object.keys(zip.files).filter(n=>/^ppt\/slides\/slide\d+\.xml$/.test(n)).sort((a,b)=>+a.match(/slide(\d+)/)[1]-+b.match(/slide(\d+)/)[1]);
 if(slides.length>100)throw Error('PPTX를 100슬라이드 이하로 나눠 주세요.');
 const result=[],seen=new Set();let total=0;
 for(const slide of slides){
  const relPath=slide.replace('slides/','slides/_rels/')+'.rels',rels=zip.file(relPath);if(!rels)continue;
  const map=new Map(nodes(parse(await rels.async('string')),'Relationship').filter(r=>r.getAttribute('TargetMode')!=='External').map(r=>[r.getAttribute('Id'),r.getAttribute('Target')]));
  const doc=parse(await zip.file(slide).async('string'));let index=0;
  for(const pic of nodes(doc,'pic')){
   index++;const blip=nodes(pic,'blip')[0];if(!blip)continue;
   const target=map.get(blip.getAttributeNS('http://schemas.openxmlformats.org/officeDocument/2006/relationships','embed'));if(!target)continue;
   const path=new URL(target,'https://pptx.invalid/'+slide).pathname.slice(1);if(seen.has(path))continue;seen.add(path);
   const entry=zip.file(path);if(!entry)continue;
   const ext=path.split('.').pop().toLowerCase(),type={png:'image/png',jpg:'image/jpeg',jpeg:'image/jpeg',webp:'image/webp'}[ext];if(!type)continue;
   total+=entry._data.uncompressedSize;if(total>150e6||result.length>=100)throw Error('사진이 너무 많거나 큽니다. PPTX를 나누어 주세요.');
   const no=slide.match(/slide(\d+)/)[1];result.push(new File([await entry.async('uint8array')],`slide${no}_photo${index}.${ext}`,{type}));
  }
 }if(!result.length)throw Error('개별 JPG·PNG·WebP 사진을 찾지 못했습니다.');return result;
}
