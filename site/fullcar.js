/* Seven-coordinate vehicle ride model: heave, pitch, roll and four wheel vertical DOFs; four velocities as conjugates. Illustrative, not validated multibody dynamics. */
export const cornerMeta = [{"id":"FL","axle":0,"side":1,"x":1.22,"z":0.79},{"id":"FR","axle":0,"side":-1,"x":1.22,"z":-0.79},{"id":"RL","axle":1,"side":1,"x":-1.48,"z":0.79},{"id":"RR","axle":1,"side":-1,"x":-1.48,"z":-0.79}];
export const defaultRideParameters = {
  "sprungMassKg": 1316,
  "pitchInertiaKgM2": 2460,
  "rollInertiaKgM2": 590,
  "cgHeightM": 0.52,
  "unsprungMassKg": [
    43,
    43,
    39,
    39
  ],
  "springNPerM": [
    29000,
    29000,
    25500,
    25500
  ],
  "damperNsPerM": [
    2250,
    2250,
    1900,
    1900
  ],
  "tireNPerM": [
    220000,
    220000,
    215000,
    215000
  ],
  "tireDamperNsPerM": [
    65,
    65,
    60,
    60
  ],
  "antiRollNPerM": [
    6500,
    4300
  ],
  "wheelRadiusM": 0.325,
  "totalMassKg": 1480,
  "gravityMps2": 9.80665,
  "axleSpacingM": 2.7
};
export function clamp(x,low,high){return Math.min(high,Math.max(low,x));}

export function roadAt(distance,side,roughness){
 const x=Math.max(0,distance);
 const r=clamp(roughness,0,0.12);
 if(r===0)return 0;
 const wave=0.27*(1-Math.cos(x*2*Math.PI/11));
 const bump1=Math.exp(-Math.pow((x-(side>0?17:21))/0.9,2));
 const bump2=0.75*Math.exp(-Math.pow((x-48)/1.6,2));
 const ripple=0.17*(1-Math.cos(x*2*Math.PI/2.7+side*0.38));
 return r*(wave+0.9*bump1+bump2+ripple);
}

export function sampleRoad(distance,speed,roughness,dt){
 return cornerMeta.map(c=>{
  const x=distance+(c.axle===0?0:-defaultRideParameters.axleSpacingM);
  const z=roadAt(x,c.side,roughness);
  const d=0.0002;
  const rate=clamp(speed,0,80)*(roadAt(x+d,c.side,roughness)-roadAt(x-d,c.side,roughness))/(2*d);
  return {heightM:z,velocityMps:rate};
 });
}

export function createRideState(){
 return {heaveM:0,heaveMps:0,pitchRad:0,pitchRadps:0,rollRad:0,rollRadps:0,
  wheelM:[0,0,0,0],wheelMps:[0,0,0,0]};
}

export function rideVector(s){
 const a=[s.heaveM,s.heaveMps,s.pitchRad,s.pitchRadps,s.rollRad,s.rollRadps];
 for(let i=0;i<4;i++){a.push(s.wheelM[i],s.wheelMps[i]);}
 return a;
}

export function vectorRide(v){
 return {heaveM:v[0],heaveMps:v[1],pitchRad:v[2],pitchRadps:v[3],rollRad:v[4],rollRadps:v[5],
 wheelM:[v[6],v[8],v[10],v[12]],wheelMps:[v[7],v[9],v[11],v[13]]};
}

export function cornerDynamics(y,road,p,controls){
 const f=[0,0,0,0],t=[0,0,0,0],compression=[0,0,0,0];
 const kMul=clamp(Number(controls.springScale??1),0.3,3);
 const cMul=clamp(Number(controls.damperScale??1),0,3);
 const aMul=clamp(Number(controls.antirollScale??1),0,3);
 for(let i=0;i<4;i++){
  const meta=cornerMeta[i];
  const body=y[0]+meta.x*y[2]+meta.z*y[4];
  const vb=y[1]+meta.x*y[3]+meta.z*y[5];
  const q=y[6+2*i],v=y[7+2*i];
  compression[i]=q-body;
  f[i]=p.springNPerM[i]*kMul*compression[i]+p.damperNsPerM[i]*cMul*(v-vb);
  t[i]= -p.tireNPerM[i]*(q-road[i].heightM)-p.tireDamperNsPerM[i]*(v-road[i].velocityMps);
 }
 for(let axle=0;axle<2;axle++){
  const left=2*axle,right=left+1;
  const transfer=(compression[left]-compression[right])*p.antiRollNPerM[axle]*aMul;
  f[left]+=transfer;f[right]-=transfer;
 }
 const normal=new Array(4);
 for(let i=0;i<4;i++){
  const staticLoad=p.totalMassKg*p.gravityMps2*(i<2?0.55:0.45)/2;
  const contactLoad=Math.max(0,staticLoad+t[i]);
  normal[i]=contactLoad;
  t[i]=contactLoad-staticLoad;
 }
 return {springForceN:f,tireDynamicN:t,normalLoadN:normal,compressionM:compression};
}

