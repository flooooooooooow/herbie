/* Herbie browser reference port; not Flow WASM or certified vehicle physics. */
export const defaultParameters = {
  "massKg": 1480,
  "gravity": 9.80665,
  "airDensity": 1.225,
  "dragCoefficient": 0.29,
  "frontalAreaM2": 2.22,
  "rollingCoefficient": 0.012,
  "wheelRadiusM": 0.315,
  "gearRatios": [
    3.58,
    2.14,
    1.45,
    1.08,
    0.84
  ],
  "finalDrive": 3.9,
  "drivelineEfficiency": 0.9,
  "frontWeightFraction": 0.56,
  "wheelbaseM": 2.7,
  "frontAxleM": 1.2,
  "rearAxleM": 1.5,
  "yawInertiaKgM2": 2650,
  "frontCorneringStiffnessNPerRad": 68000,
  "rearCorneringStiffnessNPerRad": 74000,
  "frontSprungMassKg": 335,
  "rearSprungMassKg": 285,
  "frontUnsprungMassKg": 42,
  "rearUnsprungMassKg": 40,
  "frontSpringNPerM": 26500,
  "rearSpringNPerM": 23000,
  "frontDamperNsPerM": 1800,
  "rearDamperNsPerM": 1600,
  "tireStiffnessNPerM": 205000,
  "brakeDecelerationMps2": 8.5,
  "brakeHeatCapacityJPerK": 80000,
  "brakeCoolingWPerK": 28,
  "engineHeatCapacityJPerK": 185000,
  "radiatorWPerK": 270,
  "engineEfficiency": 0.3,
  "fuelLhvJPerKg": 43000000,
  "chassisAreaM2": 0.00065,
  "chassisYieldPa": 250000000
};
const torqueMap = [[800,95],[1500,165],[2500,215],[4000,240],[5500,212],[6500,155]];
export function clamp(x,lo,hi){return Math.max(lo,Math.min(hi,x));}

export function torqueAtRpm(rpm){
 if(rpm<=torqueMap[0][0])return torqueMap[0][1];
 for(let i=1;i<torqueMap.length;i++){
  if(rpm<=torqueMap[i][0]){
   const f=(rpm-torqueMap[i-1][0])/(torqueMap[i][0]-torqueMap[i-1][0]);
   return torqueMap[i-1][1]+f*(torqueMap[i][1]-torqueMap[i-1][1]);
  }
 }
 return torqueMap[torqueMap.length-1][1];
}

export function roadHeight(x,amplitude){return 0.5*amplitude*(1-Math.cos(2*Math.PI*x/12));}

export function quarterAcceleration(c,p,roadZ,roadV){
 const spring=p.ks*(c.zs-c.zu)+p.cs*(c.vs-c.vu);
 const tire=p.kt*(c.zu-roadZ)+p.ct*(c.vu-roadV);
 return {zs:c.vs,vs:-spring/p.ms,zu:c.vu,vu:(spring-tire)/p.mu};
}

export function advanceCorner(c,k,h){return {zs:c.zs+k.zs*h,vs:c.vs+k.vs*h,zu:c.zu+k.zu*h,vu:c.vu+k.vu*h};}

export function quarterStep(c,p,roadZ,roadV,dt){
 const k1=quarterAcceleration(c,p,roadZ,roadV);
 const k2=quarterAcceleration(advanceCorner(c,k1,dt/2),p,roadZ,roadV);
 const k3=quarterAcceleration(advanceCorner(c,k2,dt/2),p,roadZ,roadV);
 const k4=quarterAcceleration(advanceCorner(c,k3,dt),p,roadZ,roadV);
 const f=dt/6;
 return {zs:c.zs+f*(k1.zs+2*k2.zs+2*k3.zs+k4.zs),vs:c.vs+f*(k1.vs+2*k2.vs+2*k3.vs+k4.vs),
  zu:c.zu+f*(k1.zu+2*k2.zu+2*k3.zu+k4.zu),vu:c.vu+f*(k1.vu+2*k2.vu+2*k3.vu+k4.vu)};
}

export function createVehicleState(){
 return {time:0,x:0,y:0,distance:0,speed:0,heading:0,lateralSpeed:0,yawRate:0,gear:1,
 engineRpm:850,engineTemperatureC:24,brakeTemperatureC:24,fuelKg:0,
 front:{zs:0,vs:0,zu:0,vu:0},rear:{zs:0,vs:0,zu:0,vu:0},
 wheelForceN:0,brakeForceN:0,dragN:0,acceleration:0,engineTorqueNm:0,enginePowerKw:0,
 frontLateralForceN:0,rearLateralForceN:0,lateralAcceleration:0,
 tractionUtilization:0,roadFrontM:0,roadRearM:0,chassisStressPa:0,chassisSafetyFactor:Infinity,
 engineHeatW:0,thermalLossW:0};
}

