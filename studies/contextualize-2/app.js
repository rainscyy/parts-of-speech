(async()=>{
await document.fonts.load('21px "Inknut Antiqua"');
const page=document.querySelector('#page'),canvas=document.querySelector('#paper'),ctx=canvas.getContext('2d'),marks=document.querySelector('#marks'),poem=document.querySelector('#poem'),sheet=document.querySelector('#cutpaper');
const W=1500,H=1000;canvas.width=W;canvas.height=H;
let seed=238;function random(){seed=(seed*1664525+1013904223)>>>0;return seed/4294967296}
// Wind-driven rain and short ballistic splash strokes, in page coordinates.
const rain=document.querySelector('#rain'),rainCanvas=document.createElement('canvas');
rain.replaceChildren(rainCanvas);rainCanvas.style.cssText='width:100%;height:100%;display:block';
const rc=rainCanvas.getContext('2d');rainCanvas.width=W;rainCanvas.height=H;
const reduceRain=matchMedia('(prefers-reduced-motion: reduce)');
let drops=[],splashes=[],lastRain=0;
function newDrop(initial=false){return {x:Math.random()*W-140,y:initial?Math.random()*H:-90-Math.random()*150,ground:H*(.55+Math.random()*.44),speed:230+Math.random()*290,length:17+Math.random()*32,slant:.16+Math.random()*.2,alpha:.24+Math.random()*.3};}
drops=Array.from({length:64},()=>newDrop(true));
function paintRain(time){const dt=Math.min((time-lastRain)/1000||0,.04);lastRain=time;rc.clearRect(0,0,W,H);rc.lineCap='round';
for(let i=0;i<drops.length;i++){const d=drops[i];if(!reduceRain.matches){d.y+=d.speed*dt;d.x+=d.speed*(d.slant+.035*Math.sin(time/2400))*dt;}
if(d.y>d.ground){for(let j=0;j<3+Math.floor(Math.random()*3);j++)splashes.push({x:d.x,y:d.ground,vx:(Math.random()-.5)*110,vy:-35-Math.random()*80,life:0,duration:.23+Math.random()*.22});drops[i]=newDrop();continue;}
rc.strokeStyle=`rgba(76,116,135,${d.alpha})`;rc.lineWidth=.9;rc.beginPath();rc.moveTo(d.x-d.length*d.slant,d.y-d.length);rc.lineTo(d.x,d.y);rc.stroke();}
splashes=splashes.filter(p=>p.life<p.duration);for(const p of splashes){p.life+=dt;const x=p.x+p.vx*p.life,y=p.y+p.vy*p.life+150*p.life*p.life;rc.strokeStyle=`rgba(67,113,133,${.52*(1-p.life/p.duration)})`;rc.lineWidth=1;rc.beginPath();rc.moveTo(x,y);rc.lineTo(x-p.vx*.038,y-(p.vy+300*p.life)*.038);rc.stroke();}
rain.dataset.splashes=splashes.length;if(!reduceRain.matches)requestAnimationFrame(paintRain);}
reduceRain.addEventListener('change',()=>{lastRain=0;requestAnimationFrame(paintRain)});requestAnimationFrame(paintRain);

const texture=document.createElement('canvas');texture.width=W;texture.height=H;const tx=texture.getContext('2d');tx.fillStyle='#d4d0c4';tx.fillRect(0,0,W,H);
for(let i=0;i<80000;i++){const x=random()*W,y=random()*H;tx.fillStyle=i%2?'rgba(95,83,62,.045)':'rgba(255,255,245,.14)';tx.fillRect(x,y,.5+random()*1.5,.5+random()*1.5)}
for(let i=0;i<4500;i++){const x=random()*W,y=random()*H;tx.strokeStyle=i%2?'rgba(255,253,233,.2)':'rgba(91,81,62,.06)';tx.lineWidth=.3;tx.beginPath();tx.moveTo(x,y);tx.quadraticCurveTo(x+random()*3,y+2,x+random()*5,y+3+random()*5);tx.stroke()}
// Kurt Heynicke, Esperanza; Spanish translation by Jorge Luis Borges (1920).
const verse=[
 ['Gentle spring hangs from my heart.',125,190,['The season is felt within the body.','What seemed like weather becomes a feeling.']],
 ['It blossoms,',153,324,['The opening flower gives that feeling a form.','Something held inside begins to unfold.']],
 ['and shyly puts the hours to sleep;',123,458,['Time seems to soften around the speaker.','Spring changes the pace at which a moment is felt.']],
 ['the valley casts quiet shadows.',143,592,['The feeling now has a place: a valley,','a landscape whose stillness answers the heart.']],
 ['Then',293,726,['A small word turns the scene.','The season continues, but its meaning shifts.']],
 ['weariness flows from young branches,',860,190,['Youth and tiredness share the same branch.','New growth does not exclude exhaustion.']],
 ['and buds that die having borne fruit',866,324,['Flowering is followed by fruit and disappearance.','The season holds renewal and loss together.']],
 ['are balm.',1040,458,['What passes away can also bring comfort.','The earlier weariness acquires another meaning.']],
 ['The soul nods',898,592,['An inward response echoes the living landscape.','The gesture is small, quiet, accepting.']],
 ['and laughs like an old man.',961,726,['Spring ends here with an image of age.','Youth, weariness and consolation belong together.']]
];
poem.replaceChildren();sheet.setAttribute('preserveAspectRatio','none');marks.setAttribute('preserveAspectRatio','none');
const ns='http://www.w3.org/2000/svg';
// Cotton-paper surface: raised woven tooth, irregular fibers and broad pulp variation.
let fibers='';for(let i=0;i<460;i++){const x=random()*192,y=random()*192,len=2+random()*10;fibers+=`<path d="M${x} ${y}q${len*.4} ${random()*2-1} ${len} ${random()*3-1.5}" stroke="${i%3?'#8e8268':'#fffdf0'}" opacity="${i%3?.09:.6}" stroke-width="${.12+random()*.165}" fill="none"/>`}
const cotton=`<pattern id="tooth" width="5" height="5" patternUnits="userSpaceOnUse"><path d="M.5 1l1.6 1.9M3 3.5l1.5 1.7" stroke="#fffcef" stroke-width=".9" opacity=".32"/><path d="M1.4 .8l1.5 2M3.9 3.3l1.5 2" stroke="#998c72" stroke-width=".65" opacity=".1"/></pattern><pattern id="cotton" width="192" height="192" patternUnits="userSpaceOnUse"><rect width="192" height="192" fill="#eee7d5"/><rect width="192" height="192" fill="url(#tooth)"/>${fibers}</pattern>`;
sheet.innerHTML=`<defs>${cotton}<filter id="paper-grain"><feTurbulence type="fractalNoise" baseFrequency=".075 .12" numOctaves="4" seed="18" result="noise"/><feDiffuseLighting in="noise" lighting-color="#f4eddf" surfaceScale=".6" diffuseConstant="1"><feDistantLight azimuth="225" elevation="65"/></feDiffuseLighting><feComposite in2="SourceGraphic" operator="in"/></filter></defs><path d="M0 0H1500V1000H0Z M100 125V842H660V125Z M840 125V842H1400V125Z" fill="url(#cotton)"/><path d="M0 0H1500V1000H0Z M100 125V842H660V125Z M840 125V842H1400V125Z" fill="url(#cotton)" filter="url(#paper-grain)" opacity=".16"/>`;
// Permanent paper bridges retain a connected, densely cut page even after all backing is revealed.
let mesh='';
function tornBand(x,y,w,h){const n=Math.max(12,Math.ceil(w/18)),top=[],bottom=[];for(let k=0;k<=n;k++){top.push([x+w*k/n,y+(random()-.5)*1.3]);bottom.push([x+w*k/n,y+h+(random()-.5)*1.3])}return 'M'+top.map(p=>p.join(' ')).join(' L')+' L'+bottom.reverse().map(p=>p.join(' ')).join(' L')+' Z'}
for(let side=0;side<2;side++)for(let row=0;row<29;row++){
 const start=side?840:100,y=129+row*24.4,h=9+random()*4;
 mesh+=tornBand(start,y,560,h);
 for(let j=0;j<2;j++){const x=start+30+j*255+random()*170;mesh+=tornBand(x,y+4,9+random()*15,26)}
 if(row%5===0)mesh+=tornBand(start+random()*330,y+9,95+random()*80,14);
}
let veils='';for(let i=0;i<20;i++){const x=(i%2?850:110)+random()*400,y=140+random()*670;veils+=`<path d="${tornBand(x,y,45+random()*120,9+random()*20)}" fill="url(#cotton)" opacity="${.13+random()*.22}"/>`}
const tissue=document.createElementNS(ns,'g');tissue.innerHTML=veils;sheet.append(tissue);
const bridges=document.createElementNS(ns,'g');bridges.innerHTML=`<path d="${mesh}" fill="url(#cotton)"/><path d="${mesh}" fill="url(#cotton)" filter="url(#paper-grain)" opacity=".16"/>`;sheet.append(bridges);
verse.forEach(([text,x,y,notes],i)=>{
 const g=document.createElementNS(ns,'g');g.classList.add('phrase');g.setAttribute('role','button');g.setAttribute('tabindex','0');g.setAttribute('aria-label',text+' '+notes.join(' '));sheet.append(g);
 function printLine(line,xx,yy,size,kind){const t=document.createElementNS(ns,'text');t.setAttribute('x',xx);t.setAttribute('y',yy);t.style.fontFamily='Inknut Antiqua';t.style.fontSize=size+'px';t.setAttribute('fill',kind==='note'?'#767063':'#38362e');t.setAttribute('class',kind);if(kind==='note')t.textContent=line;else{line.split(' ').forEach((word,j)=>{const span=document.createElementNS(ns,'tspan');span.textContent=(j?' ':'')+word;if(j>0&&j<line.split(' ').length-1)span.classList.add('context-word');t.append(span)})}g.append(t);const limit=xx<750?650:1390;let width=t.getComputedTextLength();if(width>limit-xx)t.style.fontSize=(size*(limit-xx)/width)+'px';const ink=t.getBBox(),rect=document.createElementNS(ns,'path');rect.setAttribute('d',tornBand(xx-6,ink.y-3,ink.width+12,ink.height+6));rect.setAttribute('fill','url(#cotton)');g.insertBefore(rect,t);}
 printLine(text,x,y,21,'poetry');notes.forEach((line,j)=>printLine(line,x<750?125:865,y+42+j*25,12.5,'note'));
 g.addEventListener('pointerenter',()=>read(i));g.addEventListener('click',()=>read(i));g.addEventListener('keydown',e=>{if(['Enter',' '].includes(e.key)){e.preventDefault();read(i)}});
});
let fringe='';for(let i=0;i<130;i++){const row=Math.floor(random()*29),x=(i%2?840:100)+random()*560,y=129+row*24.4+(i%2?13:0);fringe+=`<path d="M${x} ${y}q${random()*3-1.5} ${random()*4-2} ${random()*4-2} ${(i%2?1:-1)*(.5+random()*1.2)}" stroke="#f7f0df" stroke-width="${.25+random()*.5}" opacity="${.12+random()*.16}" fill="none"/>`}
const fuzz=document.createElementNS(ns,'g');fuzz.setAttribute('pointer-events','none');fuzz.innerHTML=fringe;sheet.append(fuzz);
// Adjacent pieces share the exact same irregular edges, so all pieces reveal one complete image.
const C=12,R=9,points=[];for(let r=0;r<=R;r++){points[r]=[];for(let c=0;c<=C;c++)points[r][c]={x:c*W/C+(c&&c<C?(random()-.5)*50:0),y:r*H/R+(r&&r<R?(random()-.5)*35:0)}}
function edge(a,b){const out=[a];for(let k=1;k<14;k++){const f=k/14,j=(random()-.5)*9;const len=Math.hypot(b.x-a.x,b.y-a.y);out.push({x:a.x+(b.x-a.x)*f-(b.y-a.y)/len*j,y:a.y+(b.y-a.y)*f+(b.x-a.x)/len*j})}out.push(b);return out}
const hor=[],ver=[];for(let r=0;r<=R;r++){hor[r]=[];for(let c=0;c<C;c++)hor[r][c]=edge(points[r][c],points[r][c+1])}for(let r=0;r<R;r++){ver[r]=[];for(let c=0;c<=C;c++)ver[r][c]=edge(points[r][c],points[r+1][c])}
const tiles=[];for(let r=0;r<R;r++)for(let c=0;c<C;c++){const ps=[...hor[r][c],...ver[r][c+1],...hor[r+1][c].slice().reverse(),...ver[r][c].slice().reverse()];let p=new Path2D();ps.forEach((v,i)=>i?p.lineTo(v.x,v.y):p.moveTo(v.x,v.y));p.closePath();tiles.push({path:p,start:0,gone:false})}
let frame=0,seen=new Set();const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
function draw(t=performance.now()){ctx.clearRect(0,0,W,H);let active=false;for(const tile of tiles){if(tile.gone)continue;const f=tile.start?Math.min(1,(t-tile.start)/650):0;if(f>=1){tile.gone=true;continue}if(f>0)active=true;ctx.save();if(f){ctx.globalAlpha=1-f;ctx.translate(f*30,-f*17);ctx.shadowColor='#493f3270';ctx.shadowBlur=8;ctx.shadowOffsetY=8}ctx.clip(tile.path);ctx.drawImage(texture,0,0);ctx.restore();}if(active)frame=requestAnimationFrame(draw);else frame=0;page.dataset.pieces=tiles.filter(v=>v.gone||v.start).length;page.dataset.complete=tiles.every(v=>v.gone)?'true':'false'}
function tear(x,y){let hit=tiles.find(v=>!v.gone&&!v.start&&ctx.isPointInPath(v.path,x,y));if(hit){hit.start=reduced?performance.now()-700:performance.now();if(!frame)frame=requestAnimationFrame(draw)}}
function read(i){if(seen.has(i))return;seen.add(i);sheet.querySelectorAll('.phrase')[i].classList.add('read');const [text,x,y]=verse[i];const width=sheet.querySelectorAll('.phrase')[i].querySelector('.poetry').getComputedTextLength();tear(x+width/2,y+35);page.dataset.revealed=seen.size}
let last=null;function move(e){const b=page.getBoundingClientRect(),x=(e.clientX-b.left)/b.width*W,y=(e.clientY-b.top)/b.height*H;if(last){let distance=Math.hypot(x-last.x,y-last.y);for(let f=0;f<=1;f+=Math.min(1,25/Math.max(1,distance)))tear(last.x+(x-last.x)*f,last.y+(y-last.y)*f)}tear(x,y);last={x,y};verse.forEach((v,i)=>{if(Math.abs(y-v[2])<22&&x>v[1]-8&&x<v[1]+300)read(i)})}
page.addEventListener('pointermove',move);page.addEventListener('pointerdown',e=>{last=null;move(e);if(e.pointerType==='touch')page.setPointerCapture(e.pointerId)});page.addEventListener('pointerleave',()=>last=null);
function reset(){cancelAnimationFrame(frame);frame=0;tiles.forEach(v=>{v.start=0;v.gone=false});seen.clear();last=null;marks.replaceChildren();sheet.querySelectorAll('.read').forEach(v=>v.classList.remove('read'));page.dataset.revealed='0';draw()}
document.querySelector('#restart').onclick=reset;page.addEventListener('keydown',e=>{if(e.key==='Escape')reset()});reset();

})();
