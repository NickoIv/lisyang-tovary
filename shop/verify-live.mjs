import assert from "node:assert/strict";
import { chromium } from "playwright";
import { createHash } from "node:crypto";

const url = "https://nickoiv.github.io/lisyang-tovary/shop/";
let response, pageHtml;
for (let attempt = 1; attempt <= 15; attempt++) {
  try {
    response = await fetch(url + "?qa=" + attempt, {signal: AbortSignal.timeout(15000)});
    pageHtml = await response.text();
    if (response.ok && pageHtml.includes('id="embedded-catalog"')) break;
  } catch (error) { console.log("Request retry", attempt, error.message); }
  if (attempt === 15) throw new Error("Live shop cannot be loaded");
  await new Promise(resolve => setTimeout(resolve, 8000));
}
assert.equal(response.status, 200);
assert(pageHtml.includes("LIXIANG"));
const scripts=[...pageHtml.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)];
console.log("LIVE JS SHA256:",createHash("sha256").update(scripts.at(-1)[1]).digest("base64"));
assert(!pageHtml.includes("shop-magic-maker-82.lovable.app"), "Images still depend on Lovable");
const match = pageHtml.match(/<script id="embedded-catalog" type="application\/json">([\s\S]*?)<\/script>/);
assert(match, "Embedded catalog unavailable");
const products = JSON.parse(match[1]);
assert.equal(products.length, 14);
assert(products.every(p => Number.isInteger(p.price) && p.price > 0));
let photos = [...new Set(products.flatMap(p => [p.image, ...(p.gallery || [])]))];
assert.equal(photos.length, 16);
for (const path of photos) {
  assert(path.startsWith("assets/products/"), "Image not local: " + path);
  const r = await fetch(new URL(path, url), { signal: AbortSignal.timeout(15000) });
  assert(r.ok, path + ": HTTP " + r.status);
  assert((r.headers.get("content-type") || "").startsWith("image/"), path + ": not an image");
  const bytes = new Uint8Array(await r.arrayBuffer());
  assert(bytes.length > 2000 && bytes[0] === 255 && bytes[1] === 216, path + ": invalid JPEG");
}
console.log("LIVE HTTP PASS: 14 products, 16 local images");

const browser = await chromium.launch({headless:true, args:["--no-sandbox"]});
for (const viewport of [{width:390,height:844},{width:1365,height:900}]) {
  const context = await browser.newContext({viewport});
  const page = await context.newPage();
  const errors=[];
  page.on("pageerror", e => errors.push(String(e)));
  page.on("console", msg => { if(msg.type()==="error") errors.push("console: "+msg.text()); });
  await page.goto(url, {waitUntil:"domcontentloaded"});
  await page.waitForTimeout(1600);
  console.log("BROWSER DEBUG:",JSON.stringify(await page.evaluate(() => ({cards:document.querySelectorAll(".product-card").length,result:document.querySelector("#result-count")?.textContent,body:document.body.innerText.slice(0,100)}))),"ERRORS",JSON.stringify(errors.slice(0,8)));
  await page.locator(".product-card").first().waitFor({timeout:10000});
  assert.equal(await page.locator(".product-card").count(), 14);
  assert.equal(await page.locator("#cart-count").innerText(), "0");
  const horizontal = await page.evaluate(() => { window.scrollTo({left:250,top:0,behavior:"instant"}); const scrollX=window.scrollX; window.scrollTo({left:0,top:0,behavior:"instant"}); return {scrollX, scrollWidth:document.documentElement.scrollWidth,viewport:innerWidth}; });
  console.log("HORIZONTAL SCROLL TEST",JSON.stringify(horizontal));
  console.log("OUTSIDE VIEWPORT",JSON.stringify(await page.evaluate(() => [...document.querySelectorAll("body *")].map(e => { const r=e.getBoundingClientRect();return {tag:e.tagName.toLowerCase(),class:e.className?.baseVal??e.className,id:e.id,left:Math.round(r.left),right:Math.round(r.right),width:Math.round(r.width)}; }).filter(x=>x.right>innerWidth+3 && x.width>0).sort((a,b)=>b.right-a.right).slice(0,14))));
  assert.equal(horizontal.scrollX, 0, "Page can scroll horizontally");
  await page.locator(".product-add").first().click();
  assert.equal(await page.locator("#cart-count").innerText(), "1");
  await page.locator("#cart-open").click();
  assert(await page.locator("#drawer").isVisible(), "Cart must open");
  assert((await page.locator("#cart-total").innerText()).includes("₸"), "Price formatting absent");
  await page.locator("#checkout-button").click();
  assert(await page.locator("#checkout-modal").isVisible(), "Checkout must open");
  await page.locator("#buyer-name").fill("Тест");
  await page.locator("#buyer-phone").fill("123");
  await page.locator('#checkout-form button[type="submit"]').click();
  assert(await page.locator("#form-error").isVisible(), "Invalid phone not rejected");
  await page.locator("#checkout-close").click();
  await page.locator('[data-model="L6"]').first().click();
  const count = await page.locator(".product-card").count();
  assert(count > 0 && count < 14, "Model filter failed");
  assert.deepEqual(errors, [], "Client JavaScript error");
  await context.close();
  console.log("BROWSER PASS:",viewport.width,"px; model-filter:",count,"products");
}
await browser.close();
