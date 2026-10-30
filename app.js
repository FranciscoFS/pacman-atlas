// Visor WebGL autónomo: datos precalculados, sin dependencias externas.
const $ = id => document.getElementById(id);
function setTheme(dark){document.documentElement.dataset.theme=dark?"oscuro":"claro";$("theme-toggle").textContent=dark?"Modo claro":"Modo oscuro";$("theme-toggle").setAttribute("aria-pressed",String(dark));document.querySelector('meta[name="theme-color"]').content=dark?"#101c2c":"#f1f5f9";try{localStorage.setItem("pacman-theme",dark?"oscuro":"claro")}catch{}}
let savedTheme="claro";try{savedTheme=localStorage.getItem("pacman-theme")||"claro"}catch{}
setTheme(savedTheme==="oscuro");
$("theme-toggle").onclick=()=>setTheme(document.documentElement.dataset.theme!=="oscuro");
const RZ = [3, 7, 8, 9, 10], DZ = [1, 2, 4, 5, 6];
const DN = ['LTR', 'MTR', 'LICN', 'MICN', 'CICN'];
const LONG = ['Cresta troclear lateral', 'Cresta troclear medial', 'Escotadura lateral', 'Escotadura medial', 'Escotadura central'];
const fmt = (x, n = 3) => Number(x).toLocaleString('es-CL', {minimumFractionDigits:n, maximumFractionDigits:n});
const clamp = (x,a,b) => Math.max(a, Math.min(b,x));
const sub = (a,b) => a.map((x,i) => x-b[i]);
const dot = (a,b) => a.reduce((s,x,i) => s+x*b[i],0);
const cross = (a,b) => [a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
const norm = a => {const d=Math.hypot(...a)||1;return a.map(x=>x/d)};
function multiply(a,b){const c=new Float32Array(16);for(let j=0;j<4;j++)for(let i=0;i<4;i++)for(let k=0;k<4;k++)c[j*4+i]+=a[k*4+i]*b[j*4+k];return c}
function transform(m,p){return [0,1,2,3].map(i=>m[i]*p[0]+m[4+i]*p[1]+m[8+i]*p[2]+m[12+i])}
function lookAt(eye){const z=norm(eye),x=norm(cross([0,0,1],z)),y=cross(z,x);return new Float32Array([x[0],y[0],z[0],0,x[1],y[1],z[1],0,x[2],y[2],z[2],0,-dot(x,eye),-dot(y,eye),-dot(z,eye),1])}
function perspective(aspect){const f=1/Math.tan(Math.PI/8),near=.1,far=30;return new Float32Array([f/aspect,0,0,0,0,f,0,0,0,0,(far+near)/(near-far),-1,0,0,2*far*near/(near-far),0])}
// Configuración de presentación: mismas paradas de color que las figuras finales.
// Los límites se calculan desde los datos; no son umbrales de aceptación.
const COLOR_CONFIG = Object.freeze({
  receptor: {stops:['#08519C','#6BAED6','#FFFFFF'], range:'selected-region-min-max', logStrength:9},
  donor: {stops:['#FFFFFF','#FDAE6B','#A63603'], range:'selected-distribution-zero-max'},
});
function palette(stops,t){
  const position=clamp(t,0,1)*(stops.length-1),i=Math.min(Math.floor(position),stops.length-2),mix=position-i;
  return [1,3,5].map(k=>{const a=parseInt(stops[i].slice(k,k+2),16)/255,b=parseInt(stops[i+1].slice(k,k+2),16)/255;return a+(b-a)*mix});
}
function scaledColor(value,limits,stops){const span=limits[1]-limits[0];return palette(stops,span>0?(value-limits[0])/span:0)}
const bone=[.91,.875,.80];
let data, vertices, triangles, selectedZone=7, selectedCell=null, receptorViewer, donorViewer, frequency, donorPeak=null;
const colorLimits={receptor:[0,1],donor:[0,1]};
let receptorContrast='log';
function receptorColor(value){
  const [lo,hi]=colorLimits.receptor,t=hi>lo?clamp((value-lo)/(hi-lo),0,1):0;
  const a=COLOR_CONFIG.receptor.logStrength;
  return palette(COLOR_CONFIG.receptor.stops,receptorContrast==='log'?Math.log1p(a*t)/Math.log1p(a):t);
}
function updateReceptorLegend(){
  const [lo,hi]=colorLimits.receptor,a=COLOR_CONFIG.receptor.logStrength;
  const middleFraction=receptorContrast==='log'?Math.expm1(.5*Math.log1p(a))/a:.5;
  $('rmse-mid').textContent=`${fmt(lo+(hi-lo)*middleFraction)} mm`;
  $('rmse-scale').textContent=receptorContrast==='log'
    ?'RMSE · Contraste logarítmico ampliado · Escala por región'
    :'RMSE · Contraste lineal · Escala por región';
}

class Viewer {
  constructor(id,view){
    this.id=id;this.canvas=$(id);this.gl=this.canvas.getContext('webgl',{antialias:true,alpha:true});
    if(!this.gl)throw Error('Este navegador no ofrece WebGL. Pruebe con Chrome, Edge o Safari actualizado.');
    const gl=this.gl;
    const shader=(kind,src)=>{const s=gl.createShader(kind);gl.shaderSource(s,src);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw Error(gl.getShaderInfoLog(s));return s};
    this.program=gl.createProgram();
    gl.attachShader(this.program,shader(gl.VERTEX_SHADER,`attribute vec3 position;attribute vec3 normal;attribute vec3 color;uniform mat4 mvp;uniform mat4 view;varying vec3 vcolor;varying vec3 vn;void main(){gl_Position=mvp*vec4(position,1.);vcolor=color;vn=mat3(view)*normal;}`));
    gl.attachShader(this.program,shader(gl.FRAGMENT_SHADER,`precision mediump float;varying vec3 vcolor;varying vec3 vn;void main(){vec3 n=normalize(vn);float key=max(dot(n,normalize(vec3(-.4,.6,1.))),0.);float fill=max(dot(n,normalize(vec3(.8,-.1,.4))),0.);float light=.48+.42*key+.13*fill;gl_FragColor=vec4(vcolor*light,1.);}`));
    gl.linkProgram(this.program);if(!gl.getProgramParameter(this.program,gl.LINK_STATUS))throw Error(gl.getProgramInfoLog(this.program));gl.useProgram(this.program);
    this.buffers={};
    this.attribute('position',triangles.flatMap(i=>vertices.slice(i*3,i*3+3)));
    this.attribute('normal',triangles.flatMap(i=>data.mesh.normals.slice(i*3,i*3+3)));
    this.attribute('color',triangles.flatMap(()=>bone));
    this.setView(view);
    new ResizeObserver(()=>this.draw()).observe(this.canvas);
    this.canvas.addEventListener('pointerdown',e=>{this.canvas.setPointerCapture(e.pointerId);this.start=[e.clientX,e.clientY];this.last=this.start;this.moved=0});
    this.canvas.addEventListener('pointermove',e=>{if(!this.start)return;const dx=e.clientX-this.last[0],dy=e.clientY-this.last[1];this.moved+=Math.hypot(dx,dy);this.yaw-=dx*.009;this.pitch=clamp(this.pitch+dy*.009,-1.55,1.55);this.last=[e.clientX,e.clientY];this.draw()});
    const end=e=>{if(!this.start)return;const click=this.moved<7;this.start=null;if(click&&id==='receptor')this.pick(e)};
    this.canvas.addEventListener('pointerup',end);this.canvas.addEventListener('pointercancel',()=>this.start=null);
    this.canvas.addEventListener('wheel',e=>{e.preventDefault();this.distance=clamp(this.distance*Math.exp(e.deltaY*.001),1.4,8);this.draw()},{passive:false});
    this.canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();$('loading').hidden=false;$('loading').textContent='Se perdió el contexto gráfico. Recargue para restaurar el visor.'});
  }
  attribute(name,values){const gl=this.gl;gl.useProgram(this.program);if(!this.buffers[name])this.buffers[name]=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,this.buffers[name]);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(values),gl.STATIC_DRAW);const loc=gl.getAttribLocation(this.program,name);gl.enableVertexAttribArray(loc);gl.vertexAttribPointer(loc,3,gl.FLOAT,false,0,0)}
  setView(view){this.yaw=view==='posterior'?Math.PI:0;this.pitch=view==='distal'?-1.52:.04;this.distance=3.2;this.draw();const label={anterior:'Vista anterior',distal:'Vista distal',posterior:'Vista posterior'};$(this.id+'-view-label').textContent=label[view]||'Vista libre'}
  draw(){if(!this.gl)return;const gl=this.gl,dpr=Math.min(devicePixelRatio||1,2),w=this.canvas.clientWidth,h=this.canvas.clientHeight;if(!w||!h)return;this.canvas.width=w*dpr;this.canvas.height=h*dpr;gl.viewport(0,0,this.canvas.width,this.canvas.height);gl.clearColor(0,0,0,0);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);gl.enable(gl.DEPTH_TEST);gl.disable(gl.CULL_FACE);gl.useProgram(this.program);const fittedDistance=this.distance*Math.max(1,.85*h/w);const eye=[Math.sin(this.yaw)*Math.cos(this.pitch)*fittedDistance,Math.cos(this.yaw)*Math.cos(this.pitch)*fittedDistance,Math.sin(this.pitch)*fittedDistance];this.eye=eye;this.view=lookAt(eye);this.mvp=multiply(perspective(w/h),this.view);gl.uniformMatrix4fv(gl.getUniformLocation(this.program,'mvp'),false,this.mvp);gl.uniformMatrix4fv(gl.getUniformLocation(this.program,'view'),false,this.view);gl.drawArrays(gl.TRIANGLES,0,triangles.length);this.marker()}
  project(i){const p=transform(this.mvp,vertices.slice(i*3,i*3+3));return [(p[0]/p[3]+1)*this.canvas.clientWidth/2,(1-p[1]/p[3])*this.canvas.clientHeight/2,p[2]/p[3]]}
  marker(){const cell=this.id==='donor'?donorPeak:selectedCell,el=$(this.id+'-marker');if(cell===null||cell===undefined){el.hidden=true;return}let best=-1,min=Infinity;for(let i=0;i<data.mesh.cells.length;i++){const zone=data.mesh.zones[i];if(this.id==='donor'?!DZ.includes(zone):zone!==selectedZone)continue;const c=data.mesh.cells[i],d=(Math.floor(c/100)-Math.floor(cell/100))**2+4*((c%100)-(cell%100))**2;if(d<min){min=d;best=i}}if(best<0){el.hidden=true;return}const p=this.project(best),normal=data.mesh.normals.slice(best*3,best*3+3),toward=sub(this.eye,vertices.slice(best*3,best*3+3));el.hidden=dot(normal,toward)<0||p[0]<10||p[0]>this.canvas.clientWidth-10||p[1]<30||p[1]>this.canvas.clientHeight-15;if(!el.hidden){el.style.left=p[0]+'px';el.style.top=p[1]+'px'}}
  pick(e){const rect=this.canvas.getBoundingClientRect(),px=e.clientX-rect.left,py=e.clientY-rect.top;const screen=data.mesh.cells.map((_,i)=>this.project(i));let hit=-1,depth=Infinity;for(let k=0;k<triangles.length;k+=3){const ids=triangles.slice(k,k+3),[a,b,c]=ids.map(i=>screen[i]);const den=(b[1]-c[1])*(a[0]-c[0])+(c[0]-b[0])*(a[1]-c[1]);if(Math.abs(den)<1e-8)continue;const u=((b[1]-c[1])*(px-c[0])+(c[0]-b[0])*(py-c[1]))/den,v=((c[1]-a[1])*(px-c[0])+(a[0]-c[0])*(py-c[1]))/den,t=1-u-v;if(u<0||v<0||t<0)continue;const z=u*a[2]+v*b[2]+t*c[2];if(z<depth){depth=z;const weights=[u,v,t];hit=ids[weights.indexOf(Math.max(...weights))]}}
    if(hit<0||!RZ.includes(data.mesh.zones[hit]))return;
    selectedZone=data.mesh.zones[hit];const target=data.mesh.cells[hit];let chosen=null,dist=Infinity;for(const key of Object.keys(data.winners)){const cell=Number(key);if(data.grid.labels[cell]!==selectedZone)continue;const d=(Math.floor(cell/100)-Math.floor(target/100))**2+((cell%100)-(target%100))**2;if(d<dist){dist=d;chosen=cell}}if(dist<=16){selectedCell=chosen;update()}else{selectRegion(selectedZone)}
  }
}

