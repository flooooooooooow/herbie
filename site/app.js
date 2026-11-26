import {createVehicleState,stepVehicle,toleranceSamples} from "./model.js";
import {createFullCarState,fullCarStep,defaultRideParameters} from "./fullcar.js";

const $=id=>document.getElementById(id);
const names=["fl","fr","rl","rr"];
const sliderIds=["throttle","brake","steer","spring","damper","antiroll","roughness","mu","grade","tolerance","heat"];
let state=createFullCarState(createVehicleState());
let running=true,lastFrame=null,accumulator=0,traceClock=0;
let viewer=null,focus="overview",samples=null;
let history=[{t:0,heave:0,fl:0,rr:0,v:0,temperature:24}];
const input={throttle:0.38,brake:0,steer:0,roughness:0.038,mu:0.85,grade:0,
 springScale:1,damperScale:1,antirollScale:1};

const fmt=(x,n=1)=>Number.isFinite(x)?x.toFixed(n):"—";
function readControls(){
 input.throttle=Number($("throttle").value)/100;
 input.brake=Number($("brake").value)/100;
 input.steer=Number($("steer").value)/100;
 input.springScale=Number($("spring").value)/100;
 input.damperScale=Number($("damper").value)/100;
 input.antirollScale=Number($("antiroll").value)/100;
 input.roughness=Number($("roughness").value)/1000;
 input.mu=Number($("mu").value)/100;
 input.grade=Number($("grade").value);
 const labels={
  throttle:fmt(input.throttle*100,0)+"%",brake:fmt(input.brake*100,0)+"%",
  steer:fmt(input.steer,2)+" rad",spring:fmt(input.springScale*100,0)+"%",
  damper:fmt(input.damperScale*100,0)+"%",antiroll:fmt(input.antirollScale*100,0)+"%",
  roughness:fmt(input.roughness*1000,0)+" mm",mu:fmt(input.mu,2)+" μ",
  grade:fmt(input.grade,0)+"°",tolerance:fmt(Number($("tolerance").value)/100,2)+"×",
  heat:$("heat").value+"°C"};
 for(const id of sliderIds){const o=$(id+"-value");if(o)o.textContent=labels[id];}
 $("spring-k").innerHTML=fmt(defaultRideParameters.springNPerM[0]*input.springScale/1000,1)+' <small>kN/m</small>';
 $("damper-c").innerHTML=fmt(defaultRideParameters.damperNsPerM[0]*input.damperScale/1000,2)+' <small>kN·s/m</small>';
 updateTolerances();
}
function reset(speed=0){
 const base=createVehicleState();
 base.speed=speed;base.engineRpm=speed>0?3000:850;
 state=createFullCarState(base);
 history=[{t:0,heave:0,fl:0,rr:0,v:speed,temperature:24}];
 accumulator=0;traceClock=0;lastFrame=null;
 updateTelemetry();drawGraph();
}
function setPreset(kind){
 const presets={
  rough:{throttle:38,brake:0,steer:0,spring:100,damper:100,antiroll:100,roughness:38,mu:85,grade:0,speed:0},
  brake:{throttle:0,brake:82,steer:0,spring:100,damper:100,antiroll:100,roughness:10,mu:90,grade:0,speed:22},
  corner:{throttle:26,brake:0,steer:5,spring:100,damper:100,antiroll:100,roughness:24,mu:90,grade:0,speed:17},
  launch:{throttle:93,brake:0,steer:0,spring:100,damper:100,antiroll:100,roughness:16,mu:95,grade:0,speed:0},
  rest:{throttle:0,brake:0,steer:0,spring:100,damper:100,antiroll:100,roughness:0,mu:85,grade:0,speed:0}
 };
 const s=presets[kind];
 if(!s)return;
 for(const id of ["throttle","brake","steer","spring","damper","antiroll","roughness","mu","grade"])$(id).value=s[id];
 readControls();reset(s.speed);
 for(const b of document.querySelectorAll("[data-preset]"))b.classList.toggle("active",b.dataset.preset===kind);
}
function setFocus(part){
 focus=part;
 viewer?.setFocus(part);
 for(const b of document.querySelectorAll("[data-view]")){const active=b.dataset.view===part;b.classList.toggle("active",active);if(b.tagName==="BUTTON")b.setAttribute("aria-pressed",String(active));}
 for(const b of document.querySelectorAll(".corner-card"))b.classList.toggle("active",b.dataset.corner===part);
 updateInspector();
}
function updateInspector(){
 let title="Four-corner suspension assembly",copy="One body heaves, pitches and rolls while each wheel moves against its own spring, damper and tyre compliance.";
 let value='4 <small>corners</small>',caption="Coupled across one sprung body";
 if(names.includes(focus)){
  const i=names.indexOf(focus),label=["front left","front right","rear left","rear right"][i];
  title="Suspension / "+label;
  copy="Representative two-arm linkage, coilover strut, steering knuckle and independent tyre compliance. Visual hardpoint linkage is not a kinematic constraint solver.";
  value=fmt(state.suspensionCompressionM[i]*1000,1)+' <small>mm</small>';
  caption="Relative sprung/unsprung travel";
 } else if(focus==="top"){title="Body heave, pitch & roll";value=fmt(state.ride.rollRad*180/Math.PI,2)+' <small>°</small>';caption="Sprung-body roll";
 } else if(focus==="side"){title="Longitudinal weight transfer";value=fmt(state.ride.pitchRad*180/Math.PI,2)+' <small>°</small>';caption="Sprung-body pitch";
 }
 $("inspector-title").textContent=title;$("inspector-copy").textContent=copy;
 $("inspector-value").innerHTML=value;$("inspector-caption").textContent=caption;
}
function updateTelemetry(){
 const b=state.base,r=state.ride;
 $("speed").innerHTML=fmt(b.speed*3.6,1)+" <small>km/h</small>";
 $("rpm").innerHTML=fmt(b.engineRpm,0)+" <small>rpm</small>";
 $("gear").textContent="Automatic · gear "+b.gear;
 $("heave").innerHTML=fmt(r.heaveM*1000,1)+" <small>mm</small>";
 $("angles").innerHTML=fmt(r.pitchRad*180/Math.PI,2)+"° <small>/ "+fmt(r.rollRad*180/Math.PI,2)+"°</small>";
 $("temperature").innerHTML=fmt(b.engineTemperatureC,1)+" <small>°C</small>";
 $("power").textContent=fmt(b.enginePowerKw,1)+" kW mechanical";
 $("elapsed").innerHTML=fmt(b.time,1)+" <small>s</small>";
 $("long-g").innerHTML=fmt(b.acceleration/9.80665,2)+" <small>g</small>";
 $("lat-g").innerHTML=fmt(b.lateralAcceleration/9.80665,2)+" <small>g</small>";
 names.forEach((id,i)=>{
  const q=state.suspensionCompressionM[i]*1000;
  const load=state.wheelLoadsN[i];
  $(id+"-travel").textContent=fmt(q,1);
  $(id+"-load").textContent=fmt(load,0)+" N";
  $(id+"-bar").style.width=Math.round(Math.min(100,load/8000*100))+"%";
  const contact=$(id+"-contact");
  contact.textContent=load<=1?"AIRBORNE":"CONTACT";
  contact.classList.toggle("airborne",load<=1);
 });
 updateInspector();
}
function canvas(id){
 const el=$(id),box=el.getBoundingClientRect();
 const w=Math.max(230,Math.round(box.width)),h=Math.max(160,Math.round(box.height));
 const pixelRatio=Math.min(2,window.devicePixelRatio||1);
 const realW=Math.round(w*pixelRatio),realH=Math.round(h*pixelRatio);
 if(el.width!==realW||el.height!==realH){el.width=realW;el.height=realH;}
 const ctx=el.getContext("2d");ctx.setTransform(pixelRatio,0,0,pixelRatio,0,0);
 ctx.clearRect(0,0,w,h);return {ctx,w,h};
}
function drawGraph(){
 const {ctx,w,h}=canvas("graph"),left=46,right=w-14,top=19,bottom=h-29;
 ctx.fillStyle="#ffffff";ctx.fillRect(0,0,w,h);
 const recent=history.slice(-700),time=state.base.time,start=Math.max(0,time-30);
 const data=recent.filter(x=>x.t>=start),duration=Math.max(1,time-start);
 const maxAbs=Math.max(25,...data.map(p=>Math.max(Math.abs(p.heave),Math.abs(p.fl),Math.abs(p.rr))));
 const bound=Math.ceil(maxAbs/20)*20;
 ctx.lineWidth=1;ctx.font="10px ui-sans-serif, sans-serif";
 for(let i=0;i<=4;i++){
  const y=top+(bottom-top)*i/4;
  ctx.strokeStyle="#dce3eb";ctx.beginPath();ctx.moveTo(left,y);ctx.lineTo(right,y);ctx.stroke();
  ctx.fillStyle="#465b70";ctx.fillText(fmt(bound*(1-i/2),0),6,y+3);
 }
 ctx.fillText("mm",8,12);
 for(let i=0;i<=5;i++){const x=left+(right-left)*i/5;ctx.strokeStyle="#dce3eb";ctx.beginPath();ctx.moveTo(x,top);ctx.lineTo(x,bottom);ctx.stroke();ctx.textAlign=i===0?"left":i===5?"right":"center";ctx.fillText(fmt(start+duration*i/5,1),x,bottom+13);}ctx.textAlign="center";ctx.fillText("Time (s)",(left+right)/2,h-3);ctx.textAlign="left";
 for(const [key,color] of [["heave","#0072bd"],["fl","#d95319"],["rr","#7e2f8e"]]){
  ctx.beginPath();data.forEach((p,i)=>{
   const x=left+(p.t-start)/duration*(right-left);
   const y=top+(1-(p[key]/bound+1)*0.5)*(bottom-top);
   if(i===0)ctx.moveTo(x,y);else ctx.lineTo(x,y);
  });ctx.strokeStyle=color;ctx.lineWidth=1.9;ctx.stroke();
 }
}
function updateTolerances(){
 const spec={scale:Number($("tolerance").value)/100,deltaTC:Number($("heat").value)};
 samples=toleranceSamples(spec,1500,20261116);
 $("range-value").textContent=fmt(samples.bounds.minimumMm,3)+"–"+fmt(samples.bounds.maximumMm,3)+" mm";
 $("pass-value").textContent=fmt(samples.passRate*100,1)+"%";
 $("cpk-value").textContent=Number.isFinite(samples.cpk)?fmt(samples.cpk,2):"N/A";
 $("sample-note").textContent=samples.failures+" of 1,500 synthetic samples fell outside the 0–0.15 mm clearance specification. No measured manufacturing data.";
 drawHistogram();
}
function drawHistogram(){
 if(!samples)return;
 const {ctx,w,h}=canvas("histogram"),bins=40,lo=-0.10,hi=0.30,left=32,right=w-15,top=20,bottom=h-34;
 ctx.fillStyle="#ffffff";ctx.fillRect(0,0,w,h);
 const counts=new Array(bins).fill(0);
 for(const x of samples.samples){const i=Math.floor((x-lo)/(hi-lo)*bins);if(i>=0&&i<bins)counts[i]++;}
 const xTo=v=>left+(v-lo)/(hi-lo)*(right-left);
 ctx.fillStyle="#e0eef8";ctx.fillRect(xTo(0),top,xTo(0.15)-xTo(0),bottom-top);
 const max=Math.max(1,...counts),bw=(right-left)/bins;
 for(let i=0;i<bins;i++){
  const bh=counts[i]/max*(bottom-top-16);
  ctx.fillStyle=i<Math.floor((0-lo)/(hi-lo)*bins)||i>Math.ceil((0.15-lo)/(hi-lo)*bins)?"#c95d36":"#347bb3";
  ctx.fillRect(left+i*bw+1,bottom-bh,Math.max(1,bw-2),bh);
 }
 ctx.strokeStyle="#a54b20";ctx.setLineDash([5,4]);ctx.lineWidth=1;
 for(const x of [0,0.15]){ctx.beginPath();ctx.moveTo(xTo(x),top);ctx.lineTo(xTo(x),bottom);ctx.stroke();}
 ctx.setLineDash([]);ctx.font="11px ui-sans-serif, sans-serif";ctx.fillStyle="#465b70";
 for(const v of [-.05,0,.05,.10,.15,.2,.25])ctx.fillText(fmt(v,2),xTo(v)-12,h-14);
 ctx.fillText("FIT CLEARANCE / mm",left,12);
}
function downloadTrace(){
 const fields=["time_s","speed_kmh","engine_c","body_heave_mm","front_left_travel_mm","rear_right_travel_mm"];
 const rows=history.map(p=>[p.t,p.v*3.6,p.temperature,p.heave,p.fl,p.rr].join(","));
 const blob=new Blob([[fields.join(","),...rows].join("\n")+"\n"],{type:"text/csv;charset=utf-8"});
 const url=URL.createObjectURL(blob),link=document.createElement("a");
 link.href=url;link.download="herbie-fullcar-telemetry.csv";document.body.appendChild(link);link.click();link.remove();
 setTimeout(()=>URL.revokeObjectURL(url),1000);
}
async function installViewer(){
 try{
  const {createCarViewer}=await import("./car3d.js");
  viewer=createCarViewer($("viewport3d"));
  viewer.onPick(part=>setFocus(part));
  viewer.setFocus(focus);
  viewer.setCutaway($("cutaway").checked);
  viewer.setForces($("forces").checked);
  viewer.render(state,input);
 }catch(error){
  const el=$("render-error");el.hidden=false;
  el.textContent="The 3D renderer could not initialize. Check WebGL support and access to the pinned Three.js modules. Numerical telemetry remains usable. ";
  const detail=document.createElement("code");detail.textContent=String(error?.message||error);
  detail.style.display="block";detail.style.marginTop="16px";
  el.appendChild(detail);
  console.error("Herbie 3D renderer unavailable",error);
 }
}
function frame(timestamp){
 if(lastFrame===null)lastFrame=timestamp;
 const delta=Math.min(0.06,Math.max(0,(timestamp-lastFrame)/1000));lastFrame=timestamp;
 if(running){
  accumulator+=delta;let n=0;
  while(accumulator>=0.01&&n<6){
   try{state=fullCarStep(state,input,0.01,stepVehicle);}
   catch(error){running=false;updateRunStatus("error");console.error("Physics stopped",error);break;}
   accumulator-=0.01;n++;traceClock+=0.01;
   if(traceClock>=0.05){
    history.push({t:state.time,heave:state.ride.heaveM*1000,
     fl:state.suspensionCompressionM[0]*1000,rr:state.suspensionCompressionM[3]*1000,
     v:state.base.speed,temperature:state.base.engineTemperatureC});
    traceClock=0;
   }
  }
  if(history.length>1500)history.splice(0,history.length-1500);
  updateTelemetry();
 }
 if(!document.querySelector('[data-workspace="vehicle"]').hidden){viewer?.render(state,input);drawGraph();}
 requestAnimationFrame(frame);
}
for(const id of sliderIds)$(id).addEventListener("input",readControls);
for(const button of document.querySelectorAll("[data-preset]"))button.addEventListener("click",()=>setPreset(button.dataset.preset));
for(const button of document.querySelectorAll("[data-view]"))button.addEventListener("click",()=>setFocus(button.dataset.view));
for(const button of document.querySelectorAll("[data-corner]"))button.addEventListener("click",()=>setFocus(button.dataset.corner));
function updateRunStatus(status=running?"running":"paused"){
 const el=$("solver-status");
 el.textContent=status==="error"?"Solver error":running?"Running":"Paused";
 el.parentElement.dataset.state=status;
 $("toggle").textContent=running?"Pause simulation":"Resume simulation";
}
$("toggle").addEventListener("click",()=>{running=!running;updateRunStatus();});
$("reset").addEventListener("click",()=>reset());
$("csv").addEventListener("click",downloadTrace);
$("cutaway").addEventListener("change",()=>viewer?.setCutaway($("cutaway").checked));
$("forces").addEventListener("change",()=>viewer?.setForces($("forces").checked));
window.addEventListener("resize",()=>{drawGraph();drawHistogram();});
function showWorkspace(){
 const hash=location.hash.slice(1);
 const name=hash==="manufacturing"?"manufacturing":hash==="method"?"method":"vehicle";
 for(const panel of document.querySelectorAll("[data-workspace]"))panel.hidden=panel.dataset.workspace!==name;
 for(const link of document.querySelectorAll("[data-workspace-link]")){
  if(link.dataset.workspaceLink===name)link.setAttribute("aria-current","page");
  else link.removeAttribute("aria-current");
 }
 requestAnimationFrame(()=>{
  if(name==="vehicle")drawGraph();else if(name==="manufacturing")drawHistogram();
  if(hash)document.getElementById(hash)?.scrollIntoView({block:"nearest"});
 });
}
window.addEventListener("hashchange",showWorkspace);
for(const link of document.querySelectorAll(".model-tree a[data-view]"))link.addEventListener("click",()=>{if(location.hash==="#lab")showWorkspace();});
showWorkspace();setFocus("overview");updateRunStatus();
readControls();updateTelemetry();installViewer();requestAnimationFrame(frame);
