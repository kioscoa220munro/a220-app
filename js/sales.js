// A220 Pro - ventas (carrito, cobro, deshacer) + carga de módulos de ofertas
let cart = [];
let currentQty = 1;

/* ---------- Helpers ---------- */
const $ = (id) => document.getElementById(id);
const setText = (id, value) => {
  const el = $(id);
  if (el) el.textContent = value;
};
const cartSubtotal = () => cart.reduce((sum, i) => sum + Number(i.total || 0), 0);
const saleTotal = () => (typeof a220GetSaleTotal === 'function' ? a220GetSaleTotal() : cartSubtotal());
const hasStock = (p) => Number(p?.stock) > 0;

function findProduct(id) {
  return appData.products.find((p) => p.id === Number(id));
}

function productSearchText(p) {
  return `${p.name || ''} ${p.brand || ''} ${p.cat || ''} ${p.barcode || ''}`.toLowerCase();
}

function compareByName(a, b) {
  return String(a.name || '').localeCompare(String(b.name || ''), 'es', { sensitivity: 'base' });
}

/* ---------- Selección de artículo ---------- */
function lockSalePrice() {
  const price = $('salePrice');
  if (!price) return;
  price.readOnly = true;
  price.title = 'El precio se modifica únicamente desde Artículos';
}

function renderSaleProducts() {
  const select = $('saleProduct');
  if (!select || !appData) return;
  const current = select.value;
  const sorted = appData.products.filter(hasStock).sort(compareByName);
  select.innerHTML =
    '<option value="">Seleccioná...</option>' +
    sorted
      .map(
        (p) =>
          `<option value="${p.id}">${escapeHTML(p.name)}${p.brand ? ` · ${escapeHTML(p.brand)}` : ''} · ${money(p.price)} · Stock ${p.stock}</option>`,
      )
      .join('');
  if (sorted.some((p) => String(p.id) === String(current))) select.value = current;
  updateSalePreview();
  lockSalePrice();
  if (typeof a220EnsureQuickOffers === 'function') a220EnsureQuickOffers();
}

function setSelectedProduct(id) {
  const p = findProduct(id);
  if (!p) return false;
  if (!hasStock(p)) {
    showToast('⚠️ Artículo sin stock. Cargá stock desde Artículos.', 'error');
    return false;
  }
  const select = $('saleProduct');
  if (select) select.value = String(p.id);
  const price = $('salePrice');
  if (price) price.value = p.price;
  lockSalePrice();
  updateSalePreview();
  return true;
}

function updateSalePreview() {
  const box = $('productPreview');
  if (!box) return;
  const p = findProduct($('saleProduct')?.value);
  if (!p) {
    box.innerHTML =
      '<div class="product-image"><i class="fas fa-box"></i></div><div class="product-info"><div class="product-name">Seleccioná un artículo</div><div class="muted">La compra aparecerá acá</div></div>';
    return;
  }
  lockSalePrice();
  const src = String(p.image || '').trim();
  const img = src ? `<img src="${escapeHTML(src)}" alt="">` : '<i class="fas fa-box"></i>';
  box.innerHTML = `<div class="product-image">${img}</div><div class="product-info"><div class="product-name">${escapeHTML(p.name)}</div><div class="muted">${escapeHTML(p.brand || p.cat || '')}</div><div class="product-price">${money(p.price)}</div><div class="product-stock">Stock disponible: ${p.stock}</div></div>`;
}

/* ---------- Búsqueda rápida ---------- */
function pickSearchResult(id) {
  setSelectedProduct(id);
  const input = $('buscarProducto');
  const list = $('listaProductos');
  if (input) input.value = '';
  if (list) list.style.display = 'none';
}

function renderSearchResults(found) {
  const list = $('listaProductos');
  if (!list) return;
  list.innerHTML =
    found
      .map(
        (p) =>
          `<button type="button" class="search-result" onclick="pickSearchResult(${p.id})"><span><strong>${escapeHTML(p.name)}</strong>${p.brand ? `<small>${escapeHTML(p.brand)}</small>` : ''}<small>${escapeHTML(p.cat || 'General')} · Stock ${p.stock}</small></span><span>${money(p.price)}</span></button>`,
      )
      .join('') || '<div class="empty">No hay artículos con stock.</div>';
  list.style.display = 'block';
}

