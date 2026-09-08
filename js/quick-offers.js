// A220 - acceso rápido a ofertas en Ventas
(function(){
  function getData(){return typeof appData!=='undefined'&&appData?appData:null}
  function esc(v){return typeof escapeHTML==='function'?escapeHTML(v):String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]))}
  function price(v){return typeof money==='function'?money(v):`$${Number(v||0).toLocaleString('es-AR')}`}
  function render(){
    const box=document.getElementById('a220QuickOffers'),data=getData();
    if(!box||!data)return;
    const offers=Array.isArray(data.offers)?data.offers:[];
    if(!offers.length){box.innerHTML='';box.style.display='none';return}
    box.style.display='block';
    box.innerHTML=`<div class="a220-quick-title">🎁 OFERTAS DISPONIBLES <span>${offers.length}</span></div><div class="a220-quick-list">${offers.map(o=>{const ids=(o.productIds||[]).map(Number);const products=(data.products||[]).filter(p=>ids.includes(Number(p.id)));return `<button type="button" class="a220-quick-offer" data-offer-id="${Number(o.id)}"><span class="a220-quick-icon">🎁</span><span class="a220-quick-info"><strong>${esc(o.name)}</strong><small>${esc(products.map(p=>p.name).join(' + '))}</small></span><span class="a220-quick-arrow">›</span></button>`}).join('')}</div>`;
    box.querySelectorAll('.a220-quick-offer').forEach(btn=>btn.addEventListener('click',()=>openOfferOptions(Number(btn.dataset.offerId))));
  }
  function openOfferOptions(id){
    const data=getData();if(!data)return;
    const offer=(data.offers||[]).find(o=>Number(o.id)===id);if(!offer)return;
    const tiers=(offer.tiers||[]).slice().sort((a,b)=>Number(a.qty||0)-Number(b.qty||0));
    if(!tiers.length){showToast?.('⚠️ Esta oferta no tiene opciones configuradas','error');return}
    let modal=document.getElementById('a220OfferOptionsModal');
    if(!modal){modal=document.createElement('div');modal.id='a220OfferOptionsModal';modal.className='a220-offer-modal';document.body.appendChild(modal)}
    const products=(data.products||[]).filter(p=>(offer.productIds||[]).map(Number).includes(Number(p.id)));
    modal.innerHTML=`<div class="a220-offer-modal-card"><div class="a220-offer-modal-head"><div><strong>🎁 ${esc(offer.name)}</strong><small>${esc(products.map(p=>p.name).join(' + '))}</small></div><button type="button" class="a220-offer-close">×</button></div><div class="a220-offer-options">${tiers.map((t,i)=>`<button type="button" class="a220-offer-option" data-tier-index="${i}"><span><strong>${esc(t.label||`${t.qty} unidades`)}</strong><small>${Number(t.qty)||0} unidades</small></span><b>${price(t.price)}</b></button>`).join('')}</div></div>`;
    modal.style.display='flex';
    modal.querySelector('.a220-offer-close').onclick=()=>modal.style.display='none';
    modal.onclick=e=>{if(e.target===modal)modal.style.display='none'};
    modal.querySelectorAll('.a220-offer-option').forEach(btn=>btn.onclick=()=>selectOfferTier(offer,tiers[Number(btn.dataset.tierIndex)],data,modal));
  }
  function selectOfferTier(offer,tier,data,modal){
    const products=(data.products||[]).filter(p=>(offer.productIds||[]).map(Number).includes(Number(p.id))&&Number(p.stock)>0);
    if(!products.length){showToast?.('⚠️ Esta oferta no tiene artículos con stock','error');return}
    let p=products[0];
    if(products.length>1){const choice=prompt(`🎁 ${offer.name}\n${tier.label||`${tier.qty} unidades`} → ${price(tier.price)}\n\nElegí el artículo:\n${products.map((x,i)=>`${i+1}. ${x.name}`).join('\n')}`,'1');if(choice===null)return;p=products[Number(choice)-1];if(!p){showToast?.('⚠️ Selección inválida','error');return}}
    const qty=Math.max(1,Math.floor(Number(tier.qty)||1));
    if(Number(p.stock)<qty){showToast?.(`⚠️ Stock insuficiente de ${p.name}`,'error');return}
    if(typeof addProductToCart==='function')addProductToCart(p,qty,p.price);
    modal.style.display='none';
  }
  function ensure(){
    const data=getData(),sale=document.getElementById('saleProduct');
    if(!sale||!sale.closest('.panel'))return;
    let box=document.getElementById('a220QuickOffers');
    if(!box){const panel=sale.closest('.panel');const b=panel.querySelector('button[onclick="addToCart()"]');if(!b)return;box=document.createElement('div');box.id='a220QuickOffers';box.className='a220-quick-offers';b.insertAdjacentElement('afterend',box)}
    if(data)render();
  }
  const css=`html,body{font-size:15px}.a220-quick-offers{display:block;margin-top:14px;padding-top:4px;border-top:1px solid #e3e9f1}.a220-quick-title{display:flex;justify-content:space-between;align-items:center;font-weight:900;font-size:16px;margin:9px 0}.a220-quick-title span{font-size:13px;opacity:.65}.a220-quick-list{display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:8px}.a220-quick-offer{width:100%;display:flex;align-items:center;gap:10px;text-align:left;padding:12px;border:1px solid #9fc6ec;border-radius:9px;background:#f3f8ff;cursor:pointer;font:inherit}.a220-quick-icon{font-size:22px}.a220-quick-info{min-width:0;flex:1}.a220-quick-info strong,.a220-quick-info small{display:block;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.a220-quick-info strong{font-size:15px}.a220-quick-info small{font-size:12px;opacity:.65;margin-top:2px}.a220-quick-arrow{font-size:25px;font-weight:900}.a220-offer-modal{position:fixed;inset:0;background:rgba(0,0,0,.45);display:none;align-items:center;justify-content:center;padding:18px;z-index:9999}.a220-offer-modal-card{width:min(430px,100%);background:#fff;border-radius:14px;padding:16px;box-shadow:0 15px 45px rgba(0,0,0,.25)}.a220-offer-modal-head{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:12px}.a220-offer-modal-head strong,.a220-offer-modal-head small{display:block}.a220-offer-modal-head strong{font-size:18px}.a220-offer-modal-head small{font-size:12px;opacity:.65;margin-top:3px}.a220-offer-close{border:0;background:transparent;font-size:28px;cursor:pointer}.a220-offer-options{display:grid;gap:8px}.a220-offer-option{display:flex;align-items:center;justify-content:space-between;gap:12px;width:100%;padding:14px;border:1px solid #9fc6ec;border-radius:10px;background:#f3f8ff;cursor:pointer;text-align:left;font:inherit}.a220-offer-option strong,.a220-offer-option small{display:block}.a220-offer-option strong{font-size:16px}.a220-offer-option small{font-size:11px;opacity:.6;margin-top:2px}.a220-offer-option b{font-size:17px;white-space:nowrap}@media(max-width:480px){.a220-quick-list{grid-template-columns:1fr}}`;
  if(!document.getElementById('a220QuickOffersStyle')){const s=document.createElement('style');s.id='a220QuickOffersStyle';s.textContent=css;document.head.appendChild(s)}
  window.a220RenderQuickOffers=render;window.a220EnsureQuickOffers=ensure;window.a220QuickOffersWatch=setInterval(ensure,400);
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(ensure,200));else setTimeout(ensure,200);
})();
