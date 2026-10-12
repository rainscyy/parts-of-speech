const $=s=>document.querySelector(s),stage=$('#stage'),base=$('#base'),color=$('#color'),box=$('#box'),label=$('#label'),words=$('#words'),targets=$('#targets'),hint=$('#hint');
// Normalized, manually annotated shelf regions. Prices marked PHOTO are transcribed from legible shelf labels; DEMO prices are illustrative.
const catalog={
 greenpepper:['Green bell pepper','$4.99','PHOTO','Capsicum annuum','crisp · grassy · mild','slice / sauté / stuff','green before ripening','#72ff37'],
 redpepper:['Red bell pepper','$0.99','PHOTO','Capsicum annuum','sweet · crisp · juicy','roast / grill / slice','ripe red fruit','#ff414b'],
 yellowpepper:['Yellow bell pepper','$0.99','DEMO','Capsicum annuum','sweet · bright · crunchy','grill / stuff / slice','yellow cultivar','#fff02e'],
 eggplant:['Eggplant','$2.99','DEMO','Solanum melongena','silky when cooked','roast / braise / grill','also called aubergine','#ce8aff'],
 zucchini:['Zucchini','$2.99','PHOTO','Cucurbita pepo','mild · tender','sauté / bake / grill','summer squash','#35ffa5'],
 squash:['Yellow squash','$2.99','DEMO','Cucurbita pepo','mild · soft skin','sauté / steam / roast','summer squash','#ffdf34'],
 artichoke:['Artichoke','$6.99','PHOTO','Cynara cardunculus','earthy · tender heart','steam / braise / grill','edible flower bud','#bcff57'],
 lemon:['Lemon','$4.99','PHOTO','Citrus limon','acidic · aromatic','zest / squeeze / preserve','yellow citrus fruit','#fff12e'],
 romanesco:['Romanesco','$5.99','DEMO','Brassica oleracea','nutty · crisp','steam / roast / sauté','spiral florets','#97ff4f'],
 brownmushroom:['Cremini mushroom','$8.99','PHOTO','Agaricus bisporus','earthy · savoury','sauté / roast / simmer','brown button mushroom','#ffb075'],
 whitemushroom:['White mushroom','$6.99','PHOTO','Agaricus bisporus','mild · savoury','slice / sauté / roast','white button mushroom','#9bf5ff'],
 shiitake:['Shiitake','$16.99','PHOTO','Lentinula edodes','woodsy · savoury','sauté / simmer / dry','edible mushroom','#ffaa64'],
 oyster:['Oyster mushroom','$9.99','DEMO','Pleurotus species','delicate · fan shaped','sauté / roast / tear','clustered mushroom','#c4a2ff'],
 chili:['Chili pepper','$3.49','DEMO','Capsicum species','heat varies by variety','chop / pickle / sauté','seed-bearing fruit','#ff4857'],
 jalapeno:['Jalapeño','$6.99','PHOTO','Capsicum annuum','green · pungent','pickle / stuff / chop','chili cultivar','#60ff79'],
 minipepper:['Mini sweet pepper','$5.99','PHOTO','Capsicum annuum','sweet · snack sized','slice / roast / snack','mixed-colour peppers','#ff9852'],
 turnip:['Turnip','$3.99','DEMO','Brassica rapa','peppery · crisp','roast / mash / pickle','edible root','#d3ff71'],
 rutabaga:['Rutabaga','$3.99','DEMO','Brassica napus','earthy · slightly sweet','roast / mash / simmer','swede / storage root','#ff8bdb'],
 carrot:['Carrot','$2.99','PHOTO','Daucus carota','sweet · crisp','roast / grate / juice','orange storage root','#ff873b'],
 leek:['Leek','$4.49','PHOTO','Allium ampeloprasum','mild onion aroma','braise / sauté / simmer','layered leaf sheaths','#a5ff7b'],
 celery:['Celery','$6.99','PHOTO','Apium graveolens','crisp · aromatic','chop / braise / snack','edible leaf stalks','#5eff95'],
 bokchoy:['Bok choy','$3.49','PHOTO','Brassica rapa','crisp stems · tender leaves','stir-fry / steam / braise','Chinese cabbage','#bfff68'],
 broccoli:['Broccoli','$3.99','PHOTO','Brassica oleracea','crunchy · green','steam / roast / stir-fry','edible florets and stems','#39ffa1'],
 radish:['Radish','$2.49','PHOTO','Raphanus sativus','peppery · crisp','slice / pickle / roast','red-skinned root','#ff46a8'],
 parsley:['Parsley','$1.99','PHOTO','Petroselinum crispum','fresh · herbaceous','chop / garnish / blend','culinary herb','#79ff45'],
 purplekale:['Red curly kale','$2.49','PHOTO','Brassica oleracea','leafy · earthy','massage / sauté / roast','purple-veined leaves','#da78ff'],
 greenkale:['Green curly kale','$1.99','PHOTO','Brassica oleracea','leafy · earthy','sauté / roast / blend','curled leaf edges','#5fff6d'],
 greens:['Leafy greens','$3.99','DEMO','Leaf vegetables','leafy · fresh','wash / sauté / steam','mixed shelf greens','#77ffbd'],
 iceberg:['Iceberg lettuce','$2.99','DEMO','Lactuca sativa','crisp · mild','salad / shred / wrap','compact leaf head','#c1ff6e'],
 napa:['Napa cabbage','$1.99','DEMO','Brassica rapa','tender · mild','braise / ferment / stir-fry','elongated leaf head','#e0ff65'],
 redcabbage:['Red cabbage','$2.99','DEMO','Brassica oleracea','crisp · purple','slaw / pickle / braise','dense leaf head','#ff71e5'],
 fennel:['Fennel','$2.99','PHOTO','Foeniculum vulgare','anise aroma · crisp','slice / roast / braise','bulb, stalks and fronds','#b9ff9c'],
 cilantro:['Cilantro','$1.99','DEMO','Coriandrum sativum','fresh · aromatic','chop / garnish / blend','also called coriander leaf','#4bffad'],
 lacinato:['Lacinato kale','$1.99','PHOTO','Brassica oleracea','earthy · textured','braise / sauté / shred','also called dinosaur kale','#52ddff'],
 babycarrot:['Baby carrots','$2.99','PHOTO','Daucus carota','sweet · snack sized','snack / roast / steam','packaged carrots','#ff9b42'],
 beet:['Beetroot','$2.99','PHOTO','Beta vulgaris','earthy · sweet','roast / pickle / grate','purple-red root','#ff6dc1']
};
// [catalog key, x, y, width, height, columns, rows], measured against the uncropped photographs.
for(const d of Object.values(catalog)) d[1]+=' /lb';
const photos=[
 {src:'assets/shelf-1.jpg',bins:[['greenpepper',0,0,19,17,3,2],['redpepper',19,0,56,17,6,2],['yellowpepper',75,0,25,17,3,2],['eggplant',0,21,14,11,2,1],['zucchini',14,21,64,11,7,2],['squash',78,21,22,11,3,2],['artichoke',0,36,48,12,6,2],['lemon',49,36,44,12,5,2],['romanesco',93,36,7,12,1,1],['brownmushroom',0,51,40,11,4,2],['whitemushroom',40,51,22,11,3,2],['shiitake',62,51,31,11,3,2],['oyster',93,51,7,11,1,1],['chili',0,65,15,11,2,2],['jalapeno',15,65,47,11,5,2],['minipepper',62,65,31,11,4,2],['jalapeno',93,65,7,11,1,2],['turnip',0,80,65,20,7,3],['rutabaga',65,80,35,20,4,3]]},
 {src:'assets/shelf-2.jpg',bins:[['carrot',0,0,47,22,6,1],['leek',47,0,41,22,5,1],['celery',88,0,12,22,2,1],['bokchoy',0,26,12,14,2,2],['broccoli',12,26,44,14,4,2],['radish',56,26,23,14,3,2],['parsley',79,26,21,14,2,2],['purplekale',0,43,42,18,4,2],['greenkale',42,43,44,18,4,2],['iceberg',86,43,14,18,2,2],['greens',0,64,100,14,8,1],['carrot',0,81,24,19,3,2],['iceberg',24,81,36,19,4,2],['napa',60,81,32,19,3,2],['redcabbage',92,81,8,19,1,2]]},
 {src:'assets/shelf-3.jpg',bins:[['carrot',0,0,6,22,1,1],['fennel',6,0,32,22,4,1],['carrot',38,0,62,22,8,1],['cilantro',0,26,18,14,2,2],['bokchoy',18,26,46,14,5,2],['broccoli',64,26,36,14,4,2],['greenkale',0,43,9,18,1,2],['lacinato',9,43,43,18,4,2],['purplekale',52,43,48,18,4,2],['fennel',0,65,21,15,3,2],['babycarrot',21,65,29,15,3,2],['greens',50,65,50,15,5,1],['beet',0,83,22,17,3,2],['carrot',22,83,55,17,6,3],['iceberg',77,83,23,17,2,2]]}
];
let photo=0,selected=null,locked=false,zones=[],lastPointer=null;
function clearSelection(){selected=null;locked=false;stage.classList.remove('has-selection','overload');words.replaceChildren();hint.textContent='MOVE TO REVEAL · CLICK TO CONTEXTUALIZE';}
function setPhoto(n){photo=n;clearSelection();base.src=color.src=photos[n].src;zones=[];targets.replaceChildren();for(const [key,x,y,w,h] of photos[n].bins){const cols=w>=80?2:1,rows=1;for(let r=0;r<rows;r++)for(let c=0;c<cols;c++){const z={key,x:x+c*w/cols,y:y+r*h/rows,w:w/cols,h:h/rows,id:zones.length};zones.push(z);const b=document.createElement('button');b.className='target';b.style.cssText=`left:${z.x}%;top:${z.y}%;width:${z.w}%;height:${z.h}%`;b.setAttribute('aria-label',`${catalog[key][0]}, ${catalog[key][1]}, ${catalog[key][2].toLowerCase()} price. Enter to contextualize.`);b.onfocus=()=>{if(!locked)select(z)};b.onclick=e=>{e.stopPropagation();toggle(z)};targets.append(b)}}document.querySelectorAll('[data-photo]').forEach(b=>b.setAttribute('aria-pressed',String(+b.dataset.photo===n)));}
function select(z){if(!z){clearSelection();return}selected=z;const d=catalog[z.key];stage.classList.add('has-selection');box.style.cssText=`left:${z.x}%;top:${z.y}%;width:${z.w}%;height:${z.h}%;--accent:${d[7]}`;color.style.clipPath=`inset(${z.y}% ${100-z.x-z.w}% ${100-z.y-z.h}% ${z.x}%)`;label.replaceChildren();const name=document.createElement('b');name.textContent=d[0].toUpperCase();const price=document.createElement('small');price.textContent=`${d[1]} / ${d[2]==='PHOTO'?'SHELF PRICE':'DEMO PRICE'}`;label.append(name,price);label.classList.toggle('below',z.y<8);label.classList.toggle('right',z.x+z.w>75);}
function at(e){const b=stage.getBoundingClientRect();const x=(e.clientX-b.left)/b.width*100,y=(e.clientY-b.top)/b.height*100;return zones.find(z=>x>=z.x&&x<=z.x+z.w&&y>=z.y&&y<=z.y+z.h)}
stage.addEventListener('pointermove',e=>{lastPointer=e;if(!locked)select(at(e))});stage.addEventListener('pointerleave',()=>{lastPointer=null;if(!locked)clearSelection()});
stage.addEventListener('click',e=>toggle(locked?selected:at(e)));stage.addEventListener('keydown',e=>{if(e.target!==stage)return;if(e.key==='Escape'){clearSelection();}if(e.key==='Enter'||e.key===' '){e.preventDefault();toggle(selected||zones[0])}if(e.key==='ArrowRight')setPhoto((photo+1)%3);if(e.key==='ArrowLeft')setPhoto((photo+2)%3)});
function toggle(z){if(locked){clearSelection();if(lastPointer)select(at(lastPointer));return}if(!z)return;select(z);locked=true;stage.classList.add('overload');hint.textContent='CLICK TO RETURN';fillContext(z);}
function fillContext(z){words.replaceChildren();const d=catalog[z.key],palette=[d[7],'#00e5ff','#ff2fce','#e9ff23','#5bff35','#ff7040'];const statements=[d[0].toUpperCase(),d[3],d[4],d[5],d[6],`${d[0]} · ${d[1]}`,...d[4].split(' · '),...d[5].split(' / '),`${d[0]} / ${d[6]}`,`${d[0]} — ${d[4]}`,`${d[5]} / ${d[0]}`,`${d[3]} · ${d[6]}`];const bounds=stage.getBoundingClientRect();let seed=z.id*81+photo*789+17;const rand=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296};
// Dense lines avoid the preserved colour crop. Their size is measured in actual pixels before placement.
for(let i=0;i<150;i++){const el=document.createElement('span'),big=i%11===0;el.className='context-line'+(big?' big':'')+(i%9===0?' flow':'');el.textContent=statements[i%statements.length];const size=(big?28+rand()*32:9+rand()*15)*(bounds.width/590);el.style.cssText=`font-size:${Math.max(8,size)}px;color:${palette[i%palette.length]};--delay:${Math.min(i*6,700)}ms`;words.append(el);const ew=el.offsetWidth/bounds.width*100,eh=el.offsetHeight/bounds.height*100;let x,y,ok=false;for(let j=0;j<40;j++){x=rand()*Math.max(1,100-ew);y=rand()*(100-eh);if(!(x<z.x+z.w+2&&x+ew>z.x-2&&y<z.y+z.h+3&&y+eh>z.y-4)){ok=true;break}}if(!ok){el.remove();continue}el.style.left=x+'%';el.style.top=y+'%';}
// Anchored labels and fine frames borrow the visual grammar of the student's sketch.
const panels=[{x:3,y:3,w:43,h:18,c:palette[2],title:d[0].toUpperCase(),text:d[3]+'\n'+d[6]},{x:54,y:76,w:42,h:20,c:palette[1],title:'PREPARATION',text:d[5]},{x:6,y:68,w:35,h:25,c:palette[3],title:'TASTE & TEXTURE',text:d[4]+'\n'+d[1]}];
for(const p of panels){if(p.x<z.x+z.w&&p.x+p.w>z.x&&p.y<z.y+z.h+4&&p.y+p.h>z.y-4)continue;const panel=document.createElement('div');panel.className='context-panel';panel.style.cssText=`left:${p.x}%;top:${p.y}%;width:${p.w}%;height:${p.h}%;--panel:${p.c}`;const tag=document.createElement('b');tag.textContent=p.title;const t=document.createElement('span');t.textContent=p.text;panel.append(tag,t);words.append(panel);}
}
document.querySelectorAll('[data-photo]').forEach(b=>b.onclick=()=>setPhoto(+b.dataset.photo));new ResizeObserver(()=>{if(locked&&selected)fillContext(selected)}).observe(stage);setPhoto(0);

// Begin the gallery preview with a real produce selection; visitors can immediately take over.
let previewStarted=false;addEventListener('message',e=>{if(e.origin!==location.origin||e.data?.type!=='study-preview-start'||previewStarted)return;previewStarted=true;setTimeout(()=>{if(!locked)toggle(zones.find(z=>z.key==='lemon')||zones[0])},450)});