export function rideDerivatives(y,road,accelMps2,lateralMps2,p,controls){
 const d=new Array(14).fill(0);
 const forces=cornerDynamics(y,road,p,controls);
 let sum=0,pitchMoment=0,rollMoment=0;
 for(let i=0;i<4;i++){
  const f=forces.springForceN[i],meta=cornerMeta[i];
  sum+=f;
  pitchMoment+=meta.x*f;
  rollMoment+=meta.z*f;
  d[6+2*i]=y[7+2*i];
  d[7+2*i]=(-f+forces.tireDynamicN[i])/p.unsprungMassKg[i];
 }
 d[0]=y[1];d[1]=sum/p.sprungMassKg;
 d[2]=y[3];d[3]=(pitchMoment+p.sprungMassKg*p.cgHeightM*accelMps2)/p.pitchInertiaKgM2;
 d[4]=y[5];d[5]=(rollMoment+p.sprungMassKg*p.cgHeightM*lateralMps2)/p.rollInertiaKgM2;
 return d;
}

export function rideStep(s,road0,roadMid,road1,accelMps2,lateralMps2,dt,p=defaultRideParameters,controls={}){
 if(!(dt>0&&dt<=0.02))throw new RangeError("ride dt must be in (0, 0.02]");
 const y=rideVector(s);
 const k1=rideDerivatives(y,road0,accelMps2,lateralMps2,p,controls);
 const f=(k,h)=>y.map((v,i)=>v+h*k[i]);
 const k2=rideDerivatives(f(k1,dt/2),roadMid,accelMps2,lateralMps2,p,controls);
 const k3=rideDerivatives(f(k2,dt/2),roadMid,accelMps2,lateralMps2,p,controls);
 const k4=rideDerivatives(f(k3,dt),road1,accelMps2,lateralMps2,p,controls);
 const next=y.map((v,i)=>v+dt*(k1[i]+2*k2[i]+2*k3[i]+k4[i])/6);
 if(next.some(x=>!Number.isFinite(x)||Math.abs(x)>1e8))throw new RangeError("Ride state diverged");
 return vectorRide(next);
}

export function rideEnergy(s,p=defaultRideParameters,controls={}){
 const y=rideVector(s);
 const kMul=Number(controls.springScale??1);
 const aMul=Number(controls.antirollScale??1);
 let E=0.5*p.sprungMassKg*y[1]**2+0.5*p.pitchInertiaKgM2*y[3]**2+0.5*p.rollInertiaKgM2*y[5]**2;
 const compression=[];
 for(let i=0;i<4;i++){
  const c=cornerMeta[i],q=y[6+2*i],v=y[7+2*i],relative=q-y[0]-c.x*y[2]-c.z*y[4];
  compression.push(relative);
  const preload=p.totalMassKg*p.gravityMps2*(i<2?0.55:0.45)/2;
  const tireK=p.tireNPerM[i],detachment=preload/tireK;
  const tyrePotential=q<=detachment?0.5*tireK*q*q:preload*q-0.5*preload*preload/tireK;
  E+=0.5*p.unsprungMassKg[i]*v*v+0.5*p.springNPerM[i]*kMul*relative*relative+tyrePotential;
 }
 for(let i=0;i<2;i++)E+=0.5*p.antiRollNPerM[i]*aMul*(compression[2*i]-compression[2*i+1])**2;
 return E;
}

export function createFullCarState(base){
 return {base,ride:createRideState(),roads:[0,0,0,0],wheelLoadsN:[0,0,0,0],
  suspensionCompressionM:[0,0,0,0],suspensionForceN:[0,0,0,0],time:0,energyJ:0};
}

export function fullCarStep(s,controls,dt,stepBase,p=defaultRideParameters){
 if(!s||!s.ride||!s.base||typeof stepBase!=="function")throw new TypeError("A base chassis state and step function are required");
 const base=stepBase(s.base,controls,dt);
 const roughness=Number(controls.roughness??0);
 const r0=sampleRoad(s.base.distance,s.base.speed,roughness,dt);
 const rm=sampleRoad((s.base.distance+base.distance)/2,(s.base.speed+base.speed)/2,roughness,dt);
 const r1=sampleRoad(base.distance,base.speed,roughness,dt);
 const ay=Number.isFinite(base.lateralAcceleration)?base.lateralAcceleration:0;
 const ax=Number.isFinite(base.acceleration)?base.acceleration:0;
 const ride=rideStep(s.ride,r0,rm,r1,ax,ay,dt,p,controls);
 const forces=cornerDynamics(rideVector(ride),r1,p,controls);
 return {base,ride,roads:r1.map(x=>x.heightM),wheelLoadsN:forces.normalLoadN,
  suspensionCompressionM:forces.compressionM,suspensionForceN:forces.springForceN,
  time:base.time,energyJ:rideEnergy(ride,p,controls)};
}
