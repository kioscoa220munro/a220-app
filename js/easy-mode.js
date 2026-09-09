// A220 Pro - modo Fácil: calculadora rápida con venta local y sincronización opcional.
(function(){
  let easyCart=[];
  let accepting=false;
  const esc=v=>typeof escapeHTML==='function'?escapeHTML(v):String(v??'');
  const total=()=>easyCart.reduce((n,i)=>n+i.qty*i.price,0);
  const getOfferPrice=t=>Number(t?.price||0);

  function inject(){
    if(document.getElementById('a220EasyButton'))return;
    const headerRight=document.querySelector('.header-right');if(!headerRight)return;
    const b=document.createElement('button');b.id='a220EasyButton';b.className='btn btn-primary';b.type='button';b.textContent='Fácil';b.onclick=open;headerRight.insertBefore(b,headerRight.firstChild);
    const s=document.createElement('section');s.id='a220EasyView';s.className='a220-easy-view';s.setAttribute('aria-hidden','true');
    s.innerHTML=`<div class="a220-easy-head"><span>Fácil</span><button type="button" class="btn btn-danger" id="a220EasyExit">Salir</button></div><div class="a220-easy-body"><div class="a220-easy-step active"><label for="a220EasySearch">Producto u oferta</label><input id="a220EasySearch" class="a220-easy-input" autocomplete="off" inputmode="text" placeholder="Escribí el nombre…"><div id="a220EasyResults" class="a220-easy-results"></div></div><div class="a220-easy-cart" id="a220EasyCart"></div><div class="a220-easy-step" data-step="pay"><div class="a220-easy-total"><span>Total</span><strong id="a220EasyTotal">$0</strong></div><label for="a220EasyPaid">Recibido</label><input id="a220EasyPaid" class="a220-easy-input" type="number" min="0" step="1" inputmode="decimal" placeholder="$ recibido"><div class="a220-easy-change"><span>Vuelto</span><strong id="a220EasyChange">$0</strong></div></div><div class="a220-easy-actions"><button type="button" class="btn btn-success btn-block" id="a220EasyFinish">Aceptar venta</button><button type="button" class="btn btn-outline btn-block" id="a220EasyClear">Borrar todo</button></div><div id="a220EasyStatus" class="a220-easy-status" aria-live="polite"></div></div><div class="a220-easy-sync-modal" id="a220EasySyncModal" aria-hidden="true"><div class="a220-easy-sync-backdrop" data-easy-sync-close></div><div class="a220-easy-sync-card" role="dialog" aria-modal="true" aria-labelledby="a220EasySyncTitle"><div class="a220-easy-sync-icon">☁️</div><h3 id="a220EasySyncTitle">Venta guardada</h3><p>¿Realmente querés sincronizar esta venta?</p><div class="a220-easy-sync-detail" id="a220EasySyncDetail"></div><div class="a220-easy-sync-actions"><button type="button" class="btn btn-outline" id="a220EasySyncNo">No, dejar local</button><button type="button" class="btn btn-success" id="a220EasySyncYes">Sí, sincronizar</button></div></div></div>`;
    document.body.appendChild(s);
    document.getElementById('a220EasyExit').onclick=close;
    document.getElementById('a220EasySearch').addEventListener('input',search);
    document.getElementById('a220EasySearch').addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();document.querySelector('#a220EasyResults button')?.click()}});
    document.getElementById('a220EasyPaid').addEventListener('input',calculateChange);
    document.getElementById('a220EasyPaid').addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();acceptSale()}});
    document.getElementById('a220EasyFinish').onclick=acceptSale;
    document.getElementById('a220EasyClear').onclick=clearSale;
    document.getElementById('a220EasySyncYes').onclick=syncAcceptedSale;
    document.getElementById('a220EasySyncNo').onclick=finishSyncDecision;
    s.querySelector('[data-easy-sync-close]').onclick=finishSyncDecision;
  }
  function open(){if(!appData){showToast?.('⚠️ A220 todavía no está lista','error');return}easyCart=[];accepting=false;document.getElementById('a220EasyView').classList.add('open');document.body.classList.add('a220-easy-open');render();setTimeout(()=>document.getElementById('a220EasySearch')?.focus(),50)}
  function close(){if(accepting)return;document.getElementById('a220EasyView')?.classList.remove('open');document.body.classList.remove('a220-easy-open');closeSyncModal()}
  function search(){const q=document.getElementById('a220EasySearch').value.trim().toLowerCase(),list=document.getElementById('a220EasyResults');if(!q){list.innerHTML='';return}const products=(appData.products||[]).filter(p=>`${p.name||''} ${p.brand||''} ${p.cat||''}`.toLowerCase().includes(q)).slice(0,6).map(p=>({type:'product',id:p.id,name:p.name,price:Number(p.price)||0}));const offers=(appData.offers||[]).filter(o=>`${o.name||''} ${(o.tiers||[]).map(t=>t.label||t.name||t.presentation||'').join(' ')}`.toLowerCase().includes(q)).slice(0,6).map((o,oi)=>({type:'offer',id:o.id,name:o.name,offer:o,index:oi}));const found=[...products,...offers].slice(0,8);list.innerHTML=found.map(x=>x.type==='product'?`<button type="button" class="a220-easy-result" data-type="product" data-id="${x.id}"><span>${esc(x.name)}</span><strong>${money(x.price)}</strong></button>`:`<button type="button" class="a220-easy-result" data-type="offer" data-id="${x.id}"><span>🎁 ${esc(x.name)}</span><strong>Oferta</strong></button>`).join('')||'<div class="a220-easy-empty">Sin coincidencias</div>';list.querySelectorAll('button').forEach(b=>b.onclick=()=>b.dataset.type==='offer'?addOffer(Number(b.dataset.id)):addProduct(Number(b.dataset.id)))}
  function addProduct(id){const p=findProduct(id);if(!p)return;const key='p:'+p.id,existing=easyCart.find(i=>i.key===key);if(existing)existing.qty++;else easyCart.push({key,type:'product',id:p.id,name:p.name,qty:1,price:Number(p.price)||0});afterAdd()}
  function addOffer(id){const o=(appData.offers||[]).find(x=>Number(x.id)===id);if(!o)return;const tiers=(o.tiers||[]).slice().sort((a,b)=>Number(a.qty||0)-Number(b.qty||0));if(!tiers.length){showToast?.('⚠️ Esta oferta no tiene precio configurado','error');return}if(tiers.length===1){pushOffer(o,tiers[0],0);return}const labels=tiers.map((t,i)=>`${i+1}. ${t.label||t.name||t.presentation||`${t.qty||1} unidades`} — ${money(getOfferPrice(t))}`).join('\n');const choice=prompt(`🎁 ${o.name}\nElegí una opción:\n${labels}`,'1');if(choice===null)return;const idx=Number(choice)-1;if(!tiers[idx]){showToast?.('⚠️ Opción inválida','error');return}pushOffer(o,tiers[idx],idx)}
  function pushOffer(o,tier,idx){const label=tier.label||tier.name||tier.presentation||`${tier.qty||1} unidades`;const key=`o:${o.id}:${idx}`;const existing=easyCart.find(i=>i.key===key);if(existing)existing.qty++;else easyCart.push({key,type:'offer',id:o.id,name:`🎁 ${o.name} · ${label}`,qty:1,price:getOfferPrice(tier),offerId:o.id,offerQty:Number(tier.qty)||1});afterAdd()}
  function afterAdd(){const input=document.getElementById('a220EasySearch');input.value='';document.getElementById('a220EasyResults').innerHTML='';render();input.focus()}
  function setQty(key,value){const item=easyCart.find(i=>i.key===key);if(!item)return;item.qty=Math.max(1,Number(value)||1);render()}
  function remove(key){easyCart=easyCart.filter(i=>i.key!==key);render()}
  function render(){const box=document.getElementById('a220EasyCart');if(!box)return;box.innerHTML=easyCart.map(i=>`<div class="a220-easy-line"><div class="a220-easy-line-name">${esc(i.name)}</div><input class="a220-easy-qty" data-key="${esc(i.key)}" type="number" min="1" inputmode="numeric" value="${i.qty}"><strong>${money(i.qty*i.price)}</strong><button type="button" class="a220-easy-remove" data-remove="${esc(i.key)}">×</button></div>`).join('');box.querySelectorAll('[data-key]').forEach(el=>el.addEventListener('change',()=>setQty(el.dataset.key,el.value)));box.querySelectorAll('[data-remove]').forEach(el=>el.onclick=()=>remove(el.dataset.remove));document.getElementById('a220EasyTotal').textContent=money(total());document.querySelector('#a220EasyView [data-step="pay"]')?.classList.toggle('active',easyCart.length>0);document.getElementById('a220EasyFinish').disabled=!easyCart.length;calculateChange()}
  function calculateChange(){const paid=Number(document.getElementById('a220EasyPaid')?.value)||0,t=total(),change=paid-t,status=document.getElementById('a220EasyStatus');document.getElementById('a220EasyChange').textContent=money(Math.max(0,change));if(!easyCart.length){if(status)status.textContent='';return}if(paid===0){if(status)status.textContent='';return}if(change<0){if(status)status.textContent=`Faltan ${money(Math.abs(change))}`;return}if(status)status.textContent=`✓ Vuelto: ${money(change)}`}
  function acceptSale(){
    if(accepting)return;
    if(!appData){showToast?.('⚠️ A220 todavía no está lista','error');return}
    if(!easyCart.length){showToast?.('⚠️ Agregá al menos un artículo','error');return}
    const paid=Number(document.getElementById('a220EasyPaid')?.value)||0,t=total();
    if(paid<t){showToast?.(`⚠️ Faltan ${money(t-paid)}`,'error');return}
    accepting=true;
    const now=new Date().toISOString(),sale={id:crypto.randomUUID(),date:now,total:t,items:structuredClone(easyCart),offers:structuredClone(easyCart.filter(i=>i.type==='offer')),cliente:'Sin cliente',telefono:'',clientId:null,paid,change:Math.max(0,paid-t),paymentMethod:'cash',quick:true};
    appData.sales=Array.isArray(appData.sales)?appData.sales:[];appData.moves=Array.isArray(appData.moves)?appData.moves:[];
    for(const item of easyCart){if(item.type!=='product')continue;const p=findProduct(item.id);if(!p||Number(p.stock)<Math.max(1,Number(item.qty)||1)){accepting=false;showToast?.(`⚠️ Stock insuficiente: ${item.name}`,'error');return}}
    for(const item of easyCart){if(item.type!=='product')continue;const p=findProduct(item.id),qty=Math.max(1,Number(item.qty)||1);p.stock-=qty;appData.moves.unshift({id:crypto.randomUUID(),date:now,product:item.name,productId:item.id,qty,total:qty*Number(item.price||0),cliente:'Sin cliente',clientId:null,saleId:sale.id})}
    appData.sales.unshift(sale);logActivity('sale','Venta rápida realizada',`${easyCart.length} línea(s) · ${money(t)}`);
    try{if(typeof saveLocalData==='function')saveLocalData();else throw new Error('Guardado local no disponible')}catch(e){console.error('A220 Fácil local save:',e);accepting=false;showToast?.('❌ No se pudo guardar la venta local','error');return}
    renderAll?.();document.getElementById('a220EasyStatus').textContent='✓ Venta guardada en este dispositivo';document.getElementById('a220EasySyncDetail').innerHTML=`<strong>${money(t)}</strong><span>${easyCart.length} línea(s) · efectivo ${money(paid)} · vuelto ${money(Math.max(0,paid-t))}</span>`;openSyncModal();
  }
  function openSyncModal(){const m=document.getElementById('a220EasySyncModal');if(!m)return;m.classList.add('open');m.setAttribute('aria-hidden','false');document.body.classList.add('a220-easy-modal-open');setTimeout(()=>document.getElementById('a220EasySyncYes')?.focus(),50)}
  function closeSyncModal(){const m=document.getElementById('a220EasySyncModal');if(!m)return;m.classList.remove('open');m.setAttribute('aria-hidden','true');document.body.classList.remove('a220-easy-modal-open')}
  function finishSyncDecision(){closeSyncModal();accepting=false;easyCart=[];document.getElementById('a220EasyPaid').value='';render();document.getElementById('a220EasySearch')?.focus();showToast?.('💾 Venta guardada localmente','success')}
  async function syncAcceptedSale(){
    const yes=document.getElementById('a220EasySyncYes'),no=document.getElementById('a220EasySyncNo');if(!yes||!no)return;
    yes.disabled=true;no.disabled=true;yes.textContent='Sincronizando…';
    try{const ok=typeof syncToGitHub==='function'?await syncToGitHub():false;if(ok){closeSyncModal();showToast?.('☁️ Venta sincronizada','success')}else showToast?.('⚠️ No se pudo sincronizar. La venta sigue guardada localmente','error')}catch(e){console.error('A220 Fácil sync:',e);showToast?.('⚠️ No se pudo sincronizar. La venta sigue guardada localmente','error')}
    finally{yes.disabled=false;no.disabled=false;yes.textContent='Sí, sincronizar';no.textContent='No, dejar local';accepting=false;easyCart=[];document.getElementById('a220EasyPaid').value='';render();document.getElementById('a220EasySearch')?.focus()}
  }
  function clearSale(){easyCart=[];const s=document.getElementById('a220EasySearch'),p=document.getElementById('a220EasyPaid');if(s)s.value='';if(p)p.value='';document.getElementById('a220EasyResults').innerHTML='';document.getElementById('a220EasyStatus').textContent='';render();s?.focus()}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',inject);else inject();
})();