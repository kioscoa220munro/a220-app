// A220 Pro - deshacer la última venta y devolver stock
function getLastSale(){
  if(!appData||!Array.isArray(appData.sales)||!appData.sales.length)return null;
  return appData.sales[0]||null;
}

function undoLastSale(){
  const sale=getLastSale();
  if(!sale){showToast('ℹ️ No hay ventas para deshacer','info');return false}
  const items=Array.isArray(sale.items)?sale.items:[];
  if(!items.length){showToast('⚠️ La última venta no tiene artículos guardados','error');return false}
  const when=new Date(sale.date).toLocaleString('es-AR');
  const detail=items.map(i=>`${i.name} ×${i.qty}`).join(', ');
  if(!confirm(`¿Deshacer la última venta?\n\n${when}\n${detail}\n\nSe devolverán los artículos al stock y se quitará la venta de las estadísticas.`))return false;

  items.forEach(i=>{
    const p=findProduct(i.id);
    if(p)p.stock=Math.max(0,Number(p.stock||0)+Number(i.qty||0));
  });

  const saleId=String(sale.id||'');
  if(saleId){
    appData.moves=appData.moves.filter(m=>String(m.saleId||'')!==saleId);
  }else{
    appData.moves=appData.moves.filter(m=>{
      if(String(m.date)!==String(sale.date))return true;
      const item=items.find(i=>Number(i.id)===Number(m.productId)&&Number(i.qty)===Number(m.qty)&&Math.abs(Number(i.total||0)-Number(m.total||0))<0.01);
      if(!item)return true;
      if(sale.clientId&&m.clientId&&Number(sale.clientId)!==Number(m.clientId))return true;
      if(!sale.clientId&&String(sale.cliente||'Sin cliente')!==String(m.cliente||'Sin cliente'))return true;
      return false;
    });
  }

  appData.sales.shift();
  logActivity('undo','Venta deshecha',`${items.length} artículo(s) · ${money(Number(sale.total||0))}`);
  saveLocalData();
  renderAll();
  showToast(`↩️ Venta deshecha · stock devuelto · ${money(Number(sale.total||0))}`,'success');
  return true;
}

function ensureA220UndoButton(){
  if(document.getElementById('a220UndoSaleButton'))return;
  const finish=document.querySelector('button[onclick="finishSale()"]');
  if(!finish)return;
  const b=document.createElement('button');
  b.id='a220UndoSaleButton';
  b.className='btn btn-outline btn-block';
  b.type='button';
  b.textContent='↩ Deshacer última venta';
  b.onclick=undoLastSale;
  finish.insertAdjacentElement('afterend',b);
}

document.addEventListener('DOMContentLoaded',()=>setTimeout(ensureA220UndoButton,80));
