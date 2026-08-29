// A220 Pro - interfaz, dashboard y arranque
let dashboardRange = 'today';

function showView(id, btn) {
  var target = document.getElementById(id);
  if (!target) return;

  document.querySelectorAll('.view').forEach(function (view) {
    view.classList.remove('active');
  });
  target.classList.add('active');

  document.querySelectorAll('nav button').forEach(function (button) {
    button.classList.remove('active');
  });
  if (btn) btn.classList.add('active');

  // La navegación es independiente de los módulos de datos.
  // Un error de un módulo nunca debe impedir cambiar de pantalla.
  setTimeout(function () {
    try { if (typeof renderDashboard === 'function') renderDashboard(); } catch (e) { console.error('A220 dashboard:', e); }
    try { if (typeof renderProducts === 'function') renderProducts(); } catch (e) { console.error('A220 products:', e); }
    try { if (typeof renderSaleProducts === 'function') renderSaleProducts(); } catch (e) { console.error('A220 sales:', e); }
    try { if (typeof renderMoves === 'function') renderMoves(); } catch (e) { console.error('A220 movements:', e); }
    try { if (typeof renderCart === 'function') renderCart(); } catch (e) { console.error('A220 cart:', e); }
  }, 0);
}

function salesInRange(range) {
  var now = new Date();
  var start = new Date(now);
  var end = new Date(now);

  if (range === 'today') {
    start.setHours(0, 0, 0, 0);
  } else if (range === '7d') {
    start.setDate(start.getDate() - 6);
    start.setHours(0, 0, 0, 0);
  } else if (range === '30d') {
    start.setDate(start.getDate() - 29);
    start.setHours(0, 0, 0, 0);
  } else if (range === 'month') {
    start.setDate(1);
    start.setHours(0, 0, 0, 0);
  }

  end.setHours(23, 59, 59, 999);
  if (!appData || !Array.isArray(appData.sales)) return [];

  return appData.sales.filter(function (sale) {
    var date = new Date(sale.date);
    return date >= start && date <= end;
  });
}

function renderBarList(id, items, empty) {
  var el = document.getElementById(id);
  if (!el) return;
  if (!items.length) {
    el.innerHTML = '<div class="muted">' + (empty || 'Sin datos') + '</div>';
    return;
  }

  var max = Math.max.apply(null, items.map(function (item) { return item.value; }).concat([1]));
  el.innerHTML = items.map(function (item) {
    var width = Math.max(4, (item.value / max) * 100);
    return '<div class="bar-row"><div class="bar-label"><span>' +
      escapeHTML(item.label) + '</span><strong>' + money(item.value) +
      '</strong></div><div class="bar-track"><i style="width:' + width + '%"></i></div></div>';
  }).join('');
}

