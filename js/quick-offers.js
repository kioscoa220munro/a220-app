// A220 - acceso rápido a ofertas en Ventas + ajuste general de lectura
(function(){
  function render(){
    const box=document.getElementById('a220QuickOffers');
    if(!box||!window.appData)return;
    const offers=Array.isArray(appData.offers)?appData.offers:[];
    if(!offers.length){box.innerHTML='';return}
    const moneyFn=typeof money==='function'?money:(v)=>`$${Number(v||0).toLocaleString('es-AR')}`;
    const esc=typeof escapeHTML==='function'?escapeHTML:(v)=>String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
    box.innerHTML=`<div class="a220-quick-title">🎁 OFERTAS DISPONIBLES <span>${offers.length}</span></div><div class="a220-quick-list">${offers.map(o=>{const ids=(o.productIds||[]).map(Number);const products=(appData.products||[]).filter(p=>ids.includes(Number(p.id)));const tiers=(o.tiers||[]).slice().sort((a,b)=>Number(a.qty||0)-Number(b.qty||0));const first=tiers[0];return `<button type="button" class="a220-quick-offer" data-offer-id="${Number(o.id)}"><span class="a220-quick-icon">🎁</span><span class="a220-quick-info"><strong>${esc(o.name)}</strong><small>${esc(products.map(p=>p.name).join(' + '))}</small></span><span class="a220-quick-price">${first?moneyFn(first.price):'Oferta'}</span></button>`}).join('')}</div>`;
    box.querySelectorAll('.a220-quick-offer').forEach(btn=>btn.addEventListener('click',()=>selectOffer(Number(btn.dataset.offerId))));
  }
  function selectOffer(id){
    const offer=(appData.offers||[]).find(o=>Number(o.id)===id);if(!offer)return;
    const products=(appData.products||[]).filter(p=>(offer.productIds||[]).map(Number).includes(Number(p.id))&&Number(p.stock)>0);
    if(!products.length){if(typeof showToast==='function')showToast('⚠️ Esta oferta no tiene artículos con stock','error');return}
    let choice=products.length===1?'1':prompt(`🎁 ${offer.name}\n\n¿Qué artículo querés agregar?\n${products.map((p,i)=>`${i+1}. ${p.name} (stock ${p.stock})`).join('\n')}`,'1');
    if(choice===null)return;const p=products[Number(choice)-1];if(!p){if(typeof showToast==='function')showToast('⚠️ Selección inválida','error');return}
    const qty=Number(prompt(`¿Cuántas unidades de ${p.name} querés agregar?`,'1'));if(!Number.isFinite(qty)||qty<1)return;
    if(typeof addProductToCart==='function')addProductToCart(p,Math.floor(qty),p.price);
  }
  function ensure(){const sale=document.getElementById('saleProduct');if(!sale||!sale.parentElement)return;if(document.getElementById('a220QuickOffers')){render();return}const b=sale.closest('.panel')?.querySelector('button[onclick="addToCart()"]');if(!b)return;const box=document.createElement('div');box.id='a220QuickOffers';box.className='a220-quick-offers';b.insertAdjacentElement('afterend',box);render()}
  const css=`html,body{font-size:15px}label{font-size:13px}.muted,.field-note{font-size:12px}nav button{font-size:13px}.btn{font-size:12px}.range-btn{font-size:12px}th,td{font-size:12px}th{font-size:10px}.bar-label{font-size:11px}.panel-title span{font-size:11px}.search-result{font-size:12px}.search-result small{font-size:10px}.product-name{font-size:15px}.product-price{font-size:14px}.product-stock{font-size:11px}.toast{font-size:13px}.a220-quick-offers{margin-top:12px}.a220-quick-title{display:flex;justify-content:space-between;align-items:center;font-weight:900;font-size:15px;margin:9px 0}.a220-quick-title span{font-size:12px;opacity:.65}.a220-quick-list{display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:7px}.a220-quick-offer{width:100%;display:flex;align-items:center;gap:9px;text-align:left;padding:11px;border:1px solid #9fc6ec;border-radius:9px;background:#f3f8ff;cursor:pointer;font:inherit}.a220-quick-offer:hover{transform:translateY(-1px);box-shadow:0 4px 12px #00000012}.a220-quick-icon{font-size:21px}.a220-quick-info{min-width:0;flex:1}.a220-quick-info strong,.a220-quick-info small{display:block;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.a220-quick-info strong{font-size:14px}.a220-quick-info small{font-size:11px;opacity:.65;margin-top:2px}.a220-quick-price{font-size:14px;font-weight:900;white-space:nowrap}@media(max-width:480px){.a220-quick-list{grid-template-columns:1fr}html,body{font-size:15px}h2{font-size:22px}}`;
  if(!document.getElementById('a220QuickOffersStyle')){const s=document.createElement('style');s.id='a220QuickOffersStyle';s.textContent=css;document.head.appendChild(s)}
  window.a220RenderQuickOffers=render;
  window.a220EnsureQuickOffers=ensure;
  window.a220QuickOffersWatch=setInterval(ensure,500);
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(ensure,300));else setTimeout(ensure,300);
})();
