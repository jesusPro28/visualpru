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

/* ─── Cargar asistencias con paginación ─── */
let _asistenciasPaginaActual = 1;
const _asistenciasPorPagina  = 8;
let   _asistenciasDatos      = [];

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

    _asistenciasDatos        = rows;
    _asistenciasPaginaActual = 1;
    _dibujarPaginaAsistencias();

  } catch (err) {
    console.error('Error en cargarAsistencias:', err);
    if (tbody) tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;color:red;">Error de conexión.</td></tr>';
  }
}

function _dibujarPaginaAsistencias() {
  const tbody    = document.getElementById('tbody-asistencias');
  const paginador = document.getElementById('paginador-asistencias');
  if (!tbody) return;

  const totalPaginas = Math.ceil(_asistenciasDatos.length / _asistenciasPorPagina);
  const inicio       = (_asistenciasPaginaActual - 1) * _asistenciasPorPagina;
  const fin          = inicio + _asistenciasPorPagina;
  const pagina       = _asistenciasDatos.slice(inicio, fin);

  // ── Filas ──
  tbody.innerHTML = pagina.map(a => `
    <tr>
      <td>${formatearFecha(a.FECHA)}</td>
      <td>${a.ENTRADA || '—'}</td>
      <td>${a.SALIDA  || '—'}</td>
      <td>${a['ID-INCIDENCIA'] ? 'Sí' : 'No'}</td>
    </tr>
  `).join('');

  // ── Paginador ──
  if (!paginador) return;

  if (totalPaginas <= 1) {
    paginador.innerHTML = '';
    return;
  }

  const btnStyle = (activo) => `
    display:inline-block;padding:6px 12px;margin:2px;border-radius:4px;cursor:pointer;
    font-size:13px;border:1px solid #6b1a2a;
    background:${activo ? '#6b1a2a' : '#fff'};
    color:${activo ? '#fff' : '#6b1a2a'};
    font-weight:${activo ? 'bold' : 'normal'};
  `;

  let html = `<div style="text-align:center;margin-top:10px;display:flex;align-items:center;justify-content:center;flex-wrap:wrap;gap:4px;">`;

  html += `<button onclick="_cambiarPaginaAsistencias(${_asistenciasPaginaActual - 1})"
    style="${btnStyle(false)}opacity:${_asistenciasPaginaActual === 1 ? '0.4' : '1'};"
    ${_asistenciasPaginaActual === 1 ? 'disabled' : ''}>&#8592; Ant</button>`;

  for (let i = 1; i <= totalPaginas; i++) {
    html += `<button onclick="_cambiarPaginaAsistencias(${i})"
      style="${btnStyle(i === _asistenciasPaginaActual)}">${i}</button>`;
  }

  html += `<button onclick="_cambiarPaginaAsistencias(${_asistenciasPaginaActual + 1})"
    style="${btnStyle(false)}opacity:${_asistenciasPaginaActual === totalPaginas ? '0.4' : '1'};"
    ${_asistenciasPaginaActual === totalPaginas ? 'disabled' : ''}>Sig &#8594;</button>`;

  html += `<span style="font-size:12px;color:#888;margin-left:8px;">
    Página ${_asistenciasPaginaActual} de ${totalPaginas} (${_asistenciasDatos.length} registros)
  </span></div>`;

  paginador.innerHTML = html;
}

