import {rememberOrder} from './order-transfer.js';
import {extractPhotos} from './pptx-photos.js';
import {detectFaces} from './face.js';
const $=id=>document.getElementById(id), items=[];let selected=-1, loading=false;
const current=()=>items[selected];
function crop(s){const r=s.ratio,w=s.img.naturalWidth,h=s.img.naturalHeight;let cw=Math.min(w,h*r)/s.zoom,ch=cw/r;return {x:(w-cw)*s.x,y:(h-ch)*s.y,w:cw,h:ch};}
function render(target=$('canvas'),guides=$('guides').checked){const s=current();if(!s)return;target.width=600;target.height=Math.round(600/s.ratio);const c=target.getContext('2d'),b=crop(s);c.fillStyle='#fff';c.fillRect(0,0,target.width,target.height);c.drawImage(s.img,b.x,b.y,b.w,b.h,0,0,target.width,target.height);if(s.light!==100){const pixels=c.getImageData(0,0,target.width,target.height),lut=Array.from({length:256},(_,i)=>toneValue(i,s.light));for(let i=0;i<pixels.data.length;i+=4){pixels.data[i]=lut[pixels.data[i]];pixels.data[i+1]=lut[pixels.data[i+1]];pixels.data[i+2]=lut[pixels.data[i+2]];}c.putImageData(pixels,0,0);}if(guides){c.strokeStyle='rgba(255,255,255,.8)';c.lineWidth=2;c.setLineDash([9,8]);[.35,.66].forEach(y=>{c.beginPath();c.moveTo(0,target.height*y);c.lineTo(target.width,target.height*y);c.stroke()});c.beginPath();c.moveTo(300,0);c.lineTo(300,target.height);c.stroke();} $('dimensions').textContent=`${target.width} × ${target.height} px`;$('resolution').textContent=b.w<600?'원본 크롭 영역이 작아 확대됩니다. 새 디테일이 복원되지는 않습니다.':'원본에서 크롭한 영역을 출력 크기로 맞춥니다.';}
function sync(){const s=current();$('workspace').hidden=!s;$('drop').hidden=!!s;if(!s)return;$('original').src=s.url;for(const [id,key] of [['zoom','zoom'],['posX','x'],['posY','y'],['light','light'],['ratio','ratio']])$(id).value=s[key];$('zoomNumber').value=s.zoom.toFixed(2);$('rotationValue').textContent=(s.rotation||0)+'°';$('zoomValue').textContent=s.zoom.toFixed(2)+'×';$('lightValue').textContent=(s.light===100?'원본':(s.light>100?'+':'')+(s.light-100));$('status').textContent=s.status;$('count').textContent=`${items.length}장의 사진 · ${selected+1}번째 편집 중`;render();queue();}
function queue(){$('queue').replaceChildren();items.forEach((s,i)=>{const b=document.createElement('button');b.className='thumb'+(i===selected?' active':'');const im=document.createElement('img');im.src=s.url;im.alt='';const t=document.createElement('span');t.textContent=s.name;b.append(im,t);b.onclick=()=>{selected=i;sync()};$('queue').append(b)})}
function auto(s){if(s.faces.length!==1){s.status=s.faces.length?'얼굴이 여러 개입니다. 원하는 인물을 직접 맞춰 주세요.':'얼굴을 찾지 못했습니다. 위치와 확대를 직접 조절해 주세요.';return;}
const fit=fitFace(s.faces[0],s.img.naturalWidth,s.img.naturalHeight,s.ratio);Object.assign(s,{zoom:fit.zoom,x:fit.x,y:fit.y});
s.status=(fit.precise?'눈높이 35% · 턱 위치 66% 기준으로 맞췄습니다.':'특징점이 부족해 얼굴 상자로 구도를 추정했습니다.')+(fit.limited?' 원본 가장자리가 부족해 목표 구도를 완전히 맞출 수 없습니다.':'')+' 머리 여백은 확인해 주세요.';}
function brighten(s){
 if(s.faces.length!==1)return;
 const f=s.faces[0],c=document.createElement('canvas');c.width=120;c.height=120;const ctx=c.getContext('2d');
 ctx.drawImage(s.img,(f.x+f.w*.2)*s.img.naturalWidth,(f.y+f.h*.25)*s.img.naturalHeight,f.w*.6*s.img.naturalWidth,f.h*.65*s.img.naturalHeight,0,0,120,120);
 const pixels=ctx.getImageData(0,0,120,120).data,values=[];
 for(let i=0;i<pixels.length;i+=4)values.push(.2126*pixels[i]+.7152*pixels[i+1]+.0722*pixels[i+2]);
 s.light=autoLevel(values);s.status+=s.light>100?' 얼굴 밝기를 분석해 중간톤을 밝게 보정했습니다.':' 얼굴 밝기를 분석해 원래 밝기를 유지했습니다.';
}
async function add(files){if(loading)return;loading=true;$('zip').disabled=true;let errors=[];const expanded=[];for(const f of files){try{if(/\.pptx$/i.test(f.name)){const photos=await extractPhotos(f);try{await rememberOrder(f);}catch{errors.push('주문표로 파일을 전달하지 못했습니다. 주문표 화면에서 다시 넣어 주세요.');}expanded.push(...photos);}else expanded.push(f);}catch(e){errors.push(f.name+': '+e.message);}}for(const file of expanded){if(!['image/jpeg','image/png','image/webp'].includes(file.type)){errors.push(file.name+': JPG·PNG·WebP만 지원합니다.');continue;}if(file.size>25e6){errors.push(file.name+': 25MB 이하의 사진을 넣어 주세요.');continue;}const url=URL.createObjectURL(file),img=new Image();img.src=url;try{await img.decode();if(img.naturalWidth*img.naturalHeight>50e6)throw Error('사진이 너무 큽니다.');const s={name:file.name,url,img,source:img,rotation:0,ratio:.75,zoom:1,x:.5,y:.5,light:100,faces:[],status:'얼굴 위치를 분석하고 있습니다…'};items.push(s);selected=items.length-1;sync();const temp=document.createElement('canvas'),scale=Math.min(1,1200/Math.max(img.naturalWidth,img.naturalHeight));temp.width=Math.round(img.naturalWidth*scale);temp.height=Math.round(img.naturalHeight*scale);temp.getContext('2d').drawImage(img,0,0,temp.width,temp.height);try{s.faces=await detectFaces(temp);auto(s);brighten(s);}catch{s.status='자동 분석에 실패했습니다. 수동 조절은 사용할 수 있습니다.';}sync();}catch{URL.revokeObjectURL(url);errors.push(file.name+': 사진을 열 수 없습니다. 크기와 형식을 확인해 주세요.');}}loading=false;$('zip').disabled=false;$('files').value='';if(errors.length)alert(errors.join('\n'));}
$('files').onchange=e=>add(e.target.files);$('drop').onclick=()=>$('files').click();$('drop').onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();$('files').click()}};document.addEventListener('dragover',e=>{e.preventDefault();$('drop').classList.add('drag')});document.addEventListener('dragleave',()=> $('drop').classList.remove('drag'));document.addEventListener('drop',e=>{e.preventDefault();$('drop').classList.remove('drag');add(e.dataTransfer.files)});
for(const [id,key]of [['zoom','zoom'],['posX','x'],['posY','y'],['light','light'],['ratio','ratio']])$(id).oninput=()=>{const s=current();s[key]=Number($(id).value);if(id==='ratio')auto(s);sync()};$('guides').onchange=()=>render();$('auto').onclick=()=>{auto(current());sync()};$('reset').onclick=()=>{Object.assign(current(),{zoom:1,x:.5,y:.5,light:100,fineRotation:0,status:'원본 중심 구도로 초기화했습니다.'});sync()};$('remove').onclick=()=>{if(loading)return;URL.revokeObjectURL(current().url);items.splice(selected,1);selected=Math.min(selected,items.length-1);sync()};
let drag=null;$('canvas').onpointerdown=e=>{const s=current(),b=crop(s);drag={px:e.clientX,py:e.clientY,x:s.x,y:s.y,b};e.target.setPointerCapture(e.pointerId)};$('canvas').onpointermove=e=>{if(!drag)return;const s=current(),rect=e.target.getBoundingClientRect();s.x=Math.max(0,Math.min(1,drag.x-(e.clientX-drag.px)/rect.width*drag.b.w/(s.img.naturalWidth-drag.b.w||1)));s.y=Math.max(0,Math.min(1,drag.y-(e.clientY-drag.py)/rect.height*drag.b.h/(s.img.naturalHeight-drag.b.h||1)));sync()};$('canvas').onpointerup=$('canvas').onpointercancel=()=>drag=null;
function exportCanvas(){const c=document.createElement('canvas');render(c,false);return c;}function filename(s){return s.name.replace(/\.[^.]+$/,'')+'_card.png'}function download(blob,name){const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),10000)}
$('save').onclick=()=>{const name=filename(current());exportCanvas().toBlob(b=>download(b,name),'image/png')};$('zip').onclick=async()=>{if(loading)return;$('zip').disabled=true;const previous=selected;try{const data=items.map((s,i)=>{selected=i;return {name:filename(s),data:exportCanvas().toDataURL('image/png').split(',')[1]}});selected=previous;sync();const zip=new JSZip();for(const f of data)zip.file(f.name,f.data,{base64:true});download(await zip.generateAsync({type:'blob'}),'card-photos.zip');}catch{alert('ZIP 저장에 실패했습니다. 개별 다운로드를 사용해 주세요.')}finally{selected=previous;sync();$('zip').disabled=false}};

