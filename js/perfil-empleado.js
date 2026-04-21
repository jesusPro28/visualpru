/**
 * perfil-empleado.js — Lógica del perfil del empleado
 * Cambios: sin foto de perfil, funciones completas
 */
document.addEventListener('DOMContentLoaded', () => {
  protegerPagina();
  setFooterYear();

  const btnLogout = document.getElementById('btn-logout');
  if (btnLogout) {
    btnLogout.addEventListener('click', (e) => { e.preventDefault(); logout(); });
  }

  cargarPerfil();
  cargarAsistencias();
  cargarIncidencias();
  cargarNotificaciones();
  cargarMisJustificaciones();

  const formPw = document.getElementById('form-password');
  if (formPw) formPw.addEventListener('submit', cambiarPassword);

  const formJust = document.getElementById('form-justificacion');
  if (formJust) formJust.addEventListener('submit', enviarJustificacion);
});

/* ─── Navegación entre secciones ─── */
function mostrarSeccion(nombre) {
  document.querySelectorAll('.perfil-seccion').forEach(s => s.classList.remove('activa'));
  const sec = document.getElementById('seccion-' + nombre);
  if (sec) sec.classList.add('activa');
  document.querySelectorAll('.navbar a').forEach(a => a.classList.remove('nav-activo'));
  const link = document.querySelector(`.navbar a[onclick*="${nombre}"]`);
  if (link) link.classList.add('nav-activo');
}

/* ─── Cargar perfil principal ─── */
async function cargarPerfil() {
  try {
    const res = await apiFetch('/perfil');
    if (!res || !res.ok) return;
    const data = await res.json();
    const emp = data.empleado;

    document.getElementById('info-numTrabajador').textContent = emp['NUM-TRABAJADOR'] || '—';
    document.getElementById('info-curp').textContent        = emp.CURP              || '—';
    document.getElementById('info-nombre').textContent      = emp.NOMBRE            || '—';
    document.getElementById('info-aPaterno').textContent    = emp['A-PATERNO']      || '—';
    document.getElementById('info-aMaterno').textContent    = emp['A-MATERNO']      || '—';
    document.getElementById('info-puesto').textContent      = emp.PUESTO            || '—';
    document.getElementById('info-departamento').textContent = emp.DEPARTAMENTO     || '—';

    // ── Alerta de retardos del mes ──
    const retardos = data.retardosMes || 0;
    const alertaEl = document.getElementById('alerta-retardos');
    if (alertaEl) {
      if (retardos >= 2) {
        alertaEl.style.display = 'block';
        alertaEl.innerHTML = `⚠️ Tienes <strong>${retardos} retardos</strong> este mes. 
          ${retardos >= 3 ? '¡El 3er retardo cuenta como FALTA!' : 'El próximo retardo contará como FALTA.'}`;
      } else {
        alertaEl.style.display = 'none';
      }
    }

    // ── Badge de notificaciones ──
    const notifCount = data.notificacionesNoLeidas || 0;
    const badge = document.getElementById('notif-badge');
    if (badge) {
      if (notifCount > 0) {
        badge.textContent = notifCount;
        badge.style.display = 'inline-block';
      } else {
        badge.style.display = 'none';
      }
    }

    renderHorario(data.horario);
    renderEstados(data.estados);

  } catch (err) {
    console.error('Error cargando perfil:', err);
  }
}

/* ─── Renderizar horario semanal ─── */
function renderHorario(horario) {
  const tbody = document.getElementById('tbody-horario');
  const turnoEl = document.getElementById('horario-turno');
  const noData = document.getElementById('horario-no-data');

  if (!horario) {
    if (tbody) tbody.innerHTML = '';
    if (noData) noData.style.display = 'block';
    if (turnoEl) turnoEl.innerHTML = '<strong>Turno:</strong> —';
    return;
  }

  if (noData) noData.style.display = 'none';
  if (turnoEl) turnoEl.innerHTML = `<strong>Turno:</strong> ${horario.TURNO || '—'}`;

  const dias = [
    { label: 'Lunes',      am: 'LUNES-am',      pm: 'LUNES-pm'      },
    { label: 'Martes',     am: 'MARTES-am',      pm: 'MARTES-pm'     },
    { label: 'Miércoles',  am: 'MIÉRCOLES-am',   pm: 'MIÉRCOLES-pm'  },
    { label: 'Jueves',     am: 'JUEVES-am',      pm: 'JUEVES-pm'     },
    { label: 'Viernes',    am: 'VIERNES-am',     pm: 'VIERNES-pm'    },
  ];

  if (tbody) {
    tbody.innerHTML = dias.map(d => `
      <tr>
        <td>${d.label}</td>
        <td>${horario[d.am] || '—'}</td>
        <td>${horario[d.pm] || '—'}</td>
      </tr>
    `).join('');
  }
}

