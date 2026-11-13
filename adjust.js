function faceAnchors(f) {
 const eyes=[...(f.leftEye||[]),...(f.rightEye||[])], contour=f.contour||[];
 if(eyes.length && contour.length){return {eyeX:eyes.reduce((a,p)=>a+p.x,0)/eyes.length,eyeY:eyes.reduce((a,p)=>a+p.y,0)/eyes.length,chinY:Math.max(...contour.map(p=>p.y)),precise:true};}
 return {eyeX:f.x+f.w/2,eyeY:f.y+f.h*.36,chinY:f.y+f.h,precise:false};
}
function fitFace(f,w,h,ratio) {
 const a=faceAnchors(f), desiredH=(a.chinY-a.eyeY)*h/.31, baseW=Math.min(w,h*ratio);
 const zoom=Math.max(1,Math.min(20,baseW/(desiredH*ratio))),cw=baseW/zoom,ch=cw/ratio;
 const rawX=a.eyeX*w-cw/2,rawY=a.eyeY*h-ch*.35;
 const x=Math.max(0,Math.min(w-cw,rawX)),y=Math.max(0,Math.min(h-ch,rawY));
 return {zoom,x:x/(w-cw||1),y:y/(h-ch||1),limited:Math.abs(ch-desiredH)>1||Math.abs(x-rawX)>1||Math.abs(y-rawY)>1,precise:a.precise};
}
function toneValue(v,level){return Math.round(255*Math.pow(v/255,100/level));}
function autoLevel(values){
 if(!values.length)return 100;
 const sorted=values.slice().sort((a,b)=>a-b),median=sorted[Math.floor(sorted.length*.5)]/255;
 if(median>=.56||median<=.025)return 100;
 return Math.round(Math.min(145,Math.max(100,100*Math.log(median)/Math.log(.56))));
}
