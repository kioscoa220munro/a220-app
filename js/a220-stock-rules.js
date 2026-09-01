// A220 Pro - reglas de catálogo/stock
(function(){
  function stockNumber(p){return Number(p?.stock)||0}
  function normalizeCode(v){return String(v??'').trim().replace(/\D/g,'')}
  function activeView(){return document.querySelector('.view.active')?.id||''}
  window.a220StockOnlySearch=function(){
    const input=document.getElementById('buscarProducto'),list=document.getElementById('listaProductos');
    if(!input||!list||!window.appData)return;
    const q=input.value.toLowerCase().trim();
    if(!q){list.style.display='none';return}
    const found=(appData.products||[]).filter(p=>stockNumber(p)>0&&`${p.name||''} ${p.brand||''} ${p.cat||''} ${p.barcode||''}`.toLowerCase().includes(q)).slice(0,20);
    list.innerHTML=found.map(p=>`<button class="search-result" onclick="setSelectedProduct(${p.id});document.getElementById('buscarProducto').value='';document.getElementById('listaProductos').style.display='none';document.getElementById('salePrice').focus();"><span><strong>${escapeHTML(p.name)}</strong>${p.brand?`<small>${escapeHTML(p.brand)}</small>`:''}<small>${escapeHTML(p.cat||'General')} · Stock ${p.stock}</small></span><span>${money(p.price)}</span></button>`).join('')||'<div class="empty">No hay artículos con stock.</div>';
    list.style.display='block';
  };
  window.a220ProcessCatalogScan=function(code){
    const normalized=normalizeCode(code);if(normalized.length<8)return false;
    const p=(appData?.products||[]).find(x=>normalizeCode(x.barcode)===normalized);
    if(activeView()==='productos'){
      if(p){
        const b=document.getElementById('pBarcode');if(b)b.value=normalized;
        if(typeof editProduct==='function')editProduct(p.id);
        showToast(`📦 ${p.name} · artículo existente`,'success');
        return true;
      }
      const b=document.getElementById('pBarcode');if(b)b.value=normalized;
      showToast('🔎 Buscando producto para agregar al catálogo…','info');
      if(typeof lookupCatalog==='function')lookupCatalog(normalized).then(result=>{
        if(result?.found&&result.product){
          const x=result.product;
          const name=document.getElementById('pName');if(name)name.value=x.name||'';
          const cat=document.getElementById('pCat');if(cat)cat.value=x.category?.split(',')[0]?.trim()||'General';
          const info=document.getElementById('pSourceInfo');if(info)info.textContent=x.source||'Catálogo externo';
          showToast('✅ Producto encontrado. Completá stock y precio y guardalo desde Artículos.','success');
        }else showToast('⚠️ Código no encontrado. Cargalo desde Artículos.','error');
      }).catch(()=>showToast('⚠️ No se pudo consultar el catálogo. El código quedó en Artículos.','error'));
      return true;
    }
    if(activeView()==='ventas'){
      if(!p){showToast('⚠️ Ese código no existe en Artículos o no tiene stock.','error');return false}
      if(stockNumber(p)<=0){showToast('⚠️ Artículo sin stock. Cargá stock desde Artículos.','error');return false}
      setSelectedProduct(p.id);showToast(`🛒 ${p.name}`,'success');return true;
    }
    return false;
  };
  const oldProcess=window.processScan;
  window.processScan=async function(code){
    if(window.a220ProcessCatalogScan(code))return;
    if(typeof oldProcess==='function')return oldProcess(code);
  };
  const oldFilter=window.filterSaleProducts;
  window.filterSaleProducts=function(){window.a220StockOnlySearch()};
  const oldRemote=window.searchRemoteProducts;
  window.searchRemoteProducts=function(){};
})();
