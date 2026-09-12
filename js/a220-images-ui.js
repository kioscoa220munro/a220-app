// A220 Pro - interfaz visual de imágenes de producto.
(function(){
  function apply(){
    const ref=document.getElementById('priceChoiceReference');
    if(ref)ref.innerHTML='Precio de venta A220: <strong>lo establecés vos</strong>';
    const actions=document.querySelector('#priceChoiceModal .modal-actions');
    if(actions){const buttons=actions.querySelectorAll('button');if(buttons[0]){buttons[0].textContent='Establecer precio';buttons[0].onclick=()=>chooseReferencePrice()}if(buttons[1])buttons[1].style.display='none'}
    const title=document.getElementById('priceChoiceQuestion');
    if(title)title.textContent='Ingresá el precio de venta que establecés para A220.';
    if(!document.getElementById('a220ImageStyles')){const style=document.createElement('style');style.id='a220ImageStyles';style.textContent='.product-cell{display:flex;align-items:center;gap:10px}.product-thumb-wrap{width:48px;height:48px;display:grid;place-items:center;border-radius:10px;overflow:hidden;background:var(--panel-2,#f1f3f5);flex:none}.product-thumb{width:100%;height:100%;object-fit:contain}.product-thumb-fallback{font-size:20px;opacity:.45}.scan-product-image{width:82px;height:82px;display:grid;place-items:center;border-radius:14px;overflow:hidden;background:var(--panel-2,#f1f3f5);margin-bottom:10px}.scan-product-image img{width:100%;height:100%;object-fit:contain}.scan-product-image .fas{font-size:30px;opacity:.45}.search-result-image{width:42px;height:42px;display:grid;place-items:center;border-radius:8px;overflow:hidden;background:var(--panel-2,#f1f3f5);flex:none}.search-result-image img{width:100%;height:100%;object-fit:contain}.search-result-image .fas{font-size:18px;opacity:.45}';document.head.appendChild(style)}
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',apply);else apply();
})();
