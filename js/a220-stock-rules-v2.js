// A220 Pro - reglas finales de catálogo/stock
(function(){
  const n=v=>Number(v)||0;
  const code=v=>String(v??'').trim().replace(/\D/g,'');
  const view=()=>document.querySelector('.view.active')?.id||'';
  window.a220ApplyStockRules=function(){
    if(typeof renderSaleProducts==='function'){
      const original=renderSaleProducts;
      window.renderSaleProducts=function(){
        const select=document.getElementById('saleProduct');if(!select||!appData)return;
        const current=select.value;
        const sorted=[...(appData.products||[])].filter(p=>n(p.stock)>0).sort((a,b)=>String(a.name||'').localeCompare(String(b.name||''),'es',{sensitivity:'base'}));
        select.innerHTML='<option value="">Seleccioná...</option>'+sorted.map(p=>`<option value="${p.id}">${escapeHTML(p.name)}${p.brand?` · ${escapeHTML(p.brand)}`:''} · ${money(p.price)} · Stock ${p.stock}</option>`).join('');
        if(sorted.some(p=>String(p.id)===String(current)))select.value=current;
        if(typeof updateSalePreview==='function')updateSalePreview();
      };
    }
    window.filterSaleProducts=function(){
      const input=document.getElementById('buscarProducto'),list=document.getElementById('listaProductos');if(!input||!list||!appData)return;
      const q=input.value.toLowerCase().trim();if(!q){list.style.display='none';return}
      const found=(appData.products||[]).filter(p=>n(p.stock)>0&&`${p.name||''} ${p.brand||''} ${p.cat||''} ${p.barcode||''}`.toLowerCase().includes(q)).slice(0,20);
      if(typeof renderSearchResults==='function')renderSearchResults(found);list.style.display='block';
    };
  };
  const bootFix=()=>window.a220ApplyStockRules();
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(bootFix,0));else setTimeout(bootFix,0);
})();
