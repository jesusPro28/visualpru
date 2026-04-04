/**
 * Configuración central de la API - UTHH Sistema de Asistencia
 * Cambia API_BASE_URL según el entorno:
 *   - Desarrollo local: 'http://localhost:3000/api'
 *   - Producción Vercel: 'https://tu-backend.vercel.app/api'
 */
const API_BASE_URL = window.UTHH_API_URL || 'https://apiver-kappa.vercel.app/api';/* ─── helpers de autenticación ─── */
function getToken() {
  return localStorage.getItem('uthh_token');
}
function setToken(token) {
  localStorage.setItem('uthh_token', token);
}
function removeToken() {
  localStorage.removeItem('uthh_token');
  localStorage.removeItem('uthh_usuario');
}
function getUsuario() {
  try { return JSON.parse(localStorage.getItem('uthh_usuario')); } catch { return null; }
}
function setUsuario(u) {
  localStorage.setItem('uthh_usuario', JSON.stringify(u));
}
function isLoggedIn() {
  return !!getToken();
}

/* ─── headers comunes ─── */
function authHeaders(extra = {}) {
  const h = { 'Content-Type': 'application/json', ...extra };
  const t = getToken();
  if (t) h['Authorization'] = 'Bearer ' + t;
  return h;
}

/* ─── fetch genérico con manejo de errores mejorado ─── */
async function apiFetch(endpoint, options = {}) {
  const url = API_BASE_URL + endpoint;
  const defaults = { headers: authHeaders() };
  const config = { ...defaults, ...options, headers: { ...defaults.headers, ...(options.headers || {}) } };
  // Si es FormData, dejar que el navegador ponga el Content-Type
  if (options.body instanceof FormData) {
    delete config.headers['Content-Type'];
  }
  try {
    const res = await fetch(url, config);
    // Token expirado o inválido
    if (res.status === 401 || res.status === 403) {
      if (window.location.pathname.includes('Pri')) {
        removeToken();
        mostrarAlerta('Tu sesión ha expirado. Inicia sesión de nuevo.', 'warning');
        setTimeout(() => { window.location.href = 'loguinPu.html'; }, 2000);
        return;
      }
    }
    return res;
  } catch (error) {
    console.error('Error de red:', error);
    mostrarAlerta('Error de conexión con el servidor. Verifica tu conexión a internet.', 'error');
    throw error;
  }
}

/* ─── logout ─── */
function logout() {
  removeToken();
  window.location.href = 'loguinPu.html';
}

/* ─── proteger páginas privadas ─── */
function protegerPagina() {
  if (!isLoggedIn()) {
    window.location.href = 'loguinPu.html';
  }
}

/* ─── year footer ─── */
function setFooterYear() {
  const el = document.getElementById('year');
  if (el) el.textContent = new Date().getFullYear();
}

/* ─── Validación de CURP (patrón oficial mexicano) ─── */
function validarCURP(curp) {
  if (!curp || typeof curp !== 'string') return { valido: false, error: 'El CURP es obligatorio.' };
  const c = curp.trim().toUpperCase();
  if (c.length !== 18) return { valido: false, error: 'El CURP debe tener exactamente 18 caracteres.' };
  const regex = /^[A-Z]{4}[0-9]{6}[HM][A-Z]{5}[0-9A-Z][0-9]$/;
  if (!regex.test(c)) return { valido: false, error: 'El formato del CURP no es válido. Verifica el patrón oficial mexicano.' };
  return { valido: true, curp: c };
}

/* ─── Sistema de alertas mejorado ─── */
function mostrarAlerta(mensaje, tipo = 'info', duracion = 4000) {
  // Eliminar alertas previas
  const prev = document.querySelectorAll('.uthh-alerta');
  prev.forEach(p => p.remove());

  const colores = {
    success: { bg: '#d4edda', border: '#28a745', color: '#155724', icon: '✅' },
    error: { bg: '#f8d7da', border: '#dc3545', color: '#721c24', icon: '❌' },
    warning: { bg: '#fff3cd', border: '#ffc107', color: '#856404', icon: '⚠️' },
    info: { bg: '#d1ecf1', border: '#17a2b8', color: '#0c5460', icon: 'ℹ️' }
  };
  const c = colores[tipo] || colores.info;

  const div = document.createElement('div');
  div.className = 'uthh-alerta';
  div.style.cssText = `
    position: fixed; top: 20px; right: 20px; z-index: 99999;
    background: ${c.bg}; border-left: 5px solid ${c.border}; color: ${c.color};
    padding: 15px 20px; border-radius: 6px; max-width: 400px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.15); font-size: 14px;
    animation: slideInRight 0.3s ease; cursor: pointer;
  `;
  div.innerHTML = `<span style="margin-right:8px">${c.icon}</span>${mensaje}`;
  div.onclick = () => div.remove();
  document.body.appendChild(div);

  if (duracion > 0) {
    setTimeout(() => { if (div.parentNode) div.remove(); }, duracion);
  }
}

/* ─── Diálogo de confirmación ─── */
function confirmarAccion(mensaje, titulo = 'Confirmar') {
  return new Promise((resolve) => {
    const overlay = document.createElement('div');
    overlay.style.cssText = `
      position:fixed;top:0;left:0;width:100%;height:100%;
      background:rgba(0,0,0,0.5);z-index:99998;display:flex;
      align-items:center;justify-content:center;
    `;
    const dialog = document.createElement('div');
    dialog.style.cssText = `
      background:#fff;border-radius:10px;padding:30px;max-width:400px;
      width:90%;text-align:center;box-shadow:0 10px 30px rgba(0,0,0,0.3);
    `;
    dialog.innerHTML = `
      <h3 style="margin:0 0 15px;color:#6b1a2a;font-size:18px;">${titulo}</h3>
      <p style="margin:0 0 20px;color:#555;font-size:14px;">${mensaje}</p>
      <div style="display:flex;gap:10px;justify-content:center;">
        <button id="btn-confirmar-si" style="background:#6b1a2a;color:#fff;border:none;padding:10px 25px;border-radius:6px;cursor:pointer;font-size:14px;">Sí, continuar</button>
        <button id="btn-confirmar-no" style="background:#6c757d;color:#fff;border:none;padding:10px 25px;border-radius:6px;cursor:pointer;font-size:14px;">Cancelar</button>
      </div>
    `;
    overlay.appendChild(dialog);
    document.body.appendChild(overlay);

    dialog.querySelector('#btn-confirmar-si').onclick = () => { overlay.remove(); resolve(true); };
    dialog.querySelector('#btn-confirmar-no').onclick = () => { overlay.remove(); resolve(false); };
    overlay.onclick = (e) => { if (e.target === overlay) { overlay.remove(); resolve(false); } };
  });
}

/* ─── Animación CSS ─── */
(function() {
  const style = document.createElement('style');
  style.textContent = `
    @keyframes slideInRight {
      from { transform: translateX(100%); opacity: 0; }
      to { transform: translateX(0); opacity: 1; }
    }
  `;
  document.head.appendChild(style);
})();
