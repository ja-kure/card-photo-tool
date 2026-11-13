import {takeOrder} from './order-transfer.js';
import {importOrder,date} from './importer.js';
const $=id=>document.getElementById(id);let sourceName='', revision=null, dirty=false;
for(let i=0;i<20;i++){const tr=document.createElement('tr');let no=document.createElement('td');no.textContent=i+1;tr.append(no);const photo=document.createElement('td');photo.className='person-photo';tr.append(photo);for(let j=0;j<4;j++){let td=document.createElement('td'),input=document.createElement('input');input.type='text';input.setAttribute('aria-label',`${i+1}번 ${['인증번호','이름','인증일','만료일·갱신일'][j]}`);input.placeholder=j>=2?'YYYY.MM.DD':'';input.oninput=()=>{dirty=true;$('result').hidden=true;};const copy=document.createElement('button');copy.textContent='복사';copy.type='button';copy.className='copy-field';copy.setAttribute('aria-label',`${i+1}번 ${['인증번호','이름','인증일','만료일·갱신일'][j]} 복사`);copy.onclick=async()=>{try{if(j>=2)input.value=date(input.value);await navigator.clipboard.writeText(input.value);copy.textContent='복사됨';setTimeout(()=>copy.textContent='복사',1200);}catch{$('importStatus').textContent='복사 권한을 확인해 주세요.';}};if(j>=2)input.onchange=()=>input.value=date(input.value);td.append(input,copy);tr.append(td);}$('people').append(tr);}
function readRows(){return [...$('people').rows].map(tr=>[...tr.querySelectorAll('input')].map(x=>x.value.trim()));}
function setRows(rows){[...$('people').rows].forEach((tr,i)=>[...tr.querySelectorAll('input')].forEach((input,j)=>input.value=rows[i]?.[j]||''));$('result').hidden=true;}
let importing=false;
async function loadOrder(file){if(!file||importing)return;if(dirty&&!confirm('현재 수정한 주문표를 새 파일 내용으로 바꿀까요?'))return;importing=true;$('importStatus').textContent='파일을 읽고 있습니다…';try{if(file.size>25000000)throw Error('25MB 이하 파일을 넣어 주세요.');const d=await importOrder(file);sourceName=file.name;setRows(d.rows);[...$('people').rows].forEach((tr,i)=>{const cell=tr.querySelector('.person-photo');for(const im of cell.querySelectorAll('img'))URL.revokeObjectURL(im.src);cell.replaceChildren();if(d.previews?.[i]){const im=document.createElement('img');im.src=d.previews[i];im.alt=(i+1)+'번 위치 기반 사진 후보';im.title='위치로 추정한 사진입니다. 얼굴 매칭을 확인하세요.';cell.append(im);}});dirty=true;$('raw').textContent=d.text;$('importStatus').textContent=`${file.name}: ${d.rows.length}명 추출. `+d.warnings.join(' ');}catch(e){$('importStatus').textContent=e.message;}finally{importing=false;$('customer').value='';}}
$('customer').onchange=()=>loadOrder($('customer').files[0]);
const drop=$('orderDrop');
for(const event of ['dragenter','dragover'])drop.addEventListener(event,e=>{e.preventDefault();drop.classList.add('drag');});
drop.addEventListener('dragleave',()=>drop.classList.remove('drag'));
drop.addEventListener('drop',e=>{e.preventDefault();drop.classList.remove('drag');if(e.dataTransfer.files.length!==1){$('importStatus').textContent='주문 파일은 한 번에 하나씩 넣어 주세요.';return;}loadOrder(e.dataTransfer.files[0]);});
window.addEventListener('dragover',e=>e.preventDefault());window.addEventListener('drop',e=>e.preventDefault());
takeOrder().then(file=>{if(file)loadOrder(file);}).catch(()=>{$('importStatus').textContent='사진 편집에서 파일을 이어받지 못했습니다. 여기에 직접 넣어 주세요.';});
$('make').onclick=async()=>{try{
  $('status').textContent='문자 치환 파일을 만들고 있습니다…';
  const rows=readRows().map(r=>[r[0],r[1],date(r[2])]);if(!rows.some(r=>r.some(Boolean)))throw Error('치환할 정보가 없습니다.');if(rows.some(r=>r.some(Boolean)&&r.some(v=>!v)))throw Error('입력한 행의 세 항목을 모두 채워 주세요.');
  const response=await fetch('./text-replace.jsx');if(!response.ok)throw Error('스크립트 템플릿을 읽지 못했습니다.');const template=await response.text();
  const script=template.replace('/*ROWS*/',JSON.stringify(rows));if($('download').href.startsWith('blob:'))URL.revokeObjectURL($('download').href);$('download').href=URL.createObjectURL(new Blob(['\uFEFF'+script],{type:'application/octet-stream'}));$('result').hidden=false;
  $('status').textContent='현재 표의 정보로 만들었습니다. 아래 파일을 다운로드하세요.';
}catch(e){$('status').textContent=e.message;}};