function filterSaleProducts() {
  const input = $('buscarProducto');
  const list = $('listaProductos');
  if (!input || !list || !appData) return;
  const q = input.value.toLowerCase().trim();
  if (!q) {
    list.style.display = 'none';
    return;
  }
  // 0 = empieza con la búsqueda, 1 = la contiene
  const rank = (p) => (productSearchText(p).startsWith(q) ? 0 : 1);
  const found = appData.products
    .filter((p) => hasStock(p) && productSearchText(p).includes(q))
    .sort((a, b) => rank(a) - rank(b) || compareByName(a, b))
    .slice(0, 20);
  renderSearchResults(found);
}

/* ---------- Cantidad ---------- */
function setSaleQty(value) {
  currentQty = Math.max(1, Math.floor(Number(value)) || 1);
  const input = $('saleQty');
  if (input) input.value = currentQty;
  setText('qtyDisplay', currentQty); // legacy: lo usa scanner.js
}
function adjustQty(delta) {
  setSaleQty(currentQty + delta);
}
function syncSaleQty() {
  setSaleQty($('saleQty')?.value);
}

/* ---------- Carrito ---------- */
function addProductToCart(p, qty = 1) {
  if (!p) {
    showToast('⚠️ Artículo no encontrado', 'error');
    return false;
  }
  const stock = Number(p.stock);
  qty = Math.max(1, Number(qty) || 1);
  const available = Number.isFinite(stock) ? stock : 0;
  if (available < qty) {
    showToast(`⚠️ Stock insuficiente: ${p.name} (disponible: ${available})`, 'error');
    return false;
  }
  const price = Math.max(0, Number(p.price) || 0);
  const existing = cart.find((x) => x.id === p.id);
  const newQty = (existing?.qty || 0) + qty;
  if (newQty > available) {
    showToast(`⚠️ Stock insuficiente: ${p.name} (disponible: ${available}, pedido: ${newQty})`, 'error');
    return false;
  }
  if (existing) {
    existing.qty = newQty;
    existing.price = price;
    existing.total = newQty * price;
  } else {
    cart.push({ id: p.id, name: p.name, qty, price, total: qty * price });
  }
  renderCart();
  showToast('➕ Agregado', 'success');
  return true;
}

function addToCart() {
  const p = findProduct($('saleProduct')?.value);
  if (!p) {
    showToast('⚠️ Elegí un artículo', 'error');
    return false;
  }
  syncSaleQty();
  return addProductToCart(p, currentQty);
}

function cartRowHTML(item, index) {
  const p = findProduct(item.id);
  const src = String(p?.image || '').trim();
  const thumb = src
    ? `<img class="a220-pro-cart-thumb" src="${escapeHTML(src)}" alt="">`
    : '<span class="a220-pro-cart-thumb a220-pro-cart-noimg">📦</span>';
  const meta = [p?.brand || p?.cat || '', p?.barcode ? 'Código ' + p.barcode : '', p ? 'Stock ' + p.stock : ''].filter(Boolean).join(' · ');
  return `<tr>
    <td><div class="a220-pro-cart-product">${thumb}<span><strong>${escapeHTML(item.name)}</strong><small>${escapeHTML(meta)}</small></span></div></td>
    <td><div class="a220-pro-cart-qty"><button type="button" aria-label="Restar una unidad" onclick="changeCartQty(${index},-1)">−</button><strong>${item.qty}</strong><button type="button" aria-label="Sumar una unidad" onclick="changeCartQty(${index},1)">+</button></div></td>
    <td>${money(item.price)}</td>
    <td><strong>${money(item.total)}</strong></td>
    <td><button type="button" class="btn btn-xs btn-danger" aria-label="Quitar artículo" onclick="removeCart(${index})">×</button></td>
  </tr>`;
}

function renderCart() {
  const el = $('cart');
  if (!el) return;
  el.innerHTML = cart.map(cartRowHTML).join('') || '<tr><td colspan="5" class="cart-empty">🛒 Agregá artículos para comenzar</td></tr>';
  setText('cartTotal', money(saleTotal()));
  if (typeof a220RenderCartOffers === 'function') a220RenderCartOffers();
  a220UpdateCheckoutSummary();
}

function changeCartQty(index, delta) {
  const item = cart[index];
  if (!item) return false;
  const next = item.qty + delta;
  if (next < 1) {
    removeCart(index);
    return true;
  }
  const p = findProduct(item.id);
  if (!p || next > Number(p.stock)) {
    showToast('⚠️ Stock insuficiente para ' + item.name, 'error');
    return false;
  }
  item.qty = next;
  item.total = item.qty * item.price;
  renderCart();
  return true;
}

function removeCart(index) {
  cart.splice(index, 1);
  renderCart();
}

/* ---------- Cobro ---------- */
function togglePaymentFields() {
  const method = $('paymentMethod')?.value || 'cash';
  const box = $('cashPaymentFields');
  if (box) box.style.display = method === 'cash' ? 'block' : 'none';
  if (method !== 'cash') {
    const paid = $('pagoEfectivo');
    if (paid) paid.value = '';
    setText('vueltoDisplay', '$0');
  }
}