export function stepVehicle(s,controls={},dt=0.01,p=defaultParameters){
 if(!Number.isFinite(dt)||dt<=0||dt>0.02)throw new RangeError("dt must be between 0 and 0.02 seconds");
 const throttle=clamp(Number(controls.throttle??0),0,1);
 const brake=clamp(Number(controls.brake??0),0,1);
 const steer=clamp(Number(controls.steer??0),-0.12,0.12);
 const grade=clamp(Number(controls.grade??0),-12,12)*Math.PI/180;
 const mu=clamp(Number(controls.mu??0.85),0.15,1.3);
 const roughness=clamp(Number(controls.roughness??0),0,0.09);
 if(![throttle,brake,steer,grade,mu,roughness].every(Number.isFinite))throw new RangeError("Nonfinite control");
 let gear=s.gear;
 const rpmFor=g=>Math.max(850,s.speed/p.wheelRadiusM*p.gearRatios[g-1]*p.finalDrive*60/(2*Math.PI));
 if(rpmFor(gear)>5200&&gear<p.gearRatios.length)gear++;
 else if(rpmFor(gear)<1450&&gear>1)gear--;
 const rpm=rpmFor(gear);
 const derate=clamp(1-Math.max(0,s.engineTemperatureC-112)/70,0.4,1);
 const torque=Math.max(0,torqueAtRpm(rpm)-17)*throttle*derate;
 const drive=torque*p.gearRatios[gear-1]*p.finalDrive*p.drivelineEfficiency/p.wheelRadiusM;
 const brakeDemand=brake*p.brakeDecelerationMps2*p.massKg;
 const normal=p.massKg*p.gravity*Math.cos(grade);
 const grip=normal*mu;
 const force=clamp(drive-brakeDemand,-grip,grip);
 const drag=0.5*p.airDensity*p.dragCoefficient*p.frontalAreaM2*s.speed*s.speed;
 const rolling=p.rollingCoefficient*normal;
 const slope=p.massKg*p.gravity*Math.sin(grade);
 const resistance=drag+slope+(s.speed>0.001||force>rolling+slope?rolling:0);
 const accel=(force-resistance)/p.massKg;
 const speed=Math.max(0,s.speed+accel*dt);
 const distance=s.distance+0.5*(s.speed+speed)*dt;
 const frontGrip=mu*normal*p.frontWeightFraction;
 const rearGrip=mu*normal*(1-p.frontWeightFraction);
 const fxFront=force*(force<0?0.65:0.5);
 const fxRear=force-fxFront;
 const fLimit=Math.sqrt(Math.max(0,frontGrip**2-fxFront**2));
 const rLimit=Math.sqrt(Math.max(0,rearGrip**2-fxRear**2));
 let fyf=0,fyr=0,vy=s.lateralSpeed,yawRate=s.yawRate;
 if(s.speed>2){
  const af=steer-(s.lateralSpeed+p.frontAxleM*s.yawRate)/s.speed;
  const ar=-(s.lateralSpeed-p.rearAxleM*s.yawRate)/s.speed;
  fyf=clamp(p.frontCorneringStiffnessNPerRad*af,-fLimit,fLimit);
  fyr=clamp(p.rearCorneringStiffnessNPerRad*ar,-rLimit,rLimit);
  vy=s.lateralSpeed+((fyf+fyr)/p.massKg-s.speed*s.yawRate)*dt;
  yawRate=s.yawRate+(p.frontAxleM*fyf-p.rearAxleM*fyr)/p.yawInertiaKgM2*dt;
 }else{vy=0;yawRate=speed*Math.tan(steer)/p.wheelbaseM;}
 const heading=s.heading+yawRate*dt;
 const x=s.x+(speed*Math.cos(heading)-vy*Math.sin(heading))*dt;
 const y=s.y+(speed*Math.sin(heading)+vy*Math.cos(heading))*dt;
 const frontRoad=roadHeight(distance,roughness),rearRoad=roadHeight(distance-p.wheelbaseM,roughness);
 const frontSlope=roughness*Math.PI/12*Math.sin(2*Math.PI*distance/12);
 const rearSlope=roughness*Math.PI/12*Math.sin(2*Math.PI*(distance-p.wheelbaseM)/12);
 const front=quarterStep(s.front,{ms:p.frontSprungMassKg,mu:p.frontUnsprungMassKg,ks:p.frontSpringNPerM,cs:p.frontDamperNsPerM,kt:p.tireStiffnessNPerM,ct:0},frontRoad,frontSlope*speed,dt);
 const rear=quarterStep(s.rear,{ms:p.rearSprungMassKg,mu:p.rearUnsprungMassKg,ks:p.rearSpringNPerM,cs:p.rearDamperNsPerM,kt:p.tireStiffnessNPerM,ct:0},rearRoad,rearSlope*speed,dt);
 const power=Math.max(0,torque*rpm*2*Math.PI/60);
 const fuelPower=power/p.engineEfficiency;
 const fuelFlow=fuelPower/p.fuelLhvJPerKg;
 const engineHeat=fuelPower*(1-p.engineEfficiency)*0.19;
 const cooling=(p.radiatorWPerK+23*s.speed)*Math.max(0,s.engineTemperatureC-24);
 const engineTemp=s.engineTemperatureC+(engineHeat-cooling)/p.engineHeatCapacityJPerK*dt;
 const dissipatedBrakePower=Math.min(brakeDemand,grip)*s.speed;
 const brakeCooling=(p.brakeCoolingWPerK+3*s.speed)*Math.max(0,s.brakeTemperatureC-24);
 const brakeTemp=s.brakeTemperatureC+(dissipatedBrakePower-brakeCooling)/p.brakeHeatCapacityJPerK*dt;
 const stress=(Math.abs(force)+Math.abs(fyf)+Math.abs(fyr))/p.chassisAreaM2;
 return {time:s.time+dt,x,y,distance,speed,heading,lateralSpeed:vy,yawRate,gear,engineRpm:rpm,
 engineTemperatureC:engineTemp,brakeTemperatureC:brakeTemp,fuelKg:s.fuelKg+fuelFlow*dt,
 front,rear,wheelForceN:force,brakeForceN:brakeDemand,dragN:drag,acceleration:accel,engineTorqueNm:torque,
 enginePowerKw:power/1000,frontLateralForceN:fyf,rearLateralForceN:fyr,
 lateralAcceleration:(fyf+fyr)/p.massKg,tractionUtilization:Math.abs(force)/grip,
 roadFrontM:frontRoad,roadRearM:rearRoad,chassisStressPa:stress,
 chassisSafetyFactor:stress>0?p.chassisYieldPa/stress:Infinity,engineHeatW:engineHeat,thermalLossW:cooling};
}