function _cambiarPaginaAsistencias(nuevaPagina) {
  const totalPaginas = Math.ceil(_asistenciasDatos.length / _asistenciasPorPagina);
  if (nuevaPagina < 1 || nuevaPagina > totalPaginas) return;
  _asistenciasPaginaActual = nuevaPagina;
  _dibujarPaginaAsistencias();
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

/* ─── Cargar notificaciones (sistema + retardos) ─── */
async function cargarNotificaciones() {
  const contenedor = document.getElementById('lista-notificaciones');
  if (!contenedor) return;

  contenedor.innerHTML = '<p style="text-align:center;color:#888;">Cargando notificaciones...</p>';

  try {
    // Peticiones en paralelo: notificaciones del sistema + notificaciones de retardo
    const [resNotif, resRetardo] = await Promise.all([
      apiFetch('/notificaciones'),
      apiFetch('/notificaciones/retardo')
    ]);

    const dataSistema  = (resNotif && resNotif.ok)   ? await resNotif.json()   : {};
    const dataRetardo  = (resRetardo && resRetardo.ok) ? await resRetardo.json() : {};

    const notifsSistema  = dataSistema.notificaciones        || [];
    const notifsRetardo  = dataRetardo.notificacionesRetardo  || [];

    // Normalizar retardos al mismo formato que las del sistema
    // (origen: 'retardo' para distinguirlas visualmente)
    const retardosNorm = notifsRetardo.map(r => ({
      id:       r.id,
      mensaje:  r.mensaje,
      fecha:    r.fecha_registro,
      leida:    true,          // la tabla no tiene campo leída → siempre se muestran como informativas
      origen:   'retardo'
    }));

    const sistemaaNorm = notifsSistema.map(n => ({
      id:      n.id,
      mensaje: n.mensaje,
      fecha:   n.fecha,
      leida:   !!n.leida,
      origen:  'sistema'
    }));

    // Combinar y ordenar por fecha descendente
    const todas = [...sistemaaNorm, ...retardosNorm].sort((a, b) => {
      return new Date(b.fecha || 0) - new Date(a.fecha || 0);
    });

    if (todas.length === 0) {
      contenedor.innerHTML = '<p style="text-align:center;color:#888;">No tienes notificaciones.</p>';
      return;
    }

    // Separar por sección para mostrar encabezados si hay de ambos tipos
    const tieneSistema = sistemaaNorm.length > 0;
    const tieneRetardo = retardosNorm.length > 0;

    let html = '';

    if (tieneSistema && tieneRetardo) {
      // Mostrar todas mezcladas cronológicamente pero con etiqueta de origen
      html = todas.map(n => _renderNotificacion(n, true)).join('');
    } else {
      html = todas.map(n => _renderNotificacion(n, false)).join('');
    }

    contenedor.innerHTML = html;

  } catch (err) {
    console.error('Error en cargarNotificaciones:', err);
    contenedor.innerHTML = '<p style="color:red;text-align:center;">Error de conexión.</p>';
  }
}

/* ─── Renderizar una tarjeta de notificación ─── */
function _renderNotificacion(n, mostrarEtiqueta) {
  const esRetardo = n.origen === 'retardo';
  const colorBorde = esRetardo ? '#e67e22' : '#6b1a2a';
  const colorFondo = esRetardo ? '#fff8f2' : '#f8f9fa';
  const opacidad   = n.leida ? 'opacity:0.65;' : '';
  const peso       = n.leida ? '' : 'font-weight:600;';

  const fecha = n.fecha
    ? new Date(n.fecha).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' })
    : '';

  const etiquetaHtml = mostrarEtiqueta
    ? `<span style="font-size:11px;padding:2px 8px;border-radius:10px;
                    background:${esRetardo ? '#e67e22' : '#6b1a2a'};color:#fff;
                    margin-left:8px;vertical-align:middle;">
        ${esRetardo ? '⚠ Retardo' : '🔔 Sistema'}
       </span>`
    : '';

  const accionHtml = esRetardo
    ? '<span style="font-size:12px;color:#e67e22;white-space:nowrap;">ℹ Informativa</span>'
    : (!n.leida
        ? `<button onclick="marcarLeida(${n.id})"
             style="background:#6b1a2a;color:#fff;border:none;padding:5px 12px;
                    border-radius:4px;cursor:pointer;font-size:12px;white-space:nowrap;">
             Marcar leída
           </button>`
        : '<span style="font-size:12px;color:#28a745;">✓ Leída</span>'
      );

  return `
    <div style="${opacidad}background:${colorFondo};border-left:4px solid ${colorBorde};
                 padding:12px 15px;margin-bottom:10px;border-radius:4px;
                 display:flex;justify-content:space-between;align-items:flex-start;gap:10px;">
      <div style="flex:1;min-width:0;">
        <div style="margin-bottom:4px;">
          <span style="font-size:12px;color:#777;">${fecha}</span>
          ${etiquetaHtml}
        </div>
        <span style="${peso}font-size:14px;line-height:1.5;word-break:break-word;">
          ${n.mensaje || '—'}
        </span>
      </div>
      <div style="flex-shrink:0;">${accionHtml}</div>
    </div>
  `;
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
