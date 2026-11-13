#target illustrator
(function(){
var rows=/*ROWS*/;
try{
 if(!app.documents.length)throw Error('먼저 카드 Illustrator 파일을 열어 주세요.');
 var d=app.activeDocument,l=d.layers.getByName('修正'),slots=[],i,t,b,cx,cy,c,r;
 for(i=0;i<20;i++)slots.push([]);
 var n=l.textFrames.length;
 for(i=0;i<n;i++){
  t=l.textFrames[i];b=t.geometricBounds;cx=(b[0]+b[2])/2;cy=(b[1]+b[3])/2;
  if(cy>-670||cy < -1410)continue;
  c=Math.round((cx+269.466)/272.31681);r=Math.round((-755.321-cy)/184.44639534);
  if(c<0||c>4||r<0||r>3)continue;
  slots[r*5+c].push(t);
 }
 for(i=0;i<20;i++){
  var fields=slots[i];
  fields.sort(function(a,b){return b.geometricBounds[1]-a.geometricBounds[1];});
  slots[i]=fields.length===3?{number:fields[0],name:fields[1],date:fields[2]}:{};
 }

 var changes=[];
 for(i=0;i<20;i++){
  if(!rows[i]||!rows[i][0]&&!rows[i][1]&&!rows[i][2])continue;
  if(!rows[i][0]||!rows[i][1]||!rows[i][2])throw Error((i+1)+'번의 인증번호·이름·인증일을 모두 입력하세요.');
  var s=slots[i];if(!s.number||!s.name||!s.date)throw Error((i+1)+'번 카드의 문자 3개를 찾지 못했습니다. 원래 20장 템플릿에서 실행하세요.');
  if(s.number.locked||s.name.locked||s.date.locked)throw Error('문자 오브젝트 잠금을 풀어 주세요.');
  changes.push({slot:s,row:rows[i]});
 }
 if(!changes.length)throw Error('치환할 정보가 없습니다.');
 var wasLocked=l.locked,wasVisible=l.visible;l.locked=false;l.visible=true;
 for(i=0;i<changes.length;i++){
  var a=changes[i];a.slot.number.contents=a.row[0].replace(/[0-9]/g,function(v){return String.fromCharCode(v.charCodeAt(0)+65248);});
  a.slot.name.contents=a.row[1];a.slot.date.contents=a.row[2];
 }
 l.locked=wasLocked;l.visible=wasVisible;
 alert(changes.length+'명 문자 치환 완료.\n사진·배경·카드 수·아트보드는 변경하지 않았습니다.\n글자 넘침을 확인하고 직접 저장하세요.');
}catch(e){alert('문자 치환 실패: '+e.message);}
})();