/* ─── Utilidad: formatear fecha ISO → DD/MM/YYYY ─── */
function formatearFecha(fechaStr) {
  if (!fechaStr) return '—';
  const d = new Date(fechaStr);
  if (isNaN(d)) return fechaStr;
  const dia  = String(d.getUTCDate()).padStart(2, '0');
  const mes  = String(d.getUTCMonth() + 1).padStart(2, '0');
  const anio = d.getUTCFullYear();
  return `${dia}/${mes}/${anio}`;
}

/* ─── Renderizar estados de puntualidad con paginación ─── */
let _estadosPaginaActual = 1;
const _estadosPorPagina  = 5;
let   _estadosDatos      = [];

function renderEstados(estados) {
  _estadosDatos       = estados || [];
  _estadosPaginaActual = 1;
  _dibujarPaginaEstados();
}

function _dibujarPaginaEstados() {
  const tbody    = document.getElementById('tbody-estados');
  const paginador = document.getElementById('paginador-estados');
  if (!tbody) return;

  if (_estadosDatos.length === 0) {
    tbody.innerHTML = '<tr><td colspan="2" style="text-align:center;">Sin registros.</td></tr>';
    if (paginador) paginador.innerHTML = '';
    return;
  }

  const totalPaginas = Math.ceil(_estadosDatos.length / _estadosPorPagina);
  const inicio       = (_estadosPaginaActual - 1) * _estadosPorPagina;
  const fin          = inicio + _estadosPorPagina;
  const pagina       = _estadosDatos.slice(inicio, fin);

  // ── Filas ──
  tbody.innerHTML = pagina.map(e => {
    const color = e.ESTATUS === 'PUNTUAL'
      ? '#28a745'
      : e.ESTATUS === 'RETARDO'
        ? '#ffc107'
        : e.ESTATUS === 'JUSTIFICADO'
          ? '#17a2b8'
          : '#dc3545';
    return `
      <tr>
        <td>${formatearFecha(e.FECHA)}</td>
        <td><span style="color:${color};font-weight:bold;">${e.ESTATUS || '—'}</span></td>
      </tr>
    `;
  }).join('');

  // ── Paginador ──
  if (!paginador) return;

  const btnStyle = (activo) => `
    display:inline-block;padding:6px 12px;margin:2px;border-radius:4px;cursor:pointer;
    font-size:13px;border:1px solid #6b1a2a;
    background:${activo ? '#6b1a2a' : '#fff'};
    color:${activo ? '#fff' : '#6b1a2a'};
    font-weight:${activo ? 'bold' : 'normal'};
  `;

  let html = `<div style="text-align:center;margin-top:10px;display:flex;align-items:center;justify-content:center;flex-wrap:wrap;gap:4px;">`;

  // Botón anterior
  html += `<button onclick="_cambiarPaginaEstados(${_estadosPaginaActual - 1})"
    style="${btnStyle(false)}opacity:${_estadosPaginaActual === 1 ? '0.4' : '1'};"
    ${_estadosPaginaActual === 1 ? 'disabled' : ''}>&#8592; Ant</button>`;

  // Números de página
  for (let i = 1; i <= totalPaginas; i++) {
    html += `<button onclick="_cambiarPaginaEstados(${i})"
      style="${btnStyle(i === _estadosPaginaActual)}">${i}</button>`;
  }

  // Botón siguiente
  html += `<button onclick="_cambiarPaginaEstados(${_estadosPaginaActual + 1})"
    style="${btnStyle(false)}opacity:${_estadosPaginaActual === totalPaginas ? '0.4' : '1'};"
    ${_estadosPaginaActual === totalPaginas ? 'disabled' : ''}>Sig &#8594;</button>`;

  html += `<span style="font-size:12px;color:#888;margin-left:8px;">
    Página ${_estadosPaginaActual} de ${totalPaginas} (${_estadosDatos.length} registros)
  </span></div>`;

  paginador.innerHTML = html;
}

function _cambiarPaginaEstados(nuevaPagina) {
  const totalPaginas = Math.ceil(_estadosDatos.length / _estadosPorPagina);
  if (nuevaPagina < 1 || nuevaPagina > totalPaginas) return;
  _estadosPaginaActual = nuevaPagina;
  _dibujarPaginaEstados();
}

