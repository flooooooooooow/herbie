import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { cornerMeta, defaultRideParameters } from "./fullcar.js";

const wood = 0x182835;
const mat = (color,metalness=0.25,roughness=0.45)=>new THREE.MeshStandardMaterial({color,metalness,roughness});
const steel=mat(0x718495,0.82,0.31),metalDark=mat(0x20303c,0.78,0.29);
const black=mat(0x111b23,0.1,0.9),rubber=mat(0x141a20,0.02,0.94);
const rim=mat(0xc1d1d8,0.78,0.24),copper=mat(0xe5ab70,0.62,0.3);
const turquoise=mat(0x7bddcd,0.4,0.31),red=mat(0xe7856d,0.3,0.35);
const glass=new THREE.MeshPhysicalMaterial({color:0x9ddbe8,roughness:0.12,metalness:0.10,transparent:true,opacity:0.45,depthWrite:false,side:THREE.DoubleSide});
const paint=new THREE.MeshPhysicalMaterial({color:0x3c92ac,metalness:0.68,roughness:0.27,clearcoat:0.75,clearcoatRoughness:0.18,transparent:true,opacity:0.89,depthWrite:false,side:THREE.DoubleSide});
const number=(x)=>Number.isFinite(x)?x:0;
function mesh(parent,geometry,material,x=0,y=0,z=0){
  const m=new THREE.Mesh(geometry,material);m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;parent.add(m);return m;
}
function box(parent,w,h,d,material,x,y,z){
  return mesh(parent,new THREE.BoxGeometry(w,h,d),material,x,y,z);
}
function sphere(parent,r,material,x,y,z){
  return mesh(parent,new THREE.SphereGeometry(r,13,10),material,x,y,z);
}
function rod(parent,r,material){
  const cylinder=mesh(parent,new THREE.CylinderGeometry(r,r,1,10),material);
  cylinder.userData.isRod=true;return cylinder;
}
function setRod(obj,a,b){
  const delta=new THREE.Vector3().subVectors(b,a);
  obj.position.copy(a).addScaledVector(delta,0.5);
  obj.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),delta.clone().normalize());
  obj.scale.set(1,Math.max(0.0001,delta.length()),1);
}
function planeQuad(parent,points,material){
  const geo=new THREE.BufferGeometry();
  const vertices=new Float32Array([...points[0],...points[1],...points[2],...points[0],...points[2],...points[3]]);
  geo.setAttribute("position",new THREE.BufferAttribute(vertices,3));
  geo.computeVertexNormals();
  return mesh(parent,geo,material);
}
function coilGeometry(turns=8,radius=0.075){
  const pts=[];
  for(let i=0;i<=160;i++){
    const t=i/160,a=t*turns*2*Math.PI;
    pts.push(new THREE.Vector3(radius*Math.cos(a),t,radius*Math.sin(a)));
  }
  return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts),200,0.009,6,false);
}
const springGeometry=coilGeometry();
function createWheel(parent,index){
  const wheelBase=new THREE.Group();parent.add(wheelBase);
  const spin=new THREE.Group();wheelBase.add(spin);
  mesh(spin,new THREE.TorusGeometry(0.270,0.073,12,48),rubber);
  const tread=mesh(spin,new THREE.CylinderGeometry(0.292,0.292,0.19,48,1,true),rubber);
  tread.rotation.x=Math.PI/2;
  const rubberSide=mesh(spin,new THREE.CylinderGeometry(0.267,0.267,0.205,48),black);
  rubberSide.rotation.x=Math.PI/2;
  for(const side of [-1,1]){
    const z=side*0.112;
    const disc=mesh(spin,new THREE.CylinderGeometry(0.215,0.215,0.011,40),metalDark,0,0,z);
    disc.rotation.x=Math.PI/2;
    const ring=mesh(spin,new THREE.TorusGeometry(0.19,0.012,8,40),rim,0,0,z+side*.01);
    for(let spoke=0;spoke<10;spoke++){
      const a=spoke*Math.PI/5;
      const bar=box(spin,0.155,0.026,0.026,rim,Math.cos(a)*0.085,Math.sin(a)*0.085,z+side*.014);
      bar.rotation.z=a;
    }
    const hub=mesh(spin,new THREE.CylinderGeometry(0.045,0.045,0.028,20),copper,0,0,z+side*.025);
    hub.rotation.x=Math.PI/2;
  }
  const caliper=box(wheelBase,0.09,0.105,0.09,copper,-0.17,0.11,index%2===0?0.10:-0.10);
  return {wheelBase,spin,caliper};
}
function createPanelShell(body){
  const shape=new THREE.Shape();
  shape.moveTo(-2.00,-0.32);
  shape.lineTo(1.99,-0.32);
  shape.lineTo(2.04,-0.10);
  shape.lineTo(1.85,0.16);
  shape.lineTo(0.86,0.24);
  shape.lineTo(0.55,0.65);
  shape.lineTo(-0.75,0.66);
  shape.lineTo(-1.07,0.23);
  shape.lineTo(-1.85,0.17);
  shape.lineTo(-2.03,-0.10);
  shape.closePath();
  const geo=new THREE.ExtrudeGeometry(shape,{depth:1.61,steps:1,bevelEnabled:true,bevelThickness:0.065,bevelSize:0.045,bevelSegments:3,curveSegments:12});
  geo.translate(0,0,-0.805);
  const shell=mesh(body,geo,paint);
  shell.receiveShadow=false;
  for(const z of [-0.817,0.817]){
    const points=[[-0.96,0.23,z],[-0.67,0.55,z],[0.45,0.55,z],[0.77,0.23,z]];
    planeQuad(body,points,glass);
  }
  planeQuad(body,[[0.77,0.23,-0.82],[0.48,0.56,-0.82],[0.48,0.56,0.82],[0.77,0.23,0.82]],glass);
  planeQuad(body,[[-0.98,0.23,-0.82],[-0.66,0.55,-0.82],[-0.66,0.55,0.82],[-0.98,0.23,0.82]],glass);
  for(const z of [-0.82,0.82]){
    const trim=box(body,0.97,0.025,0.02,steel,-0.08,0.08,z);
    const door=box(body,0.65,0.014,0.023,metalDark,-0.08,-0.17,z*1.018);
    door.rotation.z=0.02;
    box(body,0.18,0.035,0.05,rim,-0.1,0.145,z*1.016);
  }
  for(const z of [-0.58,0.58]){
    box(body,0.16,0.08,0.30,rim,1.91,0.01,z);
    box(body,0.12,0.062,0.28,red,-1.93,0.02,z);
  }
  box(body,0.06,0.12,1.12,steel,1.99,-0.22,0);
  box(body,0.07,0.12,1.14,steel,-2.01,-0.23,0);
  return shell;
}
function createHardpoints(body){
  for(const z of [-0.48,0.48]){
    box(body,3.45,0.10,0.115,steel,-0.05,-0.43,z);
    for(const x of [-1.48,-0.60,0.5,1.2]){
      box(body,0.09,0.08,0.10,rim,x,-0.39,z);
    }
  }
  for(const x of [-1.52,0.0,1.22])box(body,0.10,0.08,1.0,steel,x,-0.43,0);
  box(body,1.1,0.21,0.72,metalDark,1.22,-0.14,0);
  box(body,0.93,0.07,0.63,copper,1.18,0.01,0);
  for(let i=0;i<4;i++){
    box(body,0.13,0.08,0.16,rim,0.95+0.16*i,0.075,0);
  }
  box(body,0.25,0.28,0.50,steel,0.45,-0.2,0);
  box(body,0.42,0.23,0.40,metalDark,-1.55,-0.31,0);
  for(const z of [-0.2,0.2]){
    const pipe=rod(body,0.024,copper);
    setRod(pipe,new THREE.Vector3(-1.83,-0.37,z),new THREE.Vector3(0.82,-0.34,z));
  }
  for(const z of [-0.47,0.47]){
    const seat=box(body,0.54,0.14,0.42,black,-0.27,-0.04,z);
    const back=box(body,0.17,0.51,0.42,black,-0.49,0.25,z);back.rotation.z=-0.1;
  }
}
function createSuspension(parent,index){
  const materials=[turquoise,copper];
  const arms=[];
  for(let i=0;i<4;i++)arms.push(rod(parent,0.021,i<2?steel:metalDark));
  const damper=rod(parent,0.033,steel);
  const piston=rod(parent,0.014,rim);
  const coil=mesh(parent,springGeometry,index<2?turquoise:copper);
  const mounts=[sphere(parent,0.058,rim),sphere(parent,0.058,rim)];
  const loadLine=rod(parent,0.012,index<2?turquoise:copper);
  const knuckle=box(parent,0.08,0.29,0.08,metalDark,0,0,0);
  const lowerBall=sphere(parent,0.052,copper);
  const upperBall=sphere(parent,0.038,rim);
  return {arms,damper,piston,coil,mounts,loadLine,knuckle,lowerBall,upperBall};
}
export function createCarViewer(container){
  if(!container)throw new TypeError("Missing Three.js mount node");
  const scene=new THREE.Scene();
  scene.background=new THREE.Color(0x0c1825);
  scene.fog=new THREE.FogExp2(0x0c1825,0.022);
  const camera=new THREE.PerspectiveCamera(42,1,0.05,250);
  camera.position.set(5.7,3.4,5.8);
  const renderer=new THREE.WebGLRenderer({antialias:true,powerPreference:"high-performance",alpha:false});
  renderer.outputColorSpace=THREE.SRGBColorSpace;
  renderer.toneMapping=THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure=1.4;
  renderer.shadowMap.enabled=true;
  renderer.shadowMap.type=THREE.PCFSoftShadowMap;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,2));
  renderer.domElement.setAttribute("aria-label","Interactive 3D car and four-corner suspension");
  container.appendChild(renderer.domElement);
  const controls=new OrbitControls(camera,renderer.domElement);
  controls.target.set(0,0.75,0);controls.enableDamping=true;controls.dampingFactor=0.065;
  controls.minDistance=2.5;controls.maxDistance=18;controls.maxPolarAngle=Math.PI*0.49;
  const ambient=new THREE.HemisphereLight(0xb6e3f0,0x203448,2.2);scene.add(ambient);
  const key=new THREE.DirectionalLight(0xf5f2e8,3.4);key.position.set(2.5,8,5.5);key.castShadow=true;
  key.shadow.mapSize.set(2048,2048);key.shadow.camera.left=-8;key.shadow.camera.right=8;key.shadow.camera.top=8;key.shadow.camera.bottom=-8;
  scene.add(key);
  const rimLight=new THREE.DirectionalLight(0x7bddcd,2.2);rimLight.position.set(-5,3,-5);scene.add(rimLight);
  const floor=mesh(scene,new THREE.PlaneGeometry(250,250),mat(0x111f2c,0,0.96));
  floor.rotation.x=-Math.PI/2;floor.position.y=-0.045;floor.receiveShadow=true;floor.castShadow=false;
  const grid=new THREE.GridHelper(90,90,0x335064,0x23394b);grid.position.y=-0.038;scene.add(grid);
  for(const z of [-2.15,2.15]){
    const lane=box(scene,80,0.015,0.045,mat(0x426073,0.1,0.8),0,-0.029,z);lane.castShadow=false;
  }
  const stripes=[];
  for(let i=0;i<15;i++){
    const stripe=box(scene,1.2,0.013,0.085,mat(0x9ec7c9,0.05,0.75),0,-0.021,0);
    stripe.castShadow=false;stripes.push(stripe);
  }
  const car=new THREE.Group();scene.add(car);
  const body=new THREE.Group();car.add(body);body.position.y=1.00;
  createHardpoints(body);
  const shell=createPanelShell(body);
  const wheels=cornerMeta.map((c,i)=>createWheel(car,i));
  const suspension=cornerMeta.map((c,i)=>createSuspension(car,i));
  const contactPads=cornerMeta.map(c=>{
    const pad=box(car,0.40,0.015,0.27,turquoise,c.x,0.012,c.z);
    pad.material=turquoise.clone();pad.material.transparent=true;pad.material.opacity=0.42;
    pad.castShadow=false;return pad;
  });
  const accents=[];
  for(let i=0;i<4;i++){
    const a=mesh(car,new THREE.TorusGeometry(0.335,0.006,8,48),mat(0x64d6c7,0.4,0.3));
    accents.push(a);
  }
  let focus="overview",cutaway=true,showForces=true,pickListener=null;
  const raycaster=new THREE.Raycaster(),pointer=new THREE.Vector2();
  const wheelTargets=wheels.map(w=>w.wheelBase);
  const tempA=new THREE.Vector3(),tempB=new THREE.Vector3();
  function pointOnBody(x,y,z){
    body.updateMatrixWorld(true);
    return body.localToWorld(new THREE.Vector3(x,y,z));
  }
  function moveSpring(spring,a,b){
    const delta=b.clone().sub(a);
    spring.position.copy(a);
    spring.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),delta.clone().normalize());
    spring.scale.set(1,Math.max(0.001,delta.length()),1);
  }
  function moveSuspension(i,ride,loads){
    const info=cornerMeta[i],sgn=info.side;
    const x=info.x,z=info.z;
    const wheelY=defaultRideParameters.wheelRadiusM+ride.wheelM[i];
    const upper=new THREE.Vector3(x,wheelY+0.11,z-sgn*.07);
    const lower=new THREE.Vector3(x,wheelY-0.12,z-sgn*.07);
    const s=suspension[i];
    const chassisL1=pointOnBody(x-0.17,-0.47,sgn*.40);
    const chassisL2=pointOnBody(x+0.17,-0.47,sgn*.40);
    const chassisU1=pointOnBody(x-0.15,-0.18,sgn*.46);
    const chassisU2=pointOnBody(x+0.15,-0.18,sgn*.46);
    setRod(s.arms[0],chassisL1,lower);setRod(s.arms[1],chassisL2,lower);
    setRod(s.arms[2],chassisU1,upper);setRod(s.arms[3],chassisU2,upper);
    const damperTop=pointOnBody(x-0.08,0.0,sgn*.36),damperBottom=new THREE.Vector3(x+0.04,wheelY+0.035,z-sgn*.09);
    const delta=damperTop.distanceTo(damperBottom),mid=damperBottom.clone().lerp(damperTop,0.55);
    setRod(s.damper,damperBottom,mid);
    setRod(s.piston,mid,damperTop);
    moveSpring(s.coil,damperBottom,damperTop);
    s.mounts[0].position.copy(damperTop);s.mounts[1].position.copy(damperBottom);
    s.upperBall.position.copy(upper);s.lowerBall.position.copy(lower);
    s.knuckle.position.copy(upper).lerp(lower,0.5);
    const load=clamp(loads[i]/5100,0.02,1.8)*0.48;
    const forceBottom=new THREE.Vector3(x,wheelY-0.30,z);
    const forceTop=forceBottom.clone().add(new THREE.Vector3(0,load,0));
    setRod(s.loadLine,forceBottom,forceTop);
    s.loadLine.visible=showForces;
    contactPads[i].position.y=0.01;
    contactPads[i].material.opacity=clamp(loads[i]/4800,0.08,0.65);
    accents[i].position.set(x,wheelY,z);
    accents[i].rotation.y=0;
    accents[i].visible=focus===info.id.toLowerCase()||focus==="suspension";
  }
  function resize(){
    const width=Math.max(240,container.clientWidth),height=Math.max(280,container.clientHeight);
    camera.aspect=width/height;camera.updateProjectionMatrix();renderer.setSize(width,height,false);
  }
  const observer=typeof ResizeObserver!=="undefined"?new ResizeObserver(resize):null;
  observer?.observe(container);
  resize();
  function render(state,input={}){
    const ride=state?.ride||{heaveM:0,pitchRad:0,rollRad:0,wheelM:[0,0,0,0]};
    const distance=state?.base?.distance||0;
    body.position.y=1.00+number(ride.heaveM);
    body.rotation.set(-number(ride.rollRad),0,number(ride.pitchRad),"XYZ");
    car.updateMatrixWorld(true);
    cornerMeta.forEach((c,i)=>{
      const y=defaultRideParameters.wheelRadiusM+number(ride.wheelM[i]);
      const w=wheels[i];w.wheelBase.position.set(c.x,y,c.z);
      w.wheelBase.rotation.y=i<2?-number(input.steer||0):0;
      w.spin.rotation.z=-distance/defaultRideParameters.wheelRadiusM;
      moveSuspension(i,ride,state?.wheelLoadsN||[4000,4000,3300,3300]);
    });
    for(let i=0;i<stripes.length;i++){
      const local=((i*5.2-distance+42)%78+78)%78-39;
      stripes[i].position.x=local;
    }
    controls.update();renderer.render(scene,camera);
  }
  function setFocus(target){
    focus=target;
    let desired=[5.7,3.4,5.8];
    if(target==="fl"||target==="fr")desired=[3.25,1.8,target==="fl"?3.9:-3.9];
    if(target==="rl"||target==="rr")desired=[-3.25,1.8,target==="rl"?3.9:-3.9];
    if(target==="suspension")desired=[3.8,2.2,4.4];
    if(target==="top")desired=[0.01,8.8,0.01];
    if(target==="side")desired=[0.01,2.5,7.7];
    camera.position.set(...desired);controls.target.set(0,0.85,0);controls.update();
    accents.forEach(a=>a.visible=false);
  }
  function setCutaway(enabled){
    cutaway=Boolean(enabled);paint.opacity=cutaway?0.34:0.94;glass.opacity=cutaway?0.12:0.49;paint.depthWrite=!cutaway;
  }
  function setForces(enabled){showForces=Boolean(enabled);}
  let pointerDownX=0,pointerDownY=0;
  renderer.domElement.addEventListener("pointerdown",e=>{pointerDownX=e.clientX;pointerDownY=e.clientY;});
  renderer.domElement.addEventListener("pointerup",e=>{
    if(Math.hypot(e.clientX-pointerDownX,e.clientY-pointerDownY)>7)return;
    const rect=renderer.domElement.getBoundingClientRect();
    pointer.set(((e.clientX-rect.left)/rect.width)*2-1,-((e.clientY-rect.top)/rect.height)*2+1);
    raycaster.setFromCamera(pointer,camera);
    const hits=raycaster.intersectObjects(wheelTargets,true);
    if(!hits.length)return;
    let part=hits[0].object;
    while(part.parent&&!wheelTargets.includes(part))part=part.parent;
    const index=wheelTargets.indexOf(part);
    if(index>=0&&typeof pickListener==="function")pickListener(cornerMeta[index].id.toLowerCase());
  });
  function onPick(fn){pickListener=typeof fn==="function"?fn:null;}
  function destroy(){observer?.disconnect();controls.dispose();renderer.dispose();renderer.domElement.remove();}
  setCutaway(true);
  return {scene,camera,renderer,render,resize,setFocus,setCutaway,setForces,onPick,destroy};
}