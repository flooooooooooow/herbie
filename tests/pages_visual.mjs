import {chromium} from "playwright";
import assert from "node:assert/strict";
import {createServer} from "node:http";
import {readFile} from "node:fs/promises";
import {resolve,join,extname} from "node:path";
const root=resolve("site");
const types={".js":"text/javascript; charset=utf-8",".css":"text/css; charset=utf-8",".html":"text/html; charset=utf-8"};
const server=createServer(async(req,res)=>{
 try{
  const pathname=decodeURIComponent(new URL(req.url,"http://localhost").pathname);
  const filename=resolve(root,pathname===" /"?"index.html":pathname.replace(/^\/+/,"")||"index.html");
  if(!filename.startsWith(root+"/")&&filename!==join(root,"index.html"))throw new Error("Bad path");
  const bytes=await readFile(filename);
  res.writeHead(200,{"content-type":types[extname(filename)]||"application/octet-stream","cache-control":"no-store"});
  res.end(bytes);
 }catch(err){res.writeHead(404);res.end("Not Found");}
});
await new Promise(resolve=>server.listen(0,"127.0.0.1",resolve));
let browser;
try{
 browser=await chromium.launch({headless:true,args:["--no-sandbox","--enable-webgl","--use-gl=angle","--use-angle=swiftshader","--enable-unsafe-swiftshader"]});
 const page=await browser.newPage({viewport:{width:1512,height:980},deviceScaleFactor:1});
 const errors=[];
 page.on("pageerror",err=>errors.push(err.message));
 const url="http://127.0.0.1:"+server.address().port+"/";
 const response=await page.goto(url,{waitUntil:"load",timeout:30000});
 assert.equal(response.status(),200);
 await page.waitForFunction(()=>document.querySelector("#viewport3d canvas")||!document.querySelector("#render-error").hidden,{timeout:20000});
 const failed=await page.locator("#render-error").isVisible();
 assert.equal(failed,false,"3D runtime fallback triggered: "+await page.locator("#render-error").textContent());
 const canvas=page.locator("#viewport3d canvas");
 assert.equal(await canvas.count(),1,"A real Three.js WebGL canvas must exist");
 const w=await canvas.evaluate(el=>el.width);
 assert(w>500,"WebGL drawing surface must be sized for desktop");
 const bgcolor=await page.locator("body").evaluate(el=>getComputedStyle(el).backgroundColor);
 assert.notEqual(bgcolor,"rgba(0, 0, 0, 0)","Site CSS must load");
 const initial=await page.locator("#elapsed").textContent();
 await page.waitForTimeout(1300);
 const after=await page.locator("#elapsed").textContent();
 assert.notEqual(after,initial,"Physics must advance without interaction");
 await page.getByRole("button",{name:/Hard braking/i}).click();
 await page.waitForTimeout(450);
 assert((await page.locator("#speed").textContent()).includes("km/h"),"Typed vehicle telemetry must render");
 await page.getByRole("button",{name:/FRONT L/i}).first().click();
 assert((await page.locator("#inspector-title").textContent()).toLowerCase().includes("front"));
 await page.screenshot({path:"vehicle-lab-desktop.png",fullPage:true,animations:"disabled"});
 await page.setViewportSize({width:390,height:844});
 await page.waitForTimeout(400);
 assert((await page.locator("#viewport3d canvas").evaluate(el=>el.getBoundingClientRect().width))>250,"Mobile viewport must retain rendering");
 await page.screenshot({path:"vehicle-lab-mobile.png",fullPage:true,animations:"disabled"});
 assert.deepEqual(errors,[],"Page JavaScript must not throw");
 console.log("PASS loaded CSS, Three.js WebGL canvas, dynamic physics, inspector selection and mobile layout");
}finally{
 await browser?.close();
 await new Promise(resolve=>server.close(resolve));
}