function a220UpdateCheckoutSummary() {
  const subtotal = cartSubtotal();
  const final = saleTotal();
  setText('a220CheckoutSubtotal', money(subtotal));
  setText('a220CheckoutDiscount', money(Math.max(0, subtotal - final)));
  setText('a220CheckoutTotal', money(final));
  const paid = Number($('pagoEfectivo')?.value) || 0;
  setText('vueltoDisplay', money(Math.max(0, paid - final)));
}

/* ---------- Guardar venta ---------- */
function snapshotSaleState() {
  return {
    stocks: appData.products.map((p) => ({ id: p.id, stock: p.stock })),
    sales: appData.sales.slice(),
    moves: appData.moves.slice(),
    activities: appData.activities.slice(),
    revision: appData.revision,
    updatedAt: appData.updatedAt,
  };
}

function restoreSaleState(b) {
  b.stocks.forEach(({ id, stock }) => {
    const p = findProduct(id);
    if (p) p.stock = stock;
  });
  Object.assign(appData, { sales: b.sales, moves: b.moves, activities: b.activities, revision: b.revision, updatedAt: b.updatedAt });
}

function resetSaleForm() {
  cart = [];
  setSaleQty(1);
  const name = $('clienteNombre');
  if (name) {
    name.value = '';
    name.removeAttribute('data-client-id');
  }
  const phone = $('clienteTelefono');
  if (phone) phone.value = '';
  const paid = $('pagoEfectivo');
  if (paid) paid.value = '';
  setText('vueltoDisplay', '$0');
  renderCart();
  renderSaleProducts();
  if (typeof renderClients === 'function') renderClients();
}

async function finishSale(printTicket = false) {
  if (!cart.length) {
    showToast('⚠️ El carrito está vacío', 'error');
    return false;
  }
  for (const i of cart) {
    const p = findProduct(i.id);
    if (!p || i.qty > p.stock) {
      showToast(`❌ Stock insuficiente: ${i.name}`, 'error');
      return false;
    }
  }

  const baseTotal = cartSubtotal();
  const offerSummary = typeof a220OfferSummary === 'function' ? a220OfferSummary(cart) : { combos: [], baseTotal, finalTotal: baseTotal };
  const combos = offerSummary.combos || [];
  const total = offerSummary.finalTotal;
  const now = new Date().toISOString();
  const clientInput = $('clienteNombre');
  const cliente = clientInput.value.trim() || 'Sin cliente';
  const telefono = $('clienteTelefono').value.trim();
  const clientId = Number(clientInput.dataset.clientId) || null;
  const paymentMethod = $('paymentMethod')?.value || 'cash';
  const paid = paymentMethod === 'cash' ? Number($('pagoEfectivo').value) || 0 : total;
  if (paymentMethod === 'cash' && paid < total) {
    showToast('⚠️ El efectivo recibido es menor al total', 'error');
    return false;
  }

  const backup = snapshotSaleState();
  const sale = {
    id: crypto.randomUUID(),
    date: now,
    total,
    items: structuredClone(cart),
    offers: structuredClone(combos),
    cliente,
    telefono,
    clientId,
    paid,
    change: Math.max(0, paid - total),
    paymentMethod,
  };
  cart.forEach((i) => {
    findProduct(i.id).stock -= i.qty;
    appData.moves.unshift({
      id: crypto.randomUUID(),
      date: now,
      product: i.name,
      productId: i.id,
      qty: i.qty,
      total: i.total,
      cliente,
      clientId,
      saleId: sale.id,
    });
  });
  appData.sales.unshift(sale);
  logActivity(
    'sale',
    'Venta realizada',
    `${cart.length} artículo(s)${combos.length ? ` · ${combos.length} combo(s)` : ''} · ${money(total)} · ${paymentMethod}`,
  );

  // La ventana se abre antes del await para que el navegador no la bloquee.
  const printWindow = printTicket ? window.open('', '_blank', 'width=420,height=700') : null;
  const saved = typeof saveLocalData === 'function' ? await saveLocalData(false) : false;
  if (!saved) {
    printWindow?.close();
    restoreSaleState(backup);
    renderAll();
    showToast('❌ La venta NO se guardó. No se descontó stock.', 'error');
    return false;
  }

  resetSaleForm();
  showToast(`💰 Operación guardada: ${money(total)}${combos.length ? ' · combo aplicado' : ''}`, 'success');
  if (printTicket) {
    if (printWindow && typeof a220TicketHTML === 'function') {
      printWindow.document.open();
      printWindow.document.write(a220TicketHTML(sale));
      printWindow.document.close();
      showToast('🧾 Ticket listo para imprimir', 'success');
    } else {
      showToast('Operación guardada. Permití ventanas emergentes para imprimir el ticket.', 'info');
    }
  }
  return true;
}