/* ─── Cargar asistencias ─── */
async function cargarAsistencias() {
  const tbody = document.getElementById('tbody-asistencias');
  if (!tbody) return;

  try {
    const res = await apiFetch('/perfil/asistencias');
    if (!res || !res.ok) {
      tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;color:red;">Error al cargar.</td></tr>';
      return;
    }

    const rows = await res.json();

    if (!rows || rows.length === 0) {
      tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;">Sin registros de asistencia.</td></tr>';
      return;
    }

    tbody.innerHTML = rows.map(a => `
      <tr>
        <td>${formatearFecha(a.FECHA)}</td>
        <td>${a.ENTRADA || '—'}</td>
        <td>${a.SALIDA  || '—'}</td>
        <td>${a['ID-INCIDENCIA'] ? 'Sí' : 'No'}</td>
      </tr>
    `).join('');

  } catch (err) {
    console.error('Error en cargarAsistencias:', err);
    if (tbody) tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;color:red;">Error de conexión.</td></tr>';
  }
}

/* ─── Cargar incidencias ─── */
async function cargarIncidencias() {
  const tbody = document.getElementById('tbody-incidencias');
  if (!tbody) return;

  try {
    const res = await apiFetch('/perfil/incidencias');
    if (!res || !res.ok) {
      tbody.innerHTML = '<tr><td colspan="3" style="text-align:center;color:red;">Error al cargar.</td></tr>';
      return;
    }

    const rows = await res.json();

    if (!rows || rows.length === 0) {
      tbody.innerHTML = '<tr><td colspan="3" style="text-align:center;">Sin incidencias registradas.</td></tr>';
      return;
    }

    tbody.innerHTML = rows.map(i => `
      <tr>
        <td>${formatearFecha(i.FECHA)}</td>
        <td>${i.CURP        || '—'}</td>
        <td>${i.DESCRIPCION || '—'}</td>
      </tr>
    `).join('');

  } catch (err) {
    console.error('Error en cargarIncidencias:', err);
    if (tbody) tbody.innerHTML = '<tr><td colspan="3" style="text-align:center;color:red;">Error de conexión.</td></tr>';
  }
}

/* ─── Cargar notificaciones ─── */
async function cargarNotificaciones() {
  const contenedor = document.getElementById('lista-notificaciones');
  if (!contenedor) return;

  try {
    const res = await apiFetch('/notificaciones');
    if (!res || !res.ok) {
      contenedor.innerHTML = '<p style="color:red;text-align:center;">Error al cargar notificaciones.</p>';
      return;
    }

    const data = await res.json();
    const notifs = data.notificaciones || [];

    if (notifs.length === 0) {
      contenedor.innerHTML = '<p style="text-align:center;">No tienes notificaciones.</p>';
      return;
    }

    contenedor.innerHTML = notifs.map(n => {
      const leida = n.leida ? 'opacity:0.6;' : 'font-weight:bold;';
      const fecha = n.fecha ? new Date(n.fecha).toLocaleDateString('es-MX') : '';
      return `
        <div style="${leida}background:#f8f9fa;border-left:4px solid #6b1a2a;
                     padding:12px 15px;margin-bottom:10px;border-radius:4px;
                     display:flex;justify-content:space-between;align-items:flex-start;gap:10px;">
          <div>
            <span style="font-size:13px;color:#555;">${fecha}</span><br>
            <span>${n.mensaje || '—'}</span>
          </div>
          ${!n.leida ? `<button onclick="marcarLeida(${n.id})"
            style="background:#6b1a2a;color:#fff;border:none;padding:5px 12px;
                   border-radius:4px;cursor:pointer;font-size:12px;white-space:nowrap;">
            Marcar leída
          </button>` : '<span style="font-size:12px;color:#28a745;">✓ Leída</span>'}
        </div>
      `;
    }).join('');

  } catch (err) {
    console.error('Error en cargarNotificaciones:', err);
    contenedor.innerHTML = '<p style="color:red;text-align:center;">Error de conexión.</p>';
  }
}

/* ─── Marcar notificación como leída ─── */
async function marcarLeida(id) {
  try {
    const res = await apiFetch(`/notificaciones/${id}/leida`, { method: 'PUT' });
    if (res && res.ok) {
      cargarNotificaciones();
      cargarPerfil(); // actualizar badge
    }
  } catch (err) {
    console.error('Error en marcarLeida:', err);
  }
}

