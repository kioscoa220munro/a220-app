// Sincronización A220 mediante API privada. Nunca contiene el token de GitHub.
const A220_API_URL = 'https://a220-api.kiosco-a220.workers.dev';
let apiKey = '';

function loadGitHubConfig() {
  // Compatibilidad con el HTML anterior: ocultamos toda configuración directa de GitHub.
  for (const id of ['githubUser','githubRepo','githubBranch','githubFile','githubToken']) {
    const el = document.getElementById(id);
    if (el) {
      el.closest('div')?.classList.add('legacy-github-config');
      el.style.display = 'none';
    }
  }

  const oldToken = document.getElementById('githubToken');
  const input = document.getElementById('apiKey') || oldToken;
  if (input) {
    input.id = 'apiKey';
    input.placeholder = 'Clave de sincronización';
    input.type = 'password';
    input.autocomplete = 'off';
    input.style.display = '';
  }
}

function saveGitHubConfig() {
  const input = document.getElementById('apiKey');
  apiKey = input?.value.trim() || '';

  if (!apiKey) {
    showToast('⚠️ Ingresá la clave de sincronización','error');
    return;
  }

  input.value = '';
  showToast('✅ Clave de sincronización cargada sólo en esta sesión','success');
}

function apiHeaders() {
  if (!apiKey) throw new Error('Ingresá la clave de sincronización en esta sesión');
  return {
    'Authorization': `Bearer ${apiKey}`,
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

        if (
          Number(remote.data?.revision || 0) > Number(appData.revision || 0) &&
          !confirm('GitHub tiene una versión más nueva. ¿Sobrescribirla?')
        ) return;
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

    if (result.ok) showToast('✅ Datos cifrados sincronizados', 'success');
  } catch (e) {
    showToast('❌ ' + e.message, 'error');
  }
}

async function syncFromGitHub() {
  try {
    showToast('📥 Descargando...', 'info');

    const remote = await apiRequest('/data', { method: 'GET' });

    if (!remote.exists || !remote.content) {
      showToast('⚠️ Todavía no existe una copia remota', 'error');
      return;
    }

    const env = JSON.parse(remote.content);
    const decrypted = await decryptEnvelope(env, a220Password);

    if (!confirm(`Restaurar GitHub rev ${decrypted.data.revision} y reemplazar local?`)) return;

    localStorage.setItem(
      APP_CONFIG.storageKey + '_before_sync',
      localStorage.getItem(APP_CONFIG.storageKey)
    );

    appData = decrypted.data;
    await persistEncrypted(false);
    renderAll();

    showToast('✅ Datos restaurados', 'success');
  } catch (e) {
    showToast('❌ ' + e.message, 'error');
  }
}

function clearSyncKey() {
  apiKey = '';
  const input = document.getElementById('apiKey');
  if (input) input.value = '';
  showToast('🔒 Clave de sincronización eliminada de la sesión', 'info');
}
