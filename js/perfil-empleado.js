/**
 * perfil-empleado.js — Lógica del perfil del empleado
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

  const inputFoto = document.getElementById('input-foto');
  if (inputFoto) inputFoto.addEventListener('change', subirFoto);

  const formJust = document.getElementById('form-justificacion');
  if (formJust) formJust.addEventListener('submit', enviarJustificacion);
});

function mostrarSeccion(nombre) {
  document.querySelectorAll('.perfil-seccion').forEach(s => s.classList.remove('activa'));
  const sec = document.getElementById('seccion-' + nombre);
  if (sec) sec.classList.add('activa');
  document.querySelectorAll('.navbar a').forEach(a => a.classList.remove('nav-activo'));
  const link = document.querySelector(`.navbar a[onclick*="${nombre}"]`);
  if (link) link.classList.add('nav-activo');
}

async function cargarPerfil() {
  try {
    const res = await apiFetch('/perfil');
    if (!res || !res.ok) return;
    const data = await res.json();
    const emp = data.empleado;

    document.getElementById('info-numTrabajador').textContent = emp['NUM-TRABAJADOR'] || '—';
    document.getElementById('info-curp').textContent = emp.CURP || '—';
    document.getElementById('info-nombre').textContent = emp.NOMBRE || '—';
    document.getElementById('info-aPaterno').textContent = emp['A-PATERNO'] || '—';
    document.getElementById('info-aMaterno').textContent = emp['A-MATERNO'] || '—';
    document.getElementById('info-puesto').textContent = emp.PUESTO || '—';
    document.getElementById('info-departamento').textContent = emp.DEPARTAMENTO || '—';

  const fotoEl = document.getElementById('foto-perfil');

if (fotoEl) {
  if (emp.foto_perfil && emp.foto_perfil.length > 50) {
    fotoEl.src = `data:image/jpeg;base64,${emp.foto_perfil}`;
  } else {
    fotoEl.src = '/img/805-original.webp';
  }
}
    // ✅ Alerta de retardos del mes
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

    // ✅ Badge de notificaciones
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

function renderHorario(horario) {
  const tbody = document.getElementById('tbody-horario');
  const noData = document.getElementById('horario-no-data');
  const info = document.getElementById('horario-info');

  if (!horario) {
    if (tbody) tbody.innerHTML = '';
    if (info) info.style.display = 'none';
    if (noData) noData.style.display = 'block';
    return;
  }

  if (info) info.style.display = 'block';
  if (noData) noData.style.display = 'none';

  const turnoEl = document.getElementById('horario-turno');
  if (turnoEl) turnoEl.innerHTML = '<strong>Turno:</strong> ' + (horario.TURNO || '—');

  const dias = [
    { nombre: 'Lunes', am: horario['LUNES-am'], pm: horario['LUNES-pm'] },
    { nombre: 'Martes', am: horario['MARTES-am'], pm: horario['MARTES-pm'] },
    { nombre: 'Miércoles', am: horario['MIÉRCOLES-am'], pm: horario['MIÉRCOLES-pm'] },
    { nombre: 'Jueves', am: horario['JUEVES-am'], pm: horario['JUEVES-pm'] },
    { nombre: 'Viernes', am: horario['VIERNES-am'], pm: horario['VIERNES-pm'] }
  ];

  if (tbody) tbody.innerHTML = dias.map(d => `
    <tr>
      <td><strong>${d.nombre}</strong></td>
      <td>${d.am || '—'}</td>
      <td>${d.pm || '—'}</td>
    </tr>
  `).join('');
}

function renderEstados(estados) {
  const tbody = document.getElementById('tbody-estados');
  if (!tbody) return;
  if (!estados || estados.length === 0) {
    tbody.innerHTML = '<tr><td colspan="2" style="text-align:center;">Sin registros</td></tr>';
    return;
  }
  tbody.innerHTML = estados.map(e => {
    let badge = 'color:green;font-weight:bold';
    if (e.ESTATUS === 'RETARDO') badge = 'color:#856404;font-weight:bold';
    else if (e.ESTATUS === 'JUSTIFICADO') badge = 'color:#17a2b8;font-weight:bold';
    const fecha = e.FECHA ? new Date(e.FECHA).toLocaleDateString('es-MX') : '—';
    return `<tr><td>${fecha}</td><td><span style="${badge}">${e.ESTATUS}</span></td></tr>`;
  }).join('');
}

async function cargarAsistencias() {
  try {
    const res = await apiFetch('/perfil/asistencias');
    if (!res || !res.ok) return;
    const data = await res.json();
    const tbody = document.getElementById('tbody-asistencias');
    if (!tbody) return;

    if (!data || data.length === 0) {
      tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;">Sin registros de asistencia</td></tr>';
      return;
    }

    tbody.innerHTML = data.map(a => {
      const fecha = a.FECHA ? new Date(a.FECHA).toLocaleDateString('es-MX') : '—';
      return `<tr>
        <td>${fecha}</td>
        <td>${a.ENTRADA || '—'}</td>
        <td>${a.SALIDA || '—'}</td>
        <td>${a['ID-INCIDENCIA'] || '—'}</td>
      </tr>`;
    }).join('');
  } catch (err) {
    console.error('Error cargando asistencias:', err);
  }
}

async function cargarIncidencias() {
  try {
    const res = await apiFetch('/perfil/incidencias');
    if (!res || !res.ok) return;
    const data = await res.json();
    const tbody = document.getElementById('tbody-incidencias');
    if (!tbody) return;

    if (!data || data.length === 0) {
      tbody.innerHTML = '<tr><td colspan="3" style="text-align:center;">Sin incidencias registradas</td></tr>';
      return;
    }

    tbody.innerHTML = data.map(i => {
      const fecha = i.FECHA ? new Date(i.FECHA).toLocaleDateString('es-MX') : '—';
      return `<tr>
        <td>${fecha}</td>
        <td>${i.CURP || '—'}</td>
        <td>${i.DESCRIPCION || '—'}</td>
      </tr>`;
    }).join('');
  } catch (err) {
    console.error('Error cargando incidencias:', err);
  }
}

// ✅ NOTIFICACIONES
async function cargarNotificaciones() {
  try {
    const res = await apiFetch('/notificaciones');
    if (!res || !res.ok) return;
    const data = await res.json();
    const container = document.getElementById('lista-notificaciones');
    if (!container) return;

    const notifs = data.notificaciones || [];
    if (notifs.length === 0) {
      container.innerHTML = '<p style="text-align:center;color:#888;">No tienes notificaciones.</p>';
      return;
    }

    container.innerHTML = notifs.map(n => {
      const fecha = new Date(n.fecha).toLocaleString('es-MX');
      const bgColor = n.leida ? '#f8f9fa' : '#fff3cd';
      const iconos = {
        'TARDANZA': '⏰',
        'JUSTIFICACION_APROBADA': '✅',
        'JUSTIFICACION_RECHAZADA': '❌',
        'INFO': 'ℹ️'
      };
      return `<div class="perfil-card" style="background:${bgColor};margin-bottom:10px;padding:12px;border-left:4px solid ${n.leida ? '#dee2e6' : '#ffc107'};">
        <div style="display:flex;justify-content:space-between;align-items:start;">
          <div>
            <span style="font-size:16px;">${iconos[n.tipo] || 'ℹ️'}</span>
            <span style="font-size:13px;color:#555;">${fecha}</span>
            ${!n.leida ? '<span style="background:#dc3545;color:#fff;font-size:10px;padding:2px 6px;border-radius:10px;margin-left:5px;">Nueva</span>' : ''}
          </div>
          ${!n.leida ? `<button onclick="marcarNotifLeida(${n.id})" style="background:none;border:none;cursor:pointer;font-size:12px;color:#6b1a2a;">Marcar leída</button>` : ''}
        </div>
        <p style="margin:8px 0 0;font-size:14px;">${n.mensaje}</p>
      </div>`;
    }).join('');

    // Botón marcar todas
    if (data.noLeidas > 0) {
      container.insertAdjacentHTML('beforebegin',
        `<button onclick="marcarTodasLeidas()" style="background:#6b1a2a;color:#fff;border:none;padding:8px 15px;border-radius:6px;cursor:pointer;font-size:13px;margin-bottom:10px;">
          Marcar todas como leídas (${data.noLeidas})
        </button>`
      );
    }
  } catch (err) {
    console.error('Error cargando notificaciones:', err);
  }
}

async function marcarNotifLeida(id) {
  try {
    await apiFetch('/notificaciones/' + id + '/leida', { method: 'PUT' });
    cargarNotificaciones();
    cargarPerfil(); // Actualizar badge
  } catch (err) {
    console.error('Error:', err);
  }
}

async function marcarTodasLeidas() {
  try {
    await apiFetch('/notificaciones/marcar-todas', { method: 'PUT' });
    cargarNotificaciones();
    cargarPerfil();
    mostrarAlerta('Notificaciones marcadas como leídas.', 'success');
  } catch (err) {
    console.error('Error:', err);
  }
}

// ✅ JUSTIFICACIONES
async function enviarJustificacion(e) {
  e.preventDefault();
  const fecha = document.getElementById('just-fecha').value;
  const motivo = document.getElementById('just-motivo').value.trim();
  const fileInput = document.getElementById('just-pdf');
  const statusEl = document.getElementById('just-status');

  statusEl.textContent = '';

  if (!fecha || !motivo) {
    statusEl.textContent = '❌ La fecha y el motivo son obligatorios.';
    statusEl.style.color = 'red';
    return;
  }

  let pdfBase64 = null;
  if (fileInput && fileInput.files && fileInput.files[0]) {
    const file = fileInput.files[0];
    if (file.type !== 'application/pdf') {
      statusEl.textContent = '❌ Solo se permiten archivos PDF.';
      statusEl.style.color = 'red';
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      statusEl.textContent = '❌ El archivo excede el tamaño máximo de 10MB.';
      statusEl.style.color = 'red';
      return;
    }
    pdfBase64 = await fileToBase64(file);
  }

  const btn = e.target.querySelector('button[type="submit"]');
  btn.disabled = true;
  btn.textContent = 'Enviando...';
  statusEl.textContent = 'Enviando justificación...';
  statusEl.style.color = '#856404';

  try {
    const res = await apiFetch('/justificaciones', {
      method: 'POST',
      body: JSON.stringify({ fechaTardanza: fecha, motivo, pdfBase64 })
    });
    if (!res) return;
    const data = await res.json();
    if (res.ok) {
      statusEl.textContent = '✅ ' + data.msg;
      statusEl.style.color = 'green';
      e.target.reset();
      cargarMisJustificaciones();
      mostrarAlerta(data.msg, 'success');
    } else {
      statusEl.textContent = '❌ ' + (data.msg || 'Error al enviar.');
      statusEl.style.color = 'red';
    }
  } catch (err) {
    statusEl.textContent = '❌ Error de conexión.';
    statusEl.style.color = 'red';
  } finally {
    btn.disabled = false;
    btn.textContent = 'Enviar Justificación';
  }
}

async function cargarMisJustificaciones() {
  try {
    const res = await apiFetch('/justificaciones/mis-justificaciones');
    if (!res || !res.ok) return;
    const data = await res.json();
    const tbody = document.getElementById('tbody-justificaciones');
    if (!tbody) return;

    if (!data || data.length === 0) {
      tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;">Sin justificaciones enviadas.</td></tr>';
      return;
    }

    tbody.innerHTML = data.map(j => {
      const fecha = j.fecha_tardanza ? new Date(j.fecha_tardanza + 'T12:00:00').toLocaleDateString('es-MX') : '—';
      const enviada = j.fecha_envio ? new Date(j.fecha_envio).toLocaleString('es-MX') : '—';
      const estadoColor = {
        'PENDIENTE': '#ffc107', 'APROBADA': '#28a745', 'RECHAZADA': '#dc3545'
      };
      return `<tr>
        <td>${fecha}</td>
        <td style="max-width:200px;overflow:hidden;text-overflow:ellipsis;">${j.motivo || '—'}</td>
        <td><span style="background:${estadoColor[j.estado] || '#6c757d'};color:#fff;padding:3px 10px;border-radius:12px;font-size:12px;">${j.estado}</span></td>
        <td>${j.comentario_admin || '—'}</td>
        <td>${enviada}</td>
      </tr>`;
    }).join('');
  } catch (err) {
    console.error('Error cargando justificaciones:', err);
  }
}

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

async function cambiarPassword(e) {
  e.preventDefault();
  const pwActual = document.getElementById('pw-actual').value;
  const pwNueva = document.getElementById('pw-nueva').value;
  const pwConfirmar = document.getElementById('pw-confirmar').value;
  const statusEl = document.getElementById('pw-status');

  statusEl.textContent = '';
  statusEl.style.color = '';

  if (pwNueva.length < 8) {
    statusEl.textContent = '❌ Mínimo 8 caracteres';
    statusEl.style.color = 'red';
    return;
  }
  if (!/[A-Z]/.test(pwNueva)) {
    statusEl.textContent = '❌ Debe tener al menos una mayúscula';
    statusEl.style.color = 'red';
    return;
  }
  if (!/[0-9]/.test(pwNueva)) {
    statusEl.textContent = '❌ Debe tener al menos un número';
    statusEl.style.color = 'red';
    return;
  }
  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(pwNueva)) {
    statusEl.textContent = '❌ Debe tener al menos un carácter especial (!@#$%...)';
    statusEl.style.color = 'red';
    return;
  }
  if (pwNueva !== pwConfirmar) {
    statusEl.textContent = '❌ Las contraseñas no coinciden';
    statusEl.style.color = 'red';
    return;
  }

  try {
    const res = await apiFetch('/perfil/password', {
      method: 'PUT',
      body: JSON.stringify({ passwordActual: pwActual, passwordNueva: pwNueva })
    });
    if (!res) return;
    const data = await res.json();
    if (res.ok) {
      statusEl.textContent = '✅ ' + data.msg;
      statusEl.style.color = 'green';
      document.getElementById('form-password').reset();
    } else {
      statusEl.textContent = '❌ ' + (data.msg || 'Error al cambiar contraseña');
      statusEl.style.color = 'red';
    }
  } catch (err) {
    statusEl.textContent = '❌ Error de conexión';
    statusEl.style.color = 'red';
  }
}

async function subirFoto() {
  const input = document.getElementById('input-foto');
  const statusEl = document.getElementById('foto-status');
  if (!input.files || !input.files[0]) return;

  const file = input.files[0];
  // ✅ Validar tipo de archivo
  const tiposPermitidos = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
  if (!tiposPermitidos.includes(file.type)) {
    statusEl.textContent = '❌ Tipo no permitido. Se aceptan: JPEG, PNG, WebP, GIF';
    statusEl.style.color = 'red';
    return;
  }
  if (file.size > 5 * 1024 * 1024) {
    statusEl.textContent = '❌ Máximo 5MB';
    statusEl.style.color = 'red';
    return;
  }

  const reader = new FileReader();
  reader.onload = async () => {
    try {
      statusEl.textContent = 'Subiendo...';
      const res = await apiFetch('/perfil/foto', {
        method: 'POST',
        body: JSON.stringify({ foto: reader.result.split(',')[1] })
      });
      if (!res) return;
      const data = await res.json();
      if (res.ok) {
        statusEl.textContent = '✅ Foto actualizada';
        statusEl.style.color = 'green';
        document.getElementById('foto-perfil').src = reader.result;
      } else {
        statusEl.textContent = '❌ ' + (data.msg || 'Error');
        statusEl.style.color = 'red';
      }
    } catch (err) {
      statusEl.textContent = '❌ Error de conexión';
    }
  };
  reader.readAsDataURL(file);
}

window.mostrarSeccion = mostrarSeccion;
window.cargarAsistencias = cargarAsistencias;
window.marcarNotifLeida = marcarNotifLeida;
window.marcarTodasLeidas = marcarTodasLeidas;
