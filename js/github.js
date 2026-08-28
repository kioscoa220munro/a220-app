// A220 Pro - sincronización privada simple mediante a220-api.
// El token real de GitHub NUNCA llega al navegador.
const A220_API_URL = 'https://a220-api.kiosco-a220.workers.dev';
const A220_SYNC_SESSION_KEY = 'a220_sync_api_key';
let apiKey = '';

function loadGitHubConfig() {
  for (const id of ['githubUser','githubRepo','githubBranch','githubFile']) {
    const el = document.getElementById(id);
    if (el) el.style.display = 'none';
  }

  let input = document.getElementById('apiKey');
  if (!input) input = document.getElementById('githubToken');

  if (!input) {
    const panel = document.querySelector('#sync .panel:last-child');
    if (panel) {
      input = document.createElement('input');
      input.id = 'apiKey';
      input.type = 'password';
      input.autocomplete = 'off';
      input.placeholder = 'Clave de sincronización';
      panel.insertBefore(input, panel.querySelector('button'));
    }
  }

  if (input) {
    input.id = 'apiKey';
    input.placeholder = 'Clave de sincronización';
    input.type = 'password';
    input.autocomplete = 'off';
    input.style.display = '';
  }

  // Recuperar sólo durante esta sesión del navegador. Nunca localStorage.
  try { apiKey = sessionStorage.getItem(A220_SYNC_SESSION_KEY) || ''; } catch (_) { apiKey = ''; }

  const saveButton = document.querySelector('#sync button[onclick="saveGitHubConfig()"]');
  if (saveButton) saveButton.textContent = apiKey ? 'Clave cargada ✓' : 'Cargar clave';
}

async function saveGitHubConfig() {
  const input = document.getElementById('apiKey');
  const value = input?.value.trim() || '';

  if (!value) {
    if (apiKey) {
      showToast('✅ La clave ya está cargada en esta sesión', 'success');
    } else {
      showToast('⚠️ Ingresá la clave de sincronización', 'error');
    }
    return;
  }

  apiKey = value;
  try { sessionStorage.setItem(A220_SYNC_SESSION_KEY, apiKey); } catch (_) {}
  if (input) input.value = '';

  try {
    const response = await fetch(`${A220_API_URL}/health`, { cache: 'no-store' });
    if (!response.ok) throw new Error(`API ${response.status}`);
    showToast('☁️ Conexión lista. Ya podés sincronizar', 'success');
  } catch (_) {
    showToast('⚠️ Clave cargada, pero no pude comprobar Cloudflare', 'info');
  }
}

function apiHeaders() {
  if (!apiKey) throw new Error('Cargá la clave de sincronización una sola vez');
  return {
    Authorization: `Bearer ${apiKey}`,
    'Content-Type': 'application/json',
  };
}

async function apiRequest(path, options = {}) {
  const response = await fetch(`${A220_API_URL}${path}`, {
    ...options,
    headers: {
      ...apiHeaders(),
      ...(options.headers || {}),
    },
    cache: 'no-store',
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.message || data.error || `API ${response.status}`);
  }
  return data;
}

async function syncToGitHub() {
  if (!isLoggedIn) return;

  try {
    showToast('📤 Cifrando y subiendo...', 'info');
    const env = await createEnvelope(appData, a220Password);
    const current = await apiRequest('/data', { method: 'GET' });

    if (current.exists && current.content) {
      try {
        const remoteEnv = JSON.parse(current.content);
        const remote = await decryptEnvelope(remoteEnv, a220Password);
        if (Number(remote.data?.revision || 0) > Number(appData.revision || 0)) {
          const ok = confirm('Hay una versión más nueva en la nube. ¿Querés reemplazarla con esta copia?');
          if (!ok) return;
        }
      } catch (_) {
        throw new Error('Los datos remotos no se pueden validar con esta contraseña');
      }
    }

    const result = await apiRequest('/data', {
      method: 'PUT',
      body: JSON.stringify({
        content: JSON.stringify(env, null, 2),
        sha: current.sha || null,
      }),
    });

    if (!result.ok) throw new Error(result.message || 'No se pudo guardar');
    showToast('✅ Sincronizado correctamente', 'success');
  } catch (e) {
    showToast('❌ ' + e.message, 'error');
  }
}

async function syncFromGitHub() {
  if (!isLoggedIn) return;

  try {
    showToast('📥 Descargando...', 'info');
    const remote = await apiRequest('/data', { method: 'GET' });

    if (!remote.exists || !remote.content) {
      showToast('⚠️ Todavía no existe una copia remota', 'error');
      return;
    }

    const env = JSON.parse(remote.content);
    const decrypted = await decryptEnvelope(env, a220Password);
    const products = decrypted.data?.products?.length || 0;
    const sales = decrypted.data?.sales?.length || 0;

    if (!confirm(`Restaurar la copia remota (rev ${decrypted.data.revision || 0}, ${products} artículos, ${sales} ventas) y reemplazar la local?`)) return;

    localStorage.setItem(
      APP_CONFIG.storageKey + '_before_sync',
      localStorage.getItem(APP_CONFIG.storageKey)
    );

    appData = decrypted.data;
    await persistEncrypted(false);
    renderAll();
    showToast('✅ Datos restaurados desde la nube', 'success');
  } catch (e) {
    showToast('❌ ' + e.message, 'error');
  }
}

function clearSyncKey() {
  apiKey = '';
  try { sessionStorage.removeItem(A220_SYNC_SESSION_KEY); } catch (_) {}
  const input = document.getElementById('apiKey');
  if (input) input.value = '';
  showToast('🔒 Clave eliminada de esta sesión', 'info');
}