/* ---------- Movimientos ---------- */
function renderMoves() {
  const el = $('moves');
  if (!el) return;
  el.innerHTML =
    appData.moves
      .slice(0, 300)
      .map(
        (m) =>
          `<tr><td>${new Date(m.date).toLocaleString('es-AR')}</td><td>${escapeHTML(m.product)}</td><td>${m.qty}</td><td>${money(m.total)}</td><td>${escapeHTML(m.cliente || '—')}</td></tr>`,
      )
      .join('') || '<tr><td colspan="5">No hay movimientos</td></tr>';
}

/* ---------- Deshacer última venta ---------- */
function moveBelongsToSale(m, sale, items) {
  if (sale.id) return String(m.saleId || '') === String(sale.id);
  // Ventas antiguas sin id: se reconoce el movimiento por fecha, artículo, cantidad, total y cliente.
  if (String(m.date) !== String(sale.date)) return false;
  const item = items.find(
    (i) =>
      Number(i.id) === Number(m.productId) &&
      Number(i.qty) === Number(m.qty) &&
      Math.abs(Number(i.total || 0) - Number(m.total || 0)) < 0.01,
  );
  if (!item) return false;
  if (sale.clientId && m.clientId) return Number(sale.clientId) === Number(m.clientId);
  if (!sale.clientId) return String(sale.cliente || 'Sin cliente') === String(m.cliente || 'Sin cliente');
  return true;
}

function undoLastSale() {
  if (!Array.isArray(appData?.sales) || !appData.sales.length) {
    showToast('ℹ️ No hay ventas para deshacer', 'info');
    return false;
  }
  const sale = appData.sales[0];
  const items = Array.isArray(sale.items) ? sale.items : [];
  if (!items.length) {
    showToast('⚠️ La última venta no tiene artículos guardados', 'error');
    return false;
  }
  const when = new Date(sale.date).toLocaleString('es-AR');
  const detail = items.map((i) => `${i.name} ×${i.qty}`).join(', ');
  if (
    !confirm(
      `¿Deshacer la última venta?\n\n${when}\n${detail}\n\nSe devolverán los artículos al stock y se quitará la venta de las estadísticas.`,
    )
  )
    return false;

  items.forEach((i) => {
    const p = findProduct(i.id);
    if (p) p.stock = Math.max(0, Number(p.stock || 0) + Number(i.qty || 0));
  });
  appData.moves = appData.moves.filter((m) => !moveBelongsToSale(m, sale, items));
  appData.sales.shift();
  logActivity('undo', 'Venta deshecha', `${items.length} artículo(s) · ${money(Number(sale.total || 0))}`);
  saveLocalData();
  renderAll();
  showToast(`↩️ Venta deshecha · stock devuelto · ${money(Number(sale.total || 0))}`, 'success');
  return true;
}

function ensureA220UndoButton() {
  const actions = document.querySelector('#ventas .a220-sale-actions');
  if (!actions || $('a220UndoSaleButton')) return;
  const b = document.createElement('button');
  b.id = 'a220UndoSaleButton';
  b.className = 'btn btn-outline btn-block';
  b.type = 'button';
  b.textContent = '↩ Deshacer última venta';
  b.onclick = undoLastSale;
  actions.appendChild(b);
}

/* ---------- Módulos opcionales ---------- */
function ensureScriptOnce(marker, srcMatch, src) {
  if (document.querySelector(`script[${marker}]`) || document.querySelector(`script[src*="${srcMatch}"]`)) return;
  const s = document.createElement('script');
  s.src = src;
  s.setAttribute(marker, '1');
  document.body.appendChild(s);
}

document.addEventListener('DOMContentLoaded', () => {
  ensureScriptOnce('data-a220-offers', 'js/offers.js', 'js/offers.js?v=20260907');
  ensureScriptOnce('data-a220-quick-offers', 'js/quick-offers.js', 'js/quick-offers.js?v=20260907');
  ensureA220UndoButton();
  lockSalePrice();
  const qty = $('saleQty');
  qty?.addEventListener('input', syncSaleQty);
  qty?.addEventListener('change', syncSaleQty);
  $('pagoEfectivo')?.addEventListener('input', a220UpdateCheckoutSummary);
  a220UpdateCheckoutSummary();
});
