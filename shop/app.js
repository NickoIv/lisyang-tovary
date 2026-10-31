(() => {
"use strict";
const phone="77017233633";
document.querySelectorAll('a[href="/admin"]').forEach(a=>{a.removeAttribute("href");a.setAttribute("aria-disabled","true");a.title="Админ-панель пока не подключена";});
const cards=[...document.querySelectorAll("#catalog article")];
const products=cards.map((card,id)=>{
 const title=card.querySelector("h3")?.textContent?.trim()||"Товар";
 const desc=card.querySelector("p")?.textContent?.trim()||"";
 const images=[...card.querySelectorAll("img")].map(i=>i.getAttribute("src")).filter(Boolean);
 const label=card.querySelector("div.relative.aspect-square > span")?.textContent?.trim().toLowerCase()||"";
 const value=card.querySelector("button span.font-display")?.textContent?.replace(/[^\d]/g,"")||"";
 const price=Number(value);
 return {id,title,desc,images,label,price};
});
let cart=[];
try{const v=JSON.parse(localStorage.getItem("lixiang-cart-v1")||"[]");if(Array.isArray(v))cart=v.filter(x=>Number.isInteger(x.id)&&products[x.id]&&Number.isInteger(x.qty)&&x.qty>0&&x.qty<100);}catch{}
const money=n=>new Intl.NumberFormat("ru-KZ").format(n)+" ₸";
const save=()=>{localStorage.setItem("lixiang-cart-v1",JSON.stringify(cart));refresh();};
const cartButton=document.createElement("button");cartButton.id="replica-cart-button";cartButton.textContent="Корзина";document.body.append(cartButton);
const overlay=document.createElement("div");overlay.id="replica-dialog";overlay.hidden=true;overlay.setAttribute("role","dialog");overlay.setAttribute("aria-modal","true");
overlay.innerHTML='<section class="rd-card"><div style="display:flex;align-items:center;justify-content:space-between"><small style="letter-spacing:.16em;text-transform:uppercase;color:#97681f">LIXIANG ACCESSORIES</small><button class="rd-soft" id="rd-close" aria-label="Закрыть">Закрыть</button></div><h3 id="rd-title"></h3><img id="rd-image" alt=""><p id="rd-description" style="margin:12px 0;color:#716d68"></p><strong id="rd-price"></strong><div id="rd-dynamic"></div><p id="rd-error" role="alert" style="color:#ac3a2c" hidden></p></section>';
document.body.append(overlay);
const q=id=>overlay.querySelector(id);
const close=()=>{overlay.hidden=true;document.body.style.overflow="";};
q("#rd-close").onclick=close;
overlay.addEventListener("click",e=>{if(e.target===overlay)close();});
document.addEventListener("keydown",e=>{if(e.key==="Escape"&&!overlay.hidden)close();});
const open=()=>{overlay.hidden=false;document.body.style.overflow="hidden";q("#rd-error").hidden=true;q("#rd-image").hidden=false;q("#rd-description").hidden=false;q("#rd-price").hidden=false;};
const refresh=()=>{const count=cart.reduce((a,x)=>a+x.qty,0);cartButton.textContent=count?"Корзина · "+count:"Корзина";cartButton.hidden=!count;};
function add(id,qty=1){
 const existing=cart.find(x=>x.id===id);
 if(existing)existing.qty=Math.min(99,existing.qty+qty);else cart.push({id,qty});
 save();
}
function viewItem(id){
 const p=products[id];if(!p)return;
 open();
 q("#rd-title").textContent=p.title;
 q("#rd-image").src=p.images[0]||"";q("#rd-image").alt=p.title;
 q("#rd-description").textContent=p.desc;
 q("#rd-price").textContent=money(p.price);
 q("#rd-dynamic").replaceChildren();
 const actions=document.createElement("div");actions.className="rd-actions";
 const addBtn=document.createElement("button");addBtn.className="rd-main";addBtn.textContent="Добавить в корзину";addBtn.onclick=()=>{add(id);viewCart();};
 const buy=document.createElement("button");buy.className="rd-soft";buy.textContent="Заказать в WhatsApp";buy.onclick=()=>{add(id);viewCart();};
 actions.append(addBtn,buy);q("#rd-dynamic").append(actions);
}
function viewCart(){
 open();q("#rd-title").textContent="Ваш заказ";
 q("#rd-image").hidden=true;q("#rd-description").hidden=true;q("#rd-price").hidden=true;
 const root=q("#rd-dynamic");root.replaceChildren();
 if(!cart.length){const text=document.createElement("p");text.textContent="Корзина пуста.";root.append(text);return;}
 const list=document.createElement("div");
 for(const x of cart){
  const p=products[x.id];if(!p)continue;
  const row=document.createElement("div");row.style.cssText="display:flex;align-items:center;gap:8px;padding:12px 0;border-bottom:1px solid #e6e0d8";
  const main=document.createElement("div");main.style.flex="1";main.textContent=p.title+" · "+money(p.price*x.qty);
  const dec=document.createElement("button");dec.className="rd-soft";dec.textContent="−";dec.setAttribute("aria-label","Уменьшить количество");dec.onclick=()=>{x.qty--;if(x.qty<=0)cart=cart.filter(c=>c!==x);save();viewCart();};
  const qty=document.createElement("span");qty.textContent=String(x.qty);
  const inc=document.createElement("button");inc.className="rd-soft";inc.textContent="+";inc.setAttribute("aria-label","Увеличить количество");inc.onclick=()=>{x.qty=Math.min(x.qty+1,99);save();viewCart();};
  row.append(main,dec,qty,inc);list.append(row);
 }
 root.append(list);
 const total=document.createElement("p");total.style.cssText="font-size:20px;margin:18px 0";total.textContent="Итого: "+money(cart.reduce((a,x)=>a+(products[x.id]?.price||0)*x.qty,0));root.append(total);
 const name=document.createElement("input");name.placeholder="Ваше имя";name.autocomplete="name";name.maxLength=100;name.required=true;
 const tel=document.createElement("input");tel.placeholder="Телефон: +7 700 000 00 00";tel.autocomplete="tel";tel.inputMode="tel";tel.type="tel";tel.maxLength=24;tel.required=true;
 const delivery=document.createElement("textarea");delivery.placeholder="Город и адрес доставки (при необходимости)";delivery.rows=2;delivery.maxLength=400;
 root.append(name,tel,delivery);
 const act=document.createElement("div");act.className="rd-actions";
 const submit=document.createElement("button");submit.className="rd-main";submit.textContent="Отправить заказ в WhatsApp";
 submit.onclick=()=>{
  const n=name.value.trim(),t=tel.value.trim(),digits=t.replace(/\D/g,"");
  if(n.length<2||digits.length<10||digits.length>12){q("#rd-error").textContent="Укажите имя и правильный телефон.";q("#rd-error").hidden=false;return;}
  const lines=cart.map(x=>{const p=products[x.id];return "• "+p.title+" — "+x.qty+" × "+money(p.price)+" = "+money(p.price*x.qty);});
  const amount=cart.reduce((a,x)=>a+(products[x.id]?.price||0)*x.qty,0);
  const message=["Здравствуйте! Хочу оформить заказ:",...lines,"Итого: "+money(amount),"Имя: "+n,"Телефон: "+t,delivery.value.trim()?"Доставка: "+delivery.value.trim():"","Оплата согласовывается с продавцом отдельно."].filter(Boolean).join("\n");
  window.open("https://wa.me/"+phone+"?text="+encodeURIComponent(message),"_blank","noopener,noreferrer");
 };
 act.append(submit);root.append(act);
}
cards.forEach((card,id)=>{const b=card.querySelector("button");if(b){b.addEventListener("click",()=>viewItem(id));} });
const filters=[...document.querySelectorAll("#catalog > div")].flatMap(d=>[...d.querySelectorAll("button")]).filter(b=>["Все","Экстерьер","Интерьер"].includes(b.textContent.trim()));
filters.forEach(button=>button.addEventListener("click",()=>{
 const category=button.textContent.trim().toLowerCase();
 filters.forEach(f=>f.setAttribute("aria-pressed",String(f===button)));
 cards.forEach((card,id)=>{card.hidden=category!=="все"&&products[id].label!==category;});
}));
if(filters.length)filters[0].setAttribute("aria-pressed","true");
cartButton.onclick=viewCart;refresh();
})();