export function toleranceBounds(spec={}){
 const scale=clamp(Number(spec.scale??1),0.1,5);
 const hole=Number(spec.holeMm??20),shaft=Number(spec.shaftMm??19.9);
 const h=Number(spec.holeHalfWidthMm??0.05)*scale;
 const s=Number(spec.shaftHalfWidthMm??0.02)*scale;
 const temp=Number(spec.deltaTC??0);
 if(![hole,shaft,h,s,temp].every(Number.isFinite)||hole<=0||shaft<=0||h<0||s<0)throw new RangeError("Invalid tolerance");
 const holeMean=hole*(1+12e-6*temp),shaftMean=shaft*(1+23e-6*temp);
 return {nominalMm:holeMean-shaftMean,minimumMm:holeMean-h-shaftMean-s,
 maximumMm:holeMean+h-shaftMean+s,sigmaMm:Math.hypot(h,s)/3,scale,holeMean,shaftMean,holeHalf:h,shaftHalf:s};
}

export function toleranceSamples(spec={},count=1500,seed=123456){
 const b=toleranceBounds(spec);
 const lo=Number(spec.lowerSpecMm??0),hi=Number(spec.upperSpecMm??0.15);
 if(!Number.isFinite(lo)||!Number.isFinite(hi)||lo>=hi||!Number.isInteger(count)||count<1||count>100000)throw new RangeError("Invalid sampling setup");
 let state=seed>>>0,failures=0,sum=0,sumSq=0;
 function random(){state=(Math.imul(state,1664525)+1013904223)>>>0;return (state+0.5)/4294967296;}
 function normal(){return Math.sqrt(-2*Math.log(random()))*Math.cos(2*Math.PI*random());}
 const samples=[];
 for(let i=0;i<count;i++){
  const gap=b.holeMean+normal()*b.holeHalf/3-b.shaftMean-normal()*b.shaftHalf/3;
  samples.push(gap);sum+=gap;sumSq+=gap*gap;
  if(gap<lo||gap>hi)failures++;
 }
 const mean=sum/count,stdev=Math.sqrt(Math.max(0,sumSq/count-mean**2));
 return {bounds:b,meanMm:mean,sigmaMm:stdev,failures,passRate:1-failures/count,
  cpk:stdev>0?Math.min((hi-mean)/(3*stdev),(mean-lo)/(3*stdev)):Infinity,
  samples,lowerSpecMm:lo,upperSpecMm:hi,seed,count};
}
