const canvas=document.querySelector('#view'),ctx=canvas.getContext('2d'),film=document.querySelector('#film'),loading=document.querySelector('#loading'),range=document.querySelector('#reveal'),amount=document.querySelector('#amount');
const configs={coast:{w:960,h:540,fps:24},court:{w:960,h:540,fps:2},rings:{w:540,h:960,fps:2}};
let ringContours=null,ringWheel=null,shuttle=null,courtContours=null,courtNet=null;
let presentedTime=0;
if('requestVideoFrameCallback' in film){const frameClock=(_now,meta)=>{presentedTime=meta.mediaTime;film.requestVideoFrameCallback(frameClock)};film.requestVideoFrameCallback(frameClock)}
const videoTime=()=>('requestVideoFrameCallback' in film?presentedTime:film.currentTime);
let name='court',cfg=configs.court,boxes=[],cells=[],generation=0,ready=false,last=0;const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
function poly(points){ctx.beginPath();points.forEach(([x,y],i)=>i?ctx.lineTo(x*cfg.w,y*cfg.h):ctx.moveTo(x*cfg.w,y*cfg.h));ctx.closePath()}
function slice(rect,alpha=1){ctx.save();ctx.globalAlpha=alpha;ctx.beginPath();ctx.rect(rect[0]*cfg.w,rect[1]*cfg.h,rect[2]*cfg.w,rect[3]*cfg.h);ctx.clip();ctx.drawImage(film,0,0,cfg.w,cfg.h);ctx.restore()}
function ground(b){
 const [x,y,w,h]=b, foot=y+h, horizon=.42, vx=.48;
 const back=Math.max(horizon+.025,foot-.006),front=back+Math.min(.045,h*.18);
 const half=Math.max(w*.62,.02),center=x+w/2;
 const scale=(front-horizon)/(back-horizon);
 const left=vx+(center-half-vx)*scale,right=vx+(center+half-vx)*scale;
 ctx.save();poly([[center-half,back],[center+half,back],[right,front],[left,front]]);
 ctx.clip();ctx.drawImage(film,0,0,cfg.w,cfg.h);ctx.restore();
}
function drawWheel(){
 if(!ringWheel)return;
 const f=Math.max(0,(videoTime()-.25)*2),i=Math.min(44,Math.floor(f));
 const a=ringWheel[i],b=ringWheel[Math.min(44,i+1)];
 if(a)slice(b?lerp(a,b,f-i):a);
}
function drawCourt(){
 if(!courtContours)return;
 const i=Math.min(courtContours.frames.length-1,Math.floor(videoTime()*courtContours.fps));
 const people=courtContours.frames[i].filter(person=>{const xs=person.points.map(p=>p[0]);return (Math.min(...xs)+Math.max(...xs))/2>.105});
 // A small floor plane under the feet; bodies use their own contour masks.
 for(const person of people){
  const [cx,foot,width,height]=person.foot;
  const horizon=.34,vx=.55,back=foot-.007,front=foot+Math.min(.032,height*.12);
  const k=(front-horizon)/Math.max(.055,back-horizon),half=width/2;
  ctx.save();poly([[cx-half,back],[cx+half,back],[vx+(cx+half-vx)*k,front],[vx+(cx-half-vx)*k,front]]);ctx.clip();ctx.drawImage(film,0,0,cfg.w,cfg.h);ctx.restore();
 }
 for(const person of people){ctx.save();poly(person.points);ctx.clip();ctx.drawImage(film,0,0,cfg.w,cfg.h);ctx.restore()}
}
function drawShuttle(){
 if(!shuttle)return;
 const i=Math.min(shuttle.frames.length-1,Math.round(videoTime()*shuttle.fps));
 const points=shuttle.frames[i];if(!points?.length)return;
 ctx.save();poly(points);ctx.clip();ctx.drawImage(film,0,0,cfg.w,cfg.h);ctx.restore();
}
function ringsSubject(){
 if(!ringContours)return;
 const frame=Math.min(ringContours.frames.length-1,Math.max(0,Math.round(videoTime()*ringContours.fps-.5)));
 const points=ringContours.frames[frame];if(!points?.length)return;
 ctx.save();poly(points);ctx.clip();ctx.drawImage(film,0,0,cfg.w,cfg.h);ctx.restore();
}
function lerp(a,b,t){return a.map((v,i)=>v+(b[i]-v)*t)}
function tracked(){if(!boxes.length)return [];let f=videoTime()*cfg.fps,i=Math.min(Math.floor(f),boxes.length-1),t=f-i;if(name==='coast')return [lerp(boxes[i],boxes[Math.min(i+1,boxes.length-1)],t)];let a=boxes[i],b=boxes[Math.min(i+1,boxes.length-1)];return a.map(r=>{let nearest=b.reduce((best,v)=>{const d=Math.hypot(v[0]+v[2]/2-r[0]-r[2]/2,v[1]+v[3]/2-r[1]-r[3]/2);return d<best.d?{d,v}:best},{d:.13,v:r});return lerp(r,nearest.v,t)})}
function key(keys,t){let i=keys.findIndex(k=>k[0]>t);if(i<0)return keys.at(-1).slice(1);if(i===0)return keys[0].slice(1);return lerp(keys[i-1].slice(1),keys[i].slice(1),(t-keys[i-1][0])/(keys[i][0]-keys[i-1][0]))}
const sparkle=document.createElement('canvas');sparkle.width=480;sparkle.height=270;const sc=sparkle.getContext('2d',{willReadFrequently:true});let sparkleTime=-1;
function glints(){if(Math.abs(videoTime()-sparkleTime)>.05){sc.clearRect(0,0,480,270);sc.drawImage(film,0,0,480,270);let image=sc.getImageData(0,0,480,270),d=image.data;for(let y=0;y<270;y++)for(let x=0;x<480;x++){let i=(y*480+x)*4,l=d[i]*.299+d[i+1]*.587+d[i+2]*.114;d[i+3]=(x>165&&x<300&&y<205)?Math.max(0,Math.min(170,(l-246)*23)):0;}sc.putImageData(image,0,0);sparkleTime=videoTime()}ctx.drawImage(sparkle,0,0,cfg.w,cfg.h)}
function courtPlayers(){const t=Math.min(1,videoTime()/8);return [[[.64,.46,.075,.26],[.735,.48,.10,.41]],[[.69,.45,.065,.22],[.82,.46,.085,.37]],[[.61,.47,.055,.19],[.715,.48,.063,.29]]].map(([a,b])=>lerp(a,b,t))}
function courtContextClip(){ctx.beginPath();const people=[...tracked(),...courtPlayers()];for(const [x,y,w,h] of people){ctx.rect((x-.022)*cfg.w,(y-.008)*cfg.h,(w+.044)*cfg.w,(h+.062)*cfg.h)}ctx.rect(.26*cfg.w,.49*cfg.h,.49*cfg.w,.11*cfg.h);ctx.clip()}
function base(){const people=tracked();if(name==='coast'){glints();ctx.save();poly([[.56,.83],[.76,.75],[.88,.94],[.62,.993]]);ctx.clip();ctx.drawImage(film,0,0,cfg.w,cfg.h);ctx.restore();}
if(name==='court'){drawCourt();drawShuttle();return;}
if(name==='rings'){ringsSubject();drawWheel();return;}
for(const b of people){const pad=name==='coast'?.012:.008;slice([b[0]-pad,b[1]-pad,b[2]+pad*2,b[3]+pad*2]);if(name!=='coast')ground(b);}}
function updateAmount(){let n=cells.filter(c=>c.target).length;range.value=Math.round(n/cells.length*100);amount.textContent=String(range.value).padStart(2,'0')+'%';canvas.dataset.revealed=n}
function reset(){cells.forEach(c=>{c.a=0;c.target=0});updateAmount()}
async function select(next){let g=++generation;name=next;cfg=configs[name];ready=false;boxes=[];loading.hidden=false;loading.textContent='载入中';canvas.dataset.ready='false';canvas.width=cfg.w;canvas.height=cfg.h;cells=[];for(let y=0;y<6;y++)for(let x=0;x<10;x++)cells.push({x:x/10,y:y/6,w:.1,h:1/6,a:0,target:0});reset();document.querySelectorAll('button[data-scene]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.scene===name)));film.pause();presentedTime=0;film.src=`assets/${name}.mp4`;film.load();sparkleTime=-1;try{let response=await fetch(`assets/${name}-boxes.json`);if(!response.ok)throw Error('box file');let data=await response.json();if(next==='court'&&!shuttle){shuttle=await (await fetch('assets/court-shuttle.json')).json();courtContours=await (await fetch('assets/court-contours.json')).json();courtNet=await (await fetch('assets/court-net.json')).json()}if(next==='rings'&&!ringContours){const masks=await fetch('assets/rings-contours.json');if(!masks.ok)throw Error('contour file');ringContours=await masks.json();ringWheel=await (await fetch('assets/rings-wheel.json')).json()}if(g!==generation)return;boxes=data;if(!reduced)film.play().catch(()=>{loading.textContent='点击播放'});}catch(e){loading.textContent='素材读取失败，请刷新'}}
function draw(time){const dt=Math.min((time-last)/1000,.06);last=time;if(film.readyState>=2&&boxes.length){ctx.fillStyle='#050505';ctx.fillRect(0,0,cfg.w,cfg.h);base();for(const c of cells){c.a+=(c.target-c.a)*Math.min(1,dt*6);if(c.a>.001){ctx.save();slice([c.x,c.y,c.w,c.h],c.a);ctx.restore()}}if(!ready){ready=true;loading.hidden=true;canvas.dataset.ready='true';canvas.dataset.scene=name}}requestAnimationFrame(draw)}
function point(e){const r=canvas.getBoundingClientRect(),x=(e.clientX-r.left)/r.width,y=(e.clientY-r.top)/r.height;for(const c of cells)if(x>=c.x&&x<c.x+c.w&&y>=c.y&&y<c.y+c.h)c.target=1;updateAmount()}
canvas.addEventListener('pointermove',point);canvas.addEventListener('pointerdown',e=>{canvas.setPointerCapture(e.pointerId);point(e)});range.oninput=()=>{const n=Math.round(+range.value*.6);[...cells].sort((a,b)=>Math.hypot(a.x-.6,a.y-.6)-Math.hypot(b.x-.6,b.y-.6)).forEach((c,i)=>c.target=+(i<n));updateAmount()};document.querySelector('#all').onclick=()=>{cells.forEach(c=>c.target=1);updateAmount()};document.querySelector('#reset').onclick=reset;document.querySelectorAll('button[data-scene]').forEach(b=>b.onclick=()=>select(b.dataset.scene));const play=document.querySelector('#play');play.onclick=()=>film.paused?film.play().catch(()=>{}):film.pause();function sync(){play.textContent=film.paused?'▷':'Ⅱ';play.setAttribute('aria-label',film.paused?'Play video':'Pause video')}film.onplay=sync;film.onpause=sync;film.onerror=()=>{loading.hidden=false;loading.textContent='视频载入失败，请刷新'};select('court');requestAnimationFrame(draw);