/* ─── Cargar justificaciones del empleado ─── */
async function cargarMisJustificaciones() {
  const tbody = document.getElementById('tbody-justificaciones');
  if (!tbody) return;

  try {
    const res = await apiFetch('/justificaciones/mis-justificaciones');
    if (!res || !res.ok) {
      tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;color:red;">Error al cargar.</td></tr>';
      return;
    }

    const rows = await res.json();

    if (!rows || rows.length === 0) {
      tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;">Sin justificaciones enviadas.</td></tr>';
      return;
    }

    tbody.innerHTML = rows.map(j => {
      const estadoColor = j.estado === 'APROBADA'
        ? '#28a745'
        : j.estado === 'RECHAZADA'
          ? '#dc3545'
          : '#ffc107';
      const fechaEnvio = formatearFecha(j.fecha_envio);
      return `
        <tr>
          <td>${j.fecha_tardanza || '—'}</td>
          <td style="max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;"
              title="${j.motivo || ''}">${j.motivo || '—'}</td>
          <td><span style="color:${estadoColor};font-weight:bold;">${j.estado || '—'}</span></td>
          <td>${j.comentario_admin || '—'}</td>
          <td>${fechaEnvio}</td>
        </tr>
      `;
    }).join('');

  } catch (err) {
    console.error('Error en cargarMisJustificaciones:', err);
    if (tbody) tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;color:red;">Error de conexión.</td></tr>';
  }
}

/* ─── Enviar justificación ─── */
async function enviarJustificacion(e) {
  e.preventDefault();
  const statusEl = document.getElementById('just-status');
  const btn = e.target.querySelector('button[type="submit"]');

  const fechaTardanza = document.getElementById('just-fecha').value;
  const motivo        = document.getElementById('just-motivo').value.trim();
  const pdfInput      = document.getElementById('just-pdf');

  if (!fechaTardanza || !motivo) {
    if (statusEl) { statusEl.style.color = 'red'; statusEl.textContent = 'La fecha y el motivo son obligatorios.'; }
    return;
  }

  if (btn) { btn.disabled = true; btn.textContent = 'Enviando...'; }

  try {
    let pdfBase64 = null;

    if (pdfInput && pdfInput.files[0]) {
      const file = pdfInput.files[0];
      if (file.size > 10 * 1024 * 1024) {
        if (statusEl) { statusEl.style.color = 'red'; statusEl.textContent = 'El PDF no puede superar 10MB.'; }
        if (btn) { btn.disabled = false; btn.textContent = 'Enviar Justificación'; }
        return;
      }
      pdfBase64 = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload  = () => resolve(reader.result);
        reader.onerror = () => reject(new Error('Error leyendo archivo'));
        reader.readAsDataURL(file);
      });
    }

    const res = await apiFetch('/justificaciones', {
      method: 'POST',
      body: JSON.stringify({ fechaTardanza, motivo, pdfBase64 })
    });

    if (!res) return;
    const data = await res.json();

    if (res.ok) {
      if (statusEl) { statusEl.style.color = 'green'; statusEl.textContent = data.msg || 'Justificación enviada.'; }
      e.target.reset();
      cargarMisJustificaciones();
    } else {
      if (statusEl) { statusEl.style.color = 'red'; statusEl.textContent = data.msg || 'Error al enviar.'; }
    }

  } catch (err) {
    console.error('Error en enviarJustificacion:', err);
    if (statusEl) { statusEl.style.color = 'red'; statusEl.textContent = 'Error de conexión.'; }
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = 'Enviar Justificación'; }
  }
}

/* ─── Cambiar contraseña ─── */
async function cambiarPassword(e) {
  e.preventDefault();
  const statusEl  = document.getElementById('pw-status');
  const btn       = e.target.querySelector('button[type="submit"]');
  const actual    = document.getElementById('pw-actual').value;
  const nueva     = document.getElementById('pw-nueva').value;
  const confirmar = document.getElementById('pw-confirmar').value;

  if (nueva !== confirmar) {
    if (statusEl) { statusEl.style.color = 'red'; statusEl.textContent = 'Las contraseñas nuevas no coinciden.'; }
    return;
  }

  if (btn) { btn.disabled = true; btn.textContent = 'Actualizando...'; }

  try {
    const res = await apiFetch('/perfil/password', {
      method: 'PUT',
      body: JSON.stringify({ passwordActual: actual, passwordNueva: nueva })
    });

    if (!res) return;
    const data = await res.json();

    if (res.ok) {
      if (statusEl) { statusEl.style.color = 'green'; statusEl.textContent = data.msg || 'Contraseña actualizada.'; }
      e.target.reset();
    } else {
      if (statusEl) { statusEl.style.color = 'red'; statusEl.textContent = data.msg || 'Error al actualizar.'; }
    }

  } catch (err) {
    console.error('Error en cambiarPassword:', err);
    if (statusEl) { statusEl.style.color = 'red'; statusEl.textContent = 'Error de conexión.'; }
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = 'Actualizar Contraseña'; }
  }
}
