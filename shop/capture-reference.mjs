import {chromium} from "playwright";
import {mkdir,writeFile} from "node:fs/promises";
const b=await chromium.launch({headless:true,args:["--no-sandbox"]});
await mkdir("shop/reference",{recursive:true});
for(const [tag,url,w,h] of [
["original","https://shop-magic-maker-82.lovable.app/",1440,900],
["original-mobile","https://shop-magic-maker-82.lovable.app/",390,844],
["new","https://nickoiv.github.io/lisyang-tovary/shop/",1440,900],
["new-mobile","https://nickoiv.github.io/lisyang-tovary/shop/",390,844]]){
 const p=await b.newPage({viewport:{width:w,height:h},deviceScaleFactor:1});
 p.on("pageerror",e=>console.log(tag,"PAGE ERROR",String(e)));
 try{
  const r=await p.goto(url,{waitUntil:"domcontentloaded",timeout:30000});
  await p.waitForTimeout(4000);
  console.log(tag,"status",r?.status(),"title",await p.title(),"htmlLength",(await p.content()).length,"bodyText",(await p.locator("body").innerText()).slice(0,300));
  await p.screenshot({path:"shop/reference/"+tag+".jpg",type:"jpeg",quality:70,fullPage:true,animations:"disabled",timeout:30000});
  await writeFile("shop/reference/"+tag+".html",await p.content(),"utf8");
 }catch(e){console.log(tag,"FAILED",String(e));}
 await p.close();
}
await b.close();