/* A220 Wi-Fi Transferencias · puente local Windows */
(() => {
  'use strict';
  const API = 'http://127.0.0.1:8765';
  const TOKEN_KEY = 'a220_wifi_bridge_token';
  const $ = id => document.getElementById(id);
  let pollHandle = null;
  let busy = false;

  function token() {
    return ($('a220WifiToken')?.value || localStorage.getItem(TOKEN_KEY) || '').trim();
  }
  function setMessage(message, kind = 'info') {
    const el = $('a220WifiMessage');
    if (!el) return;
    el.textContent = message;
    el.dataset.kind = kind;
  }
  function render(data) {
    const status = $('a220WifiStatus');
    const detail = $('a220WifiDetail');
    const clients = $('a220WifiClients');
    const countdown = $('a220WifiCountdown');
    const ssid = $('a220WifiSsid');
    const password = $('a220WifiPassword');
    const toggle = $('a220WifiToggle');
    const dot = $('a220WifiDot');
    if (!status || !data) return;
    const active = !!data.enabled;
    status.textContent = active ? 'Hotspot encendido' : 'Hotspot apagado';
    detail.textContent = data.supported === false
      ? 'Este adaptador no informa compatibilidad con Red hospedada de Windows.'
      : (data.internetSharing ? 'Internet compartido desde tu Wi-Fi principal.' : (active ? 'Red activa; verificá que tenga salida a Internet.' : 'Listo para activar desde A220.'));
    clients.textContent = String(Number(data.clients) || 0);
    if (ssid) ssid.textContent = data.ssid || '—';
    if (password) password.textContent = data.password || 'Disponible al activar';
    countdown.textContent = active && !Number(data.clients)
      ? (Number(data.secondsRemaining) > 0 ? 'Se apaga en ' + Math.ceil(data.secondsRemaining) + ' s' : 'Apagado automático pendiente')
      : (active ? 'Con clientes conectados' : 'Temporizador detenido');
    toggle.textContent = active ? 'Apagar Wi-Fi' : 'Activar Wi-Fi';
    toggle.classList.toggle('is-on', active);
    toggle.disabled = busy || data.supported === false;
    dot.classList.toggle('is-active', active);
    if (data.error) setMessage(data.error, 'error');
    else if (data.supported === false) setMessage('El adaptador Wi-Fi no admite la función de red hospedada. No se activó nada.', 'error');
  }
  async function request(path, method = 'GET') {
    const secret = token();
    if (!secret) throw new Error('Pegá el código de conexión del controlador local.');
    const response = await fetch(API + path, {
      method,
      mode: 'cors',
      cache: 'no-store',
      headers: { 'Authorization': 'Bearer ' + secret, ...(method === 'POST' ? {'Content-Type':'application/json'} : {}) },
      body: method === 'POST' ? '{}' : undefined
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok || data.ok === false) throw new Error(data.error || 'No se pudo completar la operación.');
    return data;
  }
  async function refresh() {
    if (!token() || busy) return;
    try { render(await request('/status')); }
    catch (error) {
      const status = $('a220WifiStatus');
      if (status) status.textContent = 'Controlador desconectado';
      setMessage(error.message.includes('Failed to fetch')
        ? 'No se encuentra el controlador de esta PC. Abrí el servicio A220 Wi-Fi en Windows.'
        : error.message, 'error');
    }
  }
  async function toggle() {
    if (busy) return;
    busy = true;
    const button = $('a220WifiToggle');
    if (button) button.disabled = true;
    try {
      const active = button?.classList.contains('is-on');
      const data = await request(active ? '/stop' : '/start', 'POST');
      render(data);
      setMessage(active ? 'Hotspot apagado.' : 'Hotspot activado. Ya podés compartir la clave con el cliente.', 'success');
    } catch (error) { setMessage(error.message, 'error'); }
    finally { busy = false; if (button) button.disabled = false; refresh(); }
  }
  function connect() {
    const value = ($('a220WifiToken')?.value || '').trim();
    if (!value) return setMessage('Ingresá el código que muestra el controlador local.', 'error');
    localStorage.setItem(TOKEN_KEY, value);
    setMessage('Código guardado en este navegador. Comprobando conexión…', 'info');
    refresh();
  }
  function init() {
    const input = $('a220WifiToken');
    const saved = localStorage.getItem(TOKEN_KEY);
    if (input && saved) input.value = saved;
    $('a220WifiConnect')?.addEventListener('click', connect);
    $('a220WifiToggle')?.addEventListener('click', toggle);
    $('a220WifiForget')?.addEventListener('click', () => {
      localStorage.removeItem(TOKEN_KEY);
      if (input) input.value = '';
      if ($('a220WifiStatus')) $('a220WifiStatus').textContent = 'Sin vincular';
      setMessage('Código local quitado de este navegador.', 'info');
    });
    refresh();
    if (pollHandle) clearInterval(pollHandle);
    pollHandle = setInterval(refresh, 5000);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
  window.a220WifiRefresh = refresh;
})();