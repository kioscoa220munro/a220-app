// A220 Pro - impresión simple con la impresora predeterminada de Windows
const A220_PRINTER_CONFIG=Object.freeze({name:'Windows predeterminada',paperWidth:58,autoPrint:false,openDrawerOnCash:false});
function a220TicketHTML(s){
  const esc=v=>String(v??'').replace(/[&<>\"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#39;'}[m]));
  const moneyFn=v=>typeof money==='function'?money(v):'$'+Number(v||0).toFixed(2);
  const offers=Array.isArray(s.offers)?s.offers:[];
  // Cantidades que ya están incluidas en una oferta. No se vuelven a cobrar/mostrar
  // como precio normal en el ticket: la oferta es la que representa ese importe.
  const offeredQty={};
  offers.forEach(c=>(c.items||[]).forEach(i=>{const id=String(i.id);offeredQty[id]=(offeredQty[id]||0)+Number(i.qty||0)}));
  const items=(s.items||[]).map(i=>{
    const q=Number(i.qty||0),oq=Math.min(q,offeredQty[String(i.id)]||0),normalQty=q-oq;
    if(normalQty<=0)return '';
    return `<div class="line"><div>${esc(i.name||'Producto')}</div><div>${normalQty} x ${moneyFn(i.price)} <b>${moneyFn(normalQty*Number(i.price||0))}</b></div></div>`;
  }).join('');
  const offerHTML=offers.map(c=>{
    const normal=Number(c.originalTotal)||0;
    const offerPrice=Number(c.price)||0;
    const saving=Math.max(0,normal-offerPrice);
    const details=(c.items||[]).map(i=>`${i.qty}× ${esc(i.name||'Producto')}`).join(' + ');
    return `<div class="offer"><div><strong>🎁 OFERTA: ${esc(c.name||'Combo')}</strong>${c.label?`<span>${esc(c.label)}</span>`:''}</div><div>${details}</div><div>Precio oferta: <strong>${moneyFn(offerPrice)}</strong></div>${saving>0?`<div>Ahorro: ${moneyFn(saving)}</div>`:''}</div>`;
  }).join('');
  const payment=s.paymentMethod==='cash'?'EFECTIVO':s.paymentMethod==='mercado'?'MERCADO PAGO':s.paymentMethod==='qr'?'QR':s.paymentMethod==='card'?'TARJETA':s.paymentMethod==='transfer'?'TRANSFERENCIA':'OTRO';
  return `<!doctype html><html><head><meta charset="utf-8"><title>Ticket A220</title><style>@page{size:58mm auto;margin:0}html,body{margin:0;padding:0!important;background:#fff!important;color:#000!important;color-scheme:light!important;font-family:Arial,sans-serif;font-size:11px;-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important}body{width:58mm;padding:4mm;box-sizing:border-box;color:#000!important}*{color:#000!important;background-color:transparent!important;text-shadow:none!important;-webkit-text-fill-color:#000!important} .head,.line,.offer,.sep,.total,.center,body div,body span,body strong,body b{color:#000!important} @media print{html,body{background:#fff!important;color:#000!important;color-scheme:light!important}*{color:#000!important;background-color:transparent!important;-webkit-text-fill-color:#000!important}}.head{text-align:center;font-weight:700}.logo{font-size:22px}.title{font-size:12px;margin:3px 0 6px}.line{border-bottom:1px dashed #000;padding:4px 0;line-height:1.25}.line b{float:right}.offer{border:1px solid #000;padding:5px;margin:5px 0;line-height:1.3}.offer strong{font-weight:700}.offer span{display:block}.sep{border-top:1px dashed #000;margin:5px 0}.total{font-size:16px;font-weight:700;display:flex;justify-content:space-between}.center{text-align:center;margin-top:8px}</style></head><body><div class="head"><div class="logo">⚡ A 220</div><div>KIOSCO</div><div class="title">COMPROBANTE DE VENTA</div></div><div>${esc(new Date(s.date).toLocaleString('es-AR'))}</div><div class="sep"></div>${items}${offerHTML}${!items&&!offerHTML?'<div>Sin detalle de artículos</div>':''}<div class="sep"></div>${offers.length?`<div><strong>🎁 OFERTA APLICADA</strong></div>`:''}<div class="total"><span>TOTAL</span><span>${moneyFn(s.total)}</span></div><div>Pago: ${payment}</div>${Number(s.paid)>0?`<div>Recibido: ${moneyFn(s.paid)}</div><div>Vuelto: ${moneyFn(s.change)}</div>`:''}<div class="center">GRACIAS POR SU COMPRA</div><script>window.onload=()=>{window.focus();window.print();setTimeout(()=>window.close(),300)};<\/script></body></html>`;
}
async function a220PrintTicketDirect(s){const w=window.open('','_blank','width=420,height=700');if(!w)throw new Error('El navegador bloqueó la ventana de impresión');w.document.open();w.document.write(a220TicketHTML(s));w.document.close();return true}
async function a220TryDirectPrintTicket(s){try{await a220PrintTicketDirect(s);showToast('Ticket listo para imprimir','success');return true}catch(e){console.error('A220 print:',e);showToast(e.message,'error');return false}}
async function a220PrintPurchaseDirect(items){const text=['A220 KIOSCO','LISTA DE COMPRA',new Date().toLocaleDateString('es-AR'),'--------------------------------',...items.flatMap(x=>[x.p.name||'Producto',`STOCK ${x.stock}  +${x.qty} -> ${x.min}`]),'--------------------------------',`TOTAL EST. ${money(items.reduce((n,x)=>n+x.total,0))}`].join('\n');const w=window.open('','_blank','width=420,height=700');if(!w)throw new Error('El navegador bloqueó la ventana de impresión');w.document.write(`<pre style="font:11px Arial;white-space:pre-wrap">${text.replace(/[&<>]/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[m]))}</pre><script>window.onload=()=>{window.focus();window.print();setTimeout(()=>window.close(),300)};<\/script>`);w.document.close();return true}