function renderDashboard() {
  if (!appData) return;

  var sales = salesInRange(dashboardRange);
  var total = sales.reduce(function (sum, sale) { return sum + Number(sale.total || 0); }, 0);
  var units = sales.reduce(function (sum, sale) {
    return sum + (Array.isArray(sale.items) ? sale.items.reduce(function (n, item) {
      return n + Number(item.qty || 0);
    }, 0) : 0);
  }, 0);
  var average = sales.length ? total / sales.length : 0;
  var profit = sales.reduce(function (sum, sale) {
    return sum + (Array.isArray(sale.items) ? sale.items.reduce(function (n, item) {
      var product = typeof findProduct === 'function' ? findProduct(item.id) : null;
      var cost = product ? Number(product.cost || 0) : 0;
      return n + ((Number(item.price || 0) - cost) * Number(item.qty || 0));
    }, 0) : 0);
  }, 0);

  var values = {
    dVentas: money(total),
    dProductos: String(Array.isArray(appData.products) ? appData.products.length : 0),
    dBajo: String(Array.isArray(appData.products) ? appData.products.filter(function (p) {
      return Number(p.stock || 0) <= Number(p.minStock || 0);
    }).length : 0),
    dUnidades: String(units),
    dTickets: String(sales.length),
    dTicketProm: money(average),
    dGanancia: money(profit),
    dashRangeLabel: ({ today: 'Hoy', '7d': 'Últimos 7 días', '30d': 'Últimos 30 días', month: 'Este mes' })[dashboardRange] || 'Período'
  };

  Object.keys(values).forEach(function (id) {
    var el = document.getElementById(id);
    if (el) el.textContent = values[id];
  });

  var hourly = Array.from({ length: 24 }, function (_, h) {
    return { label: String(h).padStart(2, '0') + 'h', value: 0 };
  });
  sales.forEach(function (sale) {
    var hour = new Date(sale.date).getHours();
    if (hourly[hour]) hourly[hour].value += Number(sale.total || 0);
  });
  renderBarList('hourBars', hourly.filter(function (x) { return x.value > 0; }), 'No hay ventas en este período');

  var days = {};
  sales.forEach(function (sale) {
    var date = new Date(sale.date);
    var key = date.getFullYear() + '-' + String(date.getMonth() + 1).padStart(2, '0') + '-' + String(date.getDate()).padStart(2, '0');
    days[key] = (days[key] || 0) + Number(sale.total || 0);
  });
  renderBarList('dayBars', Object.keys(days).sort().map(function (key) {
    var date = new Date(key + 'T12:00:00');
    return { label: date.toLocaleDateString('es-AR', { weekday: 'short', day: '2-digit', month: '2-digit' }), value: days[key] };
  }), 'No hay ventas en este período');

  var top = {};
  sales.forEach(function (sale) {
    (sale.items || []).forEach(function (item) {
      var name = item.name || 'Producto';
      top[name] = (top[name] || 0) + Number(item.total || 0);
    });
  });
  renderBarList('topBars', Object.keys(top).sort(function (a, b) { return top[b] - top[a]; }).slice(0, 8).map(function (name) {
    return { label: name, value: top[name] };
  }), 'No hay productos vendidos');

  var low = (appData.products || []).filter(function (p) {
    return Number(p.stock || 0) <= Number(p.minStock || 0);
  });
  var alerts = document.getElementById('alertas');
  if (alerts) {
    alerts.innerHTML = low.length ? low.map(function (p) {
      return '<div class="alert-row">⚠️ <strong>' + escapeHTML(p.name) + '</strong><span>' + Number(p.stock || 0) + ' en stock</span></div>';
    }).join('') : '<div class="muted">Sin alertas.</div>';
  }
}

function setDashboardRange(range) {
  dashboardRange = range;
  document.querySelectorAll('.range-btn').forEach(function (button) {
    button.classList.toggle('active', button.dataset.range === range);
  });
  try { renderDashboard(); } catch (e) { console.error('A220 dashboard:', e); }
}

function renderAll() {
  if (!isLoggedIn || !appData) return;
  try { if (typeof renderDashboard === 'function') renderDashboard(); } catch (e) { console.error('A220 dashboard:', e); }
  try { if (typeof renderProducts === 'function') renderProducts(); } catch (e) { console.error('A220 products:', e); }
  try { if (typeof renderSaleProducts === 'function') renderSaleProducts(); } catch (e) { console.error('A220 sales:', e); }
  try { if (typeof renderMoves === 'function') renderMoves(); } catch (e) { console.error('A220 movements:', e); }
  try { if (typeof renderCart === 'function') renderCart(); } catch (e) { console.error('A220 cart:', e); }
}

function toggleTheme() {
  var dark = document.documentElement.dataset.theme !== 'dark';
  document.documentElement.dataset.theme = dark ? 'dark' : 'light';
  localStorage.setItem(APP_CONFIG.themeKey, dark ? 'dark' : 'light');
}

function boot() {
  var theme = localStorage.getItem(APP_CONFIG.themeKey) || 'light';
  document.documentElement.dataset.theme = theme;

  if (typeof loadGitHubConfig === 'function') loadGitHubConfig();

  var login = document.getElementById('loginPass');
  if (login) login.addEventListener('keydown', function (event) {
    if (event.key === 'Enter' && typeof doLogin === 'function') doLogin();
  });

  var search = document.getElementById('buscarProducto');
  if (search && typeof filterSaleProducts === 'function') search.addEventListener('input', filterSaleProducts);

  var sale = document.getElementById('saleProduct');
  if (sale && typeof updateSalePreview === 'function') sale.addEventListener('change', updateSalePreview);

  var price = document.getElementById('salePrice');
  if (price && typeof updateSalePreview === 'function') price.addEventListener('input', updateSalePreview);

  var productFilter = document.getElementById('productFilter');
  if (productFilter && typeof renderProducts === 'function') productFilter.addEventListener('input', renderProducts);

  document.querySelectorAll('.range-btn').forEach(function (button) {
    button.addEventListener('click', function () { setDashboardRange(button.dataset.range); });
  });

  if (typeof bootAuth === 'function') bootAuth();
}

document.addEventListener('DOMContentLoaded', boot);
