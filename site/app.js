import {createVehicleState,stepVehicle,toleranceSamples,defaultParameters} from "./model.js";
const $=id=>document.getElementById(id);
const ids=["throttle","brake","steer","roughness","mu","grade","tolerance","heat"];
const controls={throttle:0.36,brake:0,steer:0,roughness:0.02,mu:0.85,grade:0};
let state=createVehicleState(),running=true,selected="engine",lastFrame=0,accumulator=0,sampleClock=0;
let history=[{time:0,speed:0,temp:24,x:0,y:0}],tolerance=null;
const descriptions={
 engine:["Engine & torque map","Interpolated torque envelope, idle floor and temperature derate. No combustion or crank-angle model.","engine.flow",s=>[s.engineTorqueNm.toFixed(1)+" Nm","Crankshaft torque"]],
 gearbox:["Transmission","Five automatic ratios, final reduction and constant driveline efficiency. Instantaneous gear changes, no clutch dynamics.","mechanics.flow",s=>["Gear "+s.gear+" / 5","Current ratio "+defaultParameters.gearRatios[s.gear-1].toFixed(2)+":1"]],
 suspension:["Front / rear suspension","Two independent, representative quarter-car models integrated by RK4 with road input and damping. No body pitch or roll.","vehicle.flow",s=>[(1000*(s.front.zs-s.front.zu)).toFixed(1)+" mm","Front spring travel"]],
 tyres:["Tyre contact forces","Linear small-slip bicycle forces, front/rear approximate friction-circle saturation and longitudinal traction cap.","vehicle.flow",s=>[(100*s.tractionUtilization).toFixed(1)+"%","Longitudinal grip used"]],
 brakes:["Brake system","Driver-command braking limited by available friction; lumped brake disc energy and convective cooling.","powertrain.flow",s=>[s.brakeTemperatureC.toFixed(1)+" °C","Representative brake temperature"]],
 steering:["Steering / yaw","Low-speed kinematic steering and linear bicycle dynamics above 2 m/s. No steering rack or linkage geometry.","vehicle.flow",s=>[(s.yawRate*180/Math.PI).toFixed(2)+" °/s","Yaw rate"]],
 cooling:["Engine thermal loop","Simplified engine heat capacity with speed-dependent cooling. Not a coolant circuit, radiator map or thermostat.","thermal.flow",s=>[(s.engineHeatW/1000).toFixed(1)+" kW","Modelled heat input"]],
 chassis:["Chassis load / stress proxy","Absolute net tyre force divided by an illustrative section area; deliberately not FEA or actual chassis strength.","structures.flow",s=>[(s.chassisStressPa/1e6).toFixed(1)+" MPa","Scalar stress proxy"]]
};
function readInputs(){
 controls.throttle=Number($("throttle").value)/100;
 controls.brake=Number($("brake").value)/100;
 controls.steer=Number($("steer").value)/100;
 controls.roughness=Number($("roughness").value)/1000;
 controls.mu=Number($("mu").value)/100;
 controls.grade=Number($("grade").value);
 const labels={throttle:Math.round(controls.throttle*100)+"%",brake:Math.round(controls.brake*100)+"%",
  steer:controls.steer.toFixed(2)+" rad",roughness:Math.round(controls.roughness*1000)+" mm",
  mu:controls.mu.toFixed(2)+" μ",grade:controls.grade+"°",
  tolerance:(Number($("tolerance").value)/100).toFixed(2)+"×",heat:$("heat").value+"°C"};
 for(const id of ids)$(id+"-value")&&( $(id+"-value").textContent=labels[id] );
 $("heat-value").textContent=labels.heat;
 updateTolerance();
}
function updateTolerance(){
 tolerance=toleranceSamples({scale:Number($("tolerance").value)/100,deltaTC:Number($("heat").value)},1500,20261116);
 const b=tolerance.bounds;
 $("range-value").textContent=b.minimumMm.toFixed(3)+"–"+b.maximumMm.toFixed(3)+" mm";
 $("pass-value").textContent=(100*tolerance.passRate).toFixed(1)+"%";
 $("cpk-value").textContent=Number.isFinite(tolerance.cpk)?tolerance.cpk.toFixed(2):"N/A";
 $("sample-note").textContent=tolerance.failures+" of "+tolerance.count+" synthetic assemblies outside the 0–0.15 mm fit specification. The sample is seeded and repeatable, not measured production data.";
 drawHistogram();
}
function renderTelemetry(){
 $("speed").textContent=(state.speed*3.6).toFixed(1);
 $("rpm").textContent=Math.round(state.engineRpm).toString();
 $("gear").textContent="Gear "+state.gear+" · automatic";
 $("force").textContent=Math.round(state.wheelForceN).toLocaleString("en-GB");
 $("traction").textContent="Grip utilization "+Math.round(100*state.tractionUtilization)+"%";
 $("temperature").textContent=state.engineTemperatureC.toFixed(1);
 $("power").textContent=state.enginePowerKw.toFixed(1)+" kW · shaft output";
 $("elapsed").textContent=state.time.toFixed(1);
 $("distance").textContent=state.distance.toFixed(1)+" m travelled";
 const item=descriptions[selected];
 $("component-title").textContent=item[0];
 $("component-copy").textContent=item[1];
 const [v,caption]=item[3](state);
 $("component-value").textContent=v;
 $("component-caption").textContent=caption;
 $("component-source").href="https://github.com/flooooooooooow/herbie/blob/main/src/"+item[2];
}
function canvas(id){
 const el=$(id),dpr=window.devicePixelRatio||1,box=el.getBoundingClientRect();
 const w=Math.max(240,Math.floor(box.width)),h=Math.max(180,Math.floor(box.height));
 if(el.width!==Math.floor(w*dpr)||el.height!==Math.floor(h*dpr)){el.width=Math.floor(w*dpr);el.height=Math.floor(h*dpr);}
 const ctx=el.getContext("2d");ctx.setTransform(dpr,0,0,dpr,0,0);
 ctx.clearRect(0,0,w,h);return {ctx,w,h};
}
function drawTrack(){
 const {ctx,w,h}=canvas("track");
 ctx.fillStyle="#101d2c";ctx.fillRect(0,0,w,h);
 const scale=4,ox=w/2,oy=h/2;
 ctx.strokeStyle="#23374b";ctx.lineWidth=1;
 for(let x=ox%40;x<w;x+=40){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,h);ctx.stroke();}
 for(let y=oy%40;y<h;y+=40){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(w,y);ctx.stroke();}
 ctx.fillStyle="#72899c";ctx.font="11px ui-sans-serif, sans-serif";ctx.fillText("10 px = 2.5 m",12,18);
 ctx.beginPath();
 history.forEach((p,i)=>{const x=ox+(p.x-state.x)*scale,y=oy-(p.y-state.y)*scale;if(i===0)ctx.moveTo(x,y);else ctx.lineTo(x,y);});
 ctx.strokeStyle="#7ec8c2";ctx.lineWidth=2;ctx.stroke();
 ctx.save();ctx.translate(ox,oy);ctx.rotate(-state.heading);
 ctx.fillStyle="#9dc8d8";ctx.strokeStyle="#f2dbc1";ctx.lineWidth=2;ctx.fillRect(-18,-8,36,16);ctx.strokeRect(-18,-8,36,16);
 ctx.fillStyle="#e7ad68";ctx.fillRect(7,-6,7,12);
 ctx.fillStyle="#182938";ctx.fillRect(-12,-11,7,4);ctx.fillRect(-12,7,7,4);ctx.fillRect(8,-11,7,4);ctx.fillRect(8,7,7,4);
 ctx.restore();
 ctx.fillStyle="#8ba5b7";ctx.fillText("X "+state.x.toFixed(1)+" m / Y "+state.y.toFixed(1)+" m",12,h-13);
}
function drawGraph(){
 const {ctx,w,h}=canvas("graph"),left=39,right=w-10,top=19,bottom=h-28;
 const shown=history.slice(-700),end=state.time,start=Math.max(0,end-35);
 const visible=shown.filter(p=>p.time>=start);
 ctx.fillStyle="#101d2c";ctx.fillRect(0,0,w,h);
 ctx.font="10px ui-sans-serif, sans-serif";ctx.strokeStyle="#2b4051";ctx.fillStyle="#90a4b7";ctx.lineWidth=1;
 for(let i=0;i<=4;i++){
  const y=top+(bottom-top)*i/4;ctx.beginPath();ctx.moveTo(left,y);ctx.lineTo(right,y);ctx.stroke();
  ctx.fillText(String(140-35*i),5,y+3);
 }
 ctx.fillText("km/h",3,12);ctx.fillText("°C × 1",right-36,12);
 for(const [key,scale,color] of [["speed",3.6,"#84b7ec"],["temp",1,"#e7ad68"]]){
  ctx.beginPath();visible.forEach((p,i)=>{
   const x=left+(p.time-start)/35*(right-left),y=bottom-Math.min(140,p[key]*scale)/140*(bottom-top);
   if(i===0)ctx.moveTo(x,y);else ctx.lineTo(x,y);
  });ctx.strokeStyle=color;ctx.lineWidth=2;ctx.stroke();
 }
 ctx.fillStyle="#90a4b7";ctx.fillText(Math.floor(start)+"s",left,bottom+18);ctx.fillText(end.toFixed(1)+"s",right-38,bottom+18);
}
function drawHistogram(){
 if(!tolerance)return;
 const {ctx,w,h}=canvas("histogram"),buckets=32,pad=38,plotH=h-50,lo=-0.06,hi=0.25;
 ctx.fillStyle="#101d2c";ctx.fillRect(0,0,w,h);
 const counts=Array(buckets).fill(0);
 for(const v of tolerance.samples){const i=Math.floor((v-lo)/(hi-lo)*buckets);if(i>=0&&i<buckets)counts[i]++;}
 const max=Math.max(1,...counts),barW=(w-pad-12)/buckets;
 const xOf=v=>pad+(v-lo)/(hi-lo)*(w-pad-12);
 ctx.fillStyle="#233c4f";
 ctx.fillRect(xOf(0),10,xOf(0.15)-xOf(0),plotH-10);
 for(let i=0;i<buckets;i++){
  const x=pad+i*barW,y=plotH-counts[i]/max*(plotH-25);
  ctx.fillStyle=i<Math.floor((0-lo)/(hi-lo)*buckets)||i>=Math.ceil((0.15-lo)/(hi-lo)*buckets)?"#ba7e60":"#7ec8c2";
  ctx.fillRect(x+1,y,Math.max(1,barW-2),plotH-y);
 }
 ctx.fillStyle="#9aafbe";ctx.font="11px ui-sans-serif, sans-serif";
 for(const x of [0,0.05,0.1,0.15,0.2])ctx.fillText(x.toFixed(2),xOf(x)-10,h-17);
 ctx.fillText("CLEARANCE [mm]",pad,14);
 for(const limit of [0,0.15]){ctx.beginPath();ctx.setLineDash([4,4]);ctx.moveTo(xOf(limit),10);ctx.lineTo(xOf(limit),plotH);ctx.strokeStyle="#ecb46a";ctx.stroke();ctx.setLineDash([]);}
}
function frame(t){
 if(!lastFrame)lastFrame=t;
 const elapsed=Math.min(0.06,Math.max(0,(t-lastFrame)/1000));lastFrame=t;
 if(running){
  accumulator+=elapsed;
  let steps=0;
  while(accumulator>=0.01&&steps<6){
   state=stepVehicle(state,controls,0.01);
   accumulator-=0.01;steps++;sampleClock+=0.01;
   if(sampleClock>=0.05){history.push({time:state.time,speed:state.speed,temp:state.engineTemperatureC,x:state.x,y:state.y});sampleClock=0;}
  }
  if(history.length>1200)history.splice(0,history.length-1200);
  renderTelemetry();
 }
 drawTrack();drawGraph();requestAnimationFrame(frame);
}
function reset(){
 state=createVehicleState();history=[{time:0,speed:0,temp:24,x:0,y:0}];accumulator=0;sampleClock=0;
 renderTelemetry();drawTrack();drawGraph();
}
for(const id of ids)$(id).addEventListener("input",readInputs);
for(const b of document.querySelectorAll(".part"))b.addEventListener("click",()=>{
 selected=b.dataset.part;
 for(const button of document.querySelectorAll(".part"))button.classList.toggle("active",button===b);
 renderTelemetry();
});
const presets={
 launch:{throttle:85,brake:0,steer:0,roughness:0,mu:95,grade:0},
 braking:{throttle:0,brake:100,steer:0,roughness:0,mu:85,grade:0},
 corner:{throttle:32,brake:0,steer:5,roughness:0,mu:85,grade:0},
 rough:{throttle:42,brake:0,steer:0,roughness:70,mu:70,grade:3}
};
for(const button of document.querySelectorAll("[data-preset]"))button.addEventListener("click",()=>{
 const settings=presets[button.dataset.preset];
 for(const [key,value] of Object.entries(settings))$(key).value=value;
 readInputs();
});
$("toggle").addEventListener("click",()=>{running=!running;$("toggle").textContent=running?"Pause simulation":"Resume simulation";});
$("reset").addEventListener("click",reset);
$("csv").addEventListener("click",()=>{
 const rows=["time_s,speed_mps,engine_temp_c,x_m,y_m",...history.map(p=>[p.time,p.speed,p.temp,p.x,p.y].join(","))];
 const url=URL.createObjectURL(new Blob([rows.join("\n")+"\n"],{type:"text/csv"}));
 const a=document.createElement("a");a.href=url;a.download="herbie-vehicle-trace.csv";document.body.appendChild(a);a.click();a.remove();
 setTimeout(()=>URL.revokeObjectURL(url),1000);
});
window.addEventListener("resize",()=>{drawTrack();drawGraph();drawHistogram();});
readInputs();renderTelemetry();requestAnimationFrame(frame);