// Gaussian display kernel in chart cells. Preserve total probability in each donor zone.
function smoothOrigin(raw){const result=new Float32Array(raw.length),kernel=[.006,.061,.242,.382,.242,.061,.006];for(let a=0;a<231;a++)for(let x=0;x<100;x++){const i=a*100+x;if(!raw[i])continue;const z=data.grid.labels[i];if(!DZ.includes(z))continue;for(let da=-3;da<=3;da++)for(let dx=-3;dx<=3;dx++){const b=a+da,y=x+dx;if(b<0||b>=231||y<0||y>=100)continue;const j=b*100+y;if(data.grid.labels[j]===z)result[j]+=raw[i]*kernel[da+3]*kernel[dx+3]}}for(const z of DZ){let before=0,after=0;for(let i=0;i<raw.length;i++)if(data.grid.labels[i]===z){before+=raw[i];after+=result[i]}if(after)for(let i=0;i<raw.length;i++)if(data.grid.labels[i]===z)result[i]*=before/after}return result}
function colors(viewer){
  const colors=[];
  for(let i=0;i<data.mesh.cells.length;i++){
    const cell=data.mesh.cells[i],z=data.mesh.zones[i];let col=bone;
    if(viewer.id==='receptor'){
      if(z===selectedZone&&Number.isFinite(data.grid.rmse[cell])&&data.grid.labels[cell]===z)
        col=receptorColor(data.grid.rmse[cell]);
      else if(DZ.includes(z))col=[.90,.875,.83];
    }else{
      if(z===selectedZone)col=[1,1,1];
      if(DZ.includes(z)&&data.grid.labels[cell]===z)
        col=scaledColor(frequency[cell],colorLimits.donor,COLOR_CONFIG.donor.stops);
    }
    colors.push(col);
  }
  viewer.attribute('color',triangles.flatMap(i=>colors[i]));viewer.draw();
}
function update(){
  const region=data.regions[selectedZone],raw=new Float32Array(23100);let shares,rmse,n;
  document.querySelectorAll('[data-zone]').forEach(b=>{b.classList.toggle('active',Number(b.dataset.zone)===selectedZone);b.setAttribute('aria-pressed',String(Number(b.dataset.zone)===selectedZone))});
  $('receptor-title').textContent=region.name;$('selection-name').textContent=region.name;
  if(selectedCell!==null){const pairs=data.winners[selectedCell];n=data.grid.n[selectedCell];shares=DZ.map(()=>0);for(let i=0;i<pairs.length;i+=2){const cell=pairs[i],count=pairs[i+1];raw[cell]+=100*count/n;const zi=DZ.indexOf(data.grid.labels[cell]);if(zi>=0)shares[zi]+=100*count/n}rmse=data.grid.rmse[selectedCell];$('selection-kind').textContent=`Ubicación puntual · ${Math.floor(selectedCell/100)+20}° / ML ${fmt((selectedCell%100)/49.5-1,2)}`;$('reset-selection').hidden=false;
  }else{raw.set(region.origin);shares=region.shares;rmse=region.rmse;$('selection-kind').textContent='Toda la región receptora';$('reset-selection').hidden=true}
  frequency=smoothOrigin(raw);let max=0;donorPeak=null;for(let i=0;i<frequency.length;i++)if(DZ.includes(data.grid.labels[i])&&frequency[i]>max){max=frequency[i];donorPeak=i}
  const regionalValues=data.grid.rmse.filter((value,i)=>data.grid.labels[i]===selectedZone&&Number.isFinite(value));
  colorLimits.receptor=[Math.min(...regionalValues),Math.max(...regionalValues)];
  colorLimits.donor=[0,max];
  $('rmse').textContent=fmt(rmse);
  $('rmse-min').textContent=`${fmt(colorLimits.receptor[0])} mm`;
  $('rmse-max').textContent=`${fmt(colorLimits.receptor[1])} mm`;
  updateReceptorLegend();
  $('donor-min').textContent='0 %';
  $('donor-max').textContent=`${fmt(max,max<.01?5:3)} %`;
  $('donor-scale').textContent='Ganadores por celda · Naranja intenso = mayor frecuencia';
  const ordered=DZ.map((z,i)=>({name:DN[i],long:LONG[i],share:shares[i]})).sort((a,b)=>b.share-a.share);
  $('donor-bars').replaceChildren(...ordered.map(item=>{const row=document.createElement('div');row.className='bar-row';row.title=item.long;const name=document.createElement('span');name.textContent=item.name;const track=document.createElement('div');track.className='bar-track';const fill=document.createElement('div');fill.className='bar-fill';fill.style.width=item.share+'%';track.append(fill);const val=document.createElement('span');val.className='bar-value';val.textContent=fmt(item.share,1);row.append(name,track,val);return row}));
  $('selection-kind').textContent=selectedCell===null?'Toda la región':'Ubicación seleccionada en el modelo';
  const publicNames={LTR:'Cresta lateral',MTR:'Cresta medial',LICN:'Escotadura lateral',MICN:'Escotadura medial',CICN:'Escotadura central'};
  document.querySelectorAll('.bar-row').forEach((row,i)=>{row.firstElementChild.textContent=publicNames[ordered[i].name]});
  $('top-donor').textContent=ordered[0].long;
  colors(receptorViewer);colors(donorViewer);
  window.atlasState={zone:selectedZone,cell:selectedCell,rmse,n:selectedCell===null?35:n,shares,total:shares.reduce((a,b)=>a+b,0),frequencyMass:frequency.reduce((a,b)=>a+b,0),donorPeak};
}
function selectRegion(zone){selectedZone=zone;selectedCell=null;update();const view=zone===9||zone===10?'posterior':zone===3?'anterior':'distal';setCamera('receptor',view)}
function setCamera(id,view){const v=id==='receptor'?receptorViewer:donorViewer;v.setView(view==='reset'?(id==='donor'?'anterior':'distal'):view);document.querySelectorAll(`[data-viewer="${id}"] button`).forEach(b=>b.classList.toggle('active',b.dataset.view===view))}
for(const name of ['method','details']){$(name+'-open').onclick=()=>$(name+'-dialog').showModal();$(name+'-dialog').querySelector('.dialog-close').onclick=()=>$(name+'-dialog').close();$(name+'-dialog').querySelector('.dialog-close-action')?.addEventListener('click',()=>$(name+'-dialog').close())}
document.querySelectorAll('[data-zone]').forEach(b=>b.onclick=()=>selectRegion(Number(b.dataset.zone)));
$('reset-selection').onclick=()=>selectRegion(selectedZone);
document.querySelectorAll('button[data-zoom]').forEach(button=>button.onclick=()=>{
  const viewer=button.dataset.viewer==='receptor'?receptorViewer:donorViewer;
  if(!viewer)return;
  viewer.distance=clamp(viewer.distance*(button.dataset.zoom==='in'?.85:1/.85),1.4,8);
  viewer.draw();
});
document.querySelectorAll('button[data-model-view]').forEach(button=>button.onclick=()=>{
  $('workspace').dataset.modelView=button.dataset.modelView;
  document.querySelectorAll('button[data-model-view]').forEach(item=>{
    const active=item===button;item.classList.toggle('active',active);item.setAttribute('aria-pressed',String(active));
  });
});
$('receptor-contrast').onchange=e=>{receptorContrast=e.target.value;if(data&&receptorViewer){updateReceptorLegend();colors(receptorViewer)}};
document.querySelectorAll('.camera-controls button').forEach(b=>b.onclick=()=>setCamera(b.closest('[data-viewer]').dataset.viewer,b.dataset.view));
async function init(){
  try{
    const response=await fetch('assets/cohorte.json');
    if(!response.ok)throw Error('No fue posible cargar los datos de cohorte.');
    data=await response.json();triangles=data.mesh.triangles;
    const original=data.mesh.points,min=[Infinity,Infinity,Infinity],max=[-Infinity,-Infinity,-Infinity];
    for(let i=0;i<original.length;i++){min[i%3]=Math.min(min[i%3],original[i]);max[i%3]=Math.max(max[i%3],original[i])}
    const center=min.map((v,i)=>(v+max[i])/2),scale=2/Math.max(...max.map((v,i)=>v-min[i]));
    vertices=original.map((v,i)=>(v-center[i%3])*scale);
    receptorViewer=new Viewer('receptor','distal');donorViewer=new Viewer('donor','anterior');
    update();$('loading').hidden=true;$('workspace').setAttribute('aria-busy','false');window.atlasReady=true;
  }catch(error){$('loading').hidden=false;$('loading').textContent=error.message;console.error(error)}
}
init();