$('autoLight').onclick=()=>{brighten(current());sync()};

function setZoom(value){const s=current();if(!s||!Number.isFinite(value))return;s.zoom=Math.max(.5,Math.min(20,Math.round(value*100)/100));sync();}
$('zoomOut').onclick=()=>setZoom(current().zoom-.05);
$('zoomIn').onclick=()=>setZoom(current().zoom+.05);
$('zoomNumber').onchange=()=>setZoom(Number($('zoomNumber').value));
async function rotatePhoto(delta){
 if(loading||!current())return;loading=true;const s=current();$('rotateLeft').disabled=$('rotateRight').disabled=$('zip').disabled=true;
 try{
 const angle=((s.rotation||0)+delta+360)%360,src=s.source,c=document.createElement('canvas');
 c.width=angle%180?src.naturalHeight:src.naturalWidth;c.height=angle%180?src.naturalWidth:src.naturalHeight;
 const ctx=c.getContext('2d');ctx.translate(c.width/2,c.height/2);ctx.rotate(angle*Math.PI/180);ctx.drawImage(src,-src.naturalWidth/2,-src.naturalHeight/2);
 const blob=await new Promise(resolve=>c.toBlob(resolve,'image/png'));if(!blob)throw Error();const url=URL.createObjectURL(blob),img=new Image();
 try{img.src=url;await img.decode();}finally{URL.revokeObjectURL(url);}
 s.img=img;s.rotation=angle;s.zoom=1;s.x=s.y=.5;s.faces=[];s.status='회전했습니다. 위치와 확대를 조절하세요.';
 const temp=document.createElement('canvas'),scale=Math.min(1,1200/Math.max(c.width,c.height));temp.width=Math.round(c.width*scale);temp.height=Math.round(c.height*scale);temp.getContext('2d').drawImage(img,0,0,temp.width,temp.height);
 try{s.faces=await detectFaces(temp);auto(s);}catch{s.status='회전했습니다. 자동 분석에 실패해 수동으로 구도를 맞춰 주세요.';}
 sync();
 }catch{alert('회전하지 못했습니다. 다시 시도해 주세요.');}
 finally{loading=false;$('rotateLeft').disabled=$('rotateRight').disabled=$('zip').disabled=false;}
}
$('rotateLeft').onclick=()=>rotatePhoto(-90);$('rotateRight').onclick=()=>rotatePhoto(90);


