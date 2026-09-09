// A220 Pro - modo Fácil para celular: venta rápida, táctil y con teclado.
(function(){
  let easyCart=[];
  let easyPaid=0;
  let easyChange=0;
  let easyLastSaleId='';

  const esc=v=>typeof escapeHTML==='function'?escapeHTML(v):String(v??'');
  const total=()=>easyCart.reduce((n,i)=>n+i.qty*i.price,0);

  function inject(){
    if(document.getElementById('a220EasyButton'))return;
    const headerRight=document.querySelector('.header-right');
    if(!headerRight)return;
    const b=document.createElement('button');
    b.id='a220EasyButton';
    b.className='btn btn-primary';
    b.type='button';
    b.textContent='Fácil';
    b.onclick=open;
    headerRight.insertBefore(b,headerRight.firstChild);

    const s=document.createElement('section');
    s.id='a220EasyView';
    s.className='a220-easy-view';
    s.setAttribute('aria-hidden','true');
    s.innerHTML=`<div class="a220-easy-head"><span>Fácil</span><button type="button" class="btn btn-danger" id="a220EasyExit">Salir</button></div>
      <div class="a220-easy-body">
        <div class="a220-easy-step active" data-step="product">
          <label for="a220EasySearch">Producto</label>
          <input id="a220EasySearch" class="a220-easy-input" autocomplete="off" inputmode="text" placeholder="Escribí el nombre…">
          <div id="a220EasyResults" class="a220-easy-results"></div>
        </div>
        <div class="a220-easy-cart" id="a220EasyCart"></div>
        <div class="a220-easy-step" data-step="pay">
          <div class="a220-easy-total"><span>Total</span><strong id="a220EasyTotal">$0</strong></div>
          <label for="a220EasyPaid">Recibido</label>
          <input id="a220EasyPaid" class="a220-easy-input" type="number" min="0" step="1" inputmode="decimal" placeholder="$ recibido">
          <div class="a220-easy-change"><span>Vuelto</span><strong id="a220EasyChange">$0</strong></div>
          <button type="button" class="btn btn-info btn-block" id="a220EasyChangeBtn">Calcular vuelto</button>
        </div>
        <div class="a220-easy-actions">
          <button type="button" class="btn btn-success btn-block" id="a220EasyFinish">Aceptar venta</button>
          <button type="button" class="btn btn-outline btn-block" id="a220EasyReload">Recargar / nueva venta</button>
        </div>
        <div id="a220EasyStatus" class="a220-easy-status" aria-live="polite"></div>
      </div>`;
    document.body.appendChild(s);

    document.getElementById('a220EasyExit').onclick=close;
    document.getElementById('a220EasySearch').addEventListener('input',search);
    document.getElementById('a220EasySearch').addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();const first=document.querySelector('#a220EasyResults button');if(first)first.click();}});
    document.getElementById('a220EasyPaid').addEventListener('input',calculateChange);
    document.getElementById('a220EasyPaid').addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();calculateChange();document.getElementById('a220EasyFinish').focus();}});
    document.getElementById('a220EasyChangeBtn').onclick=calculateChange;
    document.getElementById('a220EasyFinish').onclick=finish;
    document.getElementById('a220EasyReload').onclick=reloadSale;
  }

  function open(){
    if(!appData){showToast?.('⚠️ A220 todavía no está lista','error');return}
    inject();
    easyCart=[];easyPaid=0;easyChange=0;easyLastSaleId='';
    document.getElementById('a220EasyView').classList.add('open');
    document.getElementById('a220EasyView').setAttribute('aria-hidden','false');
    document.body.classList.add('a220-easy-open');
    render();
    setTimeout(()=>document.getElementById('a220EasySearch')?.focus(),50);
  }

  function close(){
    document.getElementById('a220EasyView')?.classList.remove('open');
    document.getElementById('a220EasyView')?.setAttribute('aria-hidden','true');
    document.body.classList.remove('a220-easy-open');
  }

  function search(){
    const q=document.getElementById('a220EasySearch').value.trim().toLowerCase();
    const list=document.getElementById('a220EasyResults');
    if(!q){list.innerHTML='';return}
    const found=(appData.products||[]).filter(p=>Number(p.stock)>0&&`${p.name||''} ${p.brand||''} ${p.cat||''}`.toLowerCase().includes(q)).sort((a,b)=>String(a.name).localeCompare(String(b.name),'es',{sensitivity:'base'})).slice(0,8);
    list.innerHTML=found.map(p=>`<button type="button" class="a220-easy-result" data-id="${p.id}"><span>${esc(p.name)}</span><strong>${money(p.price)}</strong></button>`).join('')||'<div class="a220-easy-empty">Sin coincidencias</div>';
    list.querySelectorAll('button').forEach(b=>b.onclick=()=>add(Number(b.dataset.id)));
  }

  function add(id){
    const p=findProduct(id);if(!p||Number(p.stock)<=0)return;
    const existing=easyCart.find(i=>i.id===p.id);
    if(existing){if(existing.qty>=Number(p.stock)){showToast?.('⚠️ Stock insuficiente','error');return}existing.qty++;existing.price=Number(p.price)||0;}
    else easyCart.push({id:p.id,name:p.name,qty:1,price:Number(p.price)||0});
    const input=document.getElementById('a220EasySearch');input.value='';document.getElementById('a220EasyResults').innerHTML='';
    render();
    const qty=document.querySelector(`#a220EasyCart [data-qty="${p.id}"]`);qty?.focus();qty?.select();
  }

  function setQty(id,value){
    const item=easyCart.find(i=>i.id===id),p=findProduct(id);if(!item||!p)return;
    const qty=Math.max(1,Math.min(Number(p.stock)||1,Number(value)||1));item.qty=qty;render();
  }

  function remove(id){easyCart=easyCart.filter(i=>i.id!==id);render();}

  function render(){
    const box=document.getElementById('a220EasyCart');if(!box)return;
    box.innerHTML=easyCart.map(i=>`<div class="a220-easy-line"><div class="a220-easy-line-name">${esc(i.name)}</div><input class="a220-easy-qty" data-qty="${i.id}" type="number" min="1" inputmode="numeric" value="${i.qty}"><strong>${money(i.qty*i.price)}</strong><button type="button" class="a220-easy-remove" data-remove="${i.id}">×</button></div>`).join('');
    box.querySelectorAll('[data-qty]').forEach(el=>el.addEventListener('change',()=>setQty(Number(el.dataset.qty),el.value)));
    box.querySelectorAll('[data-remove]').forEach(el=>el.onclick=()=>remove(Number(el.dataset.remove)));
    const t=total();document.getElementById('a220EasyTotal').textContent=money(t);
    const pay=document.querySelector('#a220EasyView [data-step="pay"]');pay?.classList.toggle('active',easyCart.length>0);
    document.getElementById('a220EasyFinish').disabled=!easyCart.length;
    calculateChange();
  }

  function calculateChange(){
    easyPaid=Number(document.getElementById('a220EasyPaid')?.value)||0;
    easyChange=Math.max(0,easyPaid-total());
    const el=document.getElementById('a220EasyChange');if(el)el.textContent=money(easyChange);
  }

  async function finish(){
    if(!easyCart.length){showToast?.('⚠️ Agregá un producto','error');return}
    for(const i of easyCart){const p=findProduct(i.id);if(!p||i.qty>Number(p.stock)){showToast?.(`⚠️ Stock insuficiente: ${i.name}`,'error');return}}
    const t=total();easyPaid=Number(document.getElementById('a220EasyPaid').value)||0;
    if(easyPaid<t){showToast?.('⚠️ Falta efectivo','error');document.getElementById('a220EasyPaid').focus();return}
    const now=new Date().toISOString();const sale={id:crypto.randomUUID(),date:now,total:t,items:structuredClone(easyCart),offers:[],cliente:'Sin cliente',telefono:'',clientId:null,paid:easyPaid,change:easyPaid-t,paymentMethod:'cash'};
    easyCart.forEach(i=>{const p=findProduct(i.id);p.stock-=i.qty;appData.moves.unshift({id:crypto.randomUUID(),date:now,product:i.name,productId:i.id,qty:i.qty,total:i.qty*i.price,cliente:'Sin cliente',clientId:null,saleId:sale.id})});
    appData.sales.unshift(sale);logActivity('sale','Venta realizada',`${easyCart.length} artículo(s) · ${money(t)} · efectivo`);
    const saved=await saveLocalData();
    easyLastSaleId=sale.id;
    if(saved){
      document.getElementById('a220EasyStatus').textContent='✓ Venta guardada. Aceptar para seguir.';
      showToast?.(`💰 Venta registrada: ${money(t)}`,'success');
      await verifyLocalPersistence();
    }
    render();
  }

  async function verifyLocalPersistence(){
    try{
      const raw=localStorage.getItem(APP_CONFIG.storageKey);if(!raw)throw new Error('sin almacenamiento local');
      const env=JSON.parse(raw);const restored=await decryptEnvelope(env,a220Password);const ok=restored.data.sales.some(s=>String(s.id)===String(easyLastSaleId));
      if(ok){document.getElementById('a220EasyStatus').textContent='✓ Guardada y verificada en este celular.';return true}
      throw new Error('venta no encontrada');
    }catch(e){
      document.getElementById('a220EasyStatus').textContent='↻ No se pudo verificar. Recargando…';
      setTimeout(()=>window.location.reload(),250);
      return false;
    }
  }

  function reloadSale(){
    easyCart=[];easyPaid=0;easyChange=0;easyLastSaleId='';
    const s=document.getElementById('a220EasySearch'),p=document.getElementById('a220EasyPaid');if(s)s.value='';if(p)p.value='';
    const status=document.getElementById('a220EasyStatus');if(status)status.textContent='';
    render();s?.focus();
  }

  document.addEventListener('DOMContentLoaded',inject);
})();
