/**
 * justificaciones-admin.js — Gestión de justificaciones (JustificacionesPri.html)
 */
document.addEventListener('DOMContentLoaded', () => {
  protegerPagina();
  setFooterYear();
  configurarLogout();
  cargarJustificaciones();
});

function configurarLogout() {
  document.querySelectorAll('a').forEach(a => {
    if (a.textContent.trim() === 'Cerrar sesión') {
      a.href = '#';
      a.addEventListener('click', (e) => { e.preventDefault(); logout(); });
    }
  });
}

async function cargarJustificaciones() {
  const tbody = document.getElementById('tbody-justificaciones');
  const contador = document.getElementById('contador-just');
  const estado = document.getElementById('filtro-estado').value;

  tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;">Cargando...</td></tr>';

  try {
    const res = await apiFetch('/justificaciones/pendientes?estado=' + estado);
    if (!res || !res.ok) {
      tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;color:red;">Error al cargar.</td></tr>';
      return;
    }

    const data = await res.json();
    if (contador) contador.textContent = `${data.length} resultado(s)`;

    if (data.length === 0) {
      tbody.innerHTML = `<tr><td colspan="8" style="text-align:center;">No hay justificaciones ${estado.toLowerCase()}s.</td></tr>`;
      return;
    }

    tbody.innerHTML = data.map(j => {
      const fecha = j.fecha_tardanza ? new Date(j.fecha_tardanza + 'T12:00:00').toLocaleDateString('es-MX') : '—';
      const estadoColor = { 'PENDIENTE': '#ffc107', 'APROBADA': '#28a745', 'RECHAZADA': '#dc3545' };
      
      let acciones = '';
      if (j.estado === 'PENDIENTE') {
        acciones = `
          <button onclick="resolverJust(${j.id}, 'APROBADA')" style="background:#28a745;color:#fff;border:none;padding:5px 10px;border-radius:4px;cursor:pointer;font-size:12px;margin:2px;">✅ Aprobar</button>
          <button onclick="resolverJust(${j.id}, 'RECHAZADA')" style="background:#dc3545;color:#fff;border:none;padding:5px 10px;border-radius:4px;cursor:pointer;font-size:12px;margin:2px;">❌ Rechazar</button>
        `;
      } else {
        acciones = `<span style="font-size:12px;color:#888;">${j.estado}</span>`;
      }

      return `<tr>
        <td>${j.id}</td>
        <td>${j.nombre_empleado || j['NUM-TRABAJADOR']}</td>
        <td>${j.DEPARTAMENTO || '—'}</td>
        <td>${fecha}</td>
        <td style="max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;" title="${(j.motivo || '').replace(/"/g, '&quot;')}">${j.motivo || '—'}</td>
        <td>${j.tieneArchivo ? `<a href="${API_BASE_URL}/justificaciones/${j.id}/pdf" target="_blank" style="color:#6b1a2a;text-decoration:underline;">📄 Ver PDF</a>` : '<span style="color:#888;">Sin archivo</span>'}</td>
        <td><span style="background:${estadoColor[j.estado] || '#6c757d'};color:#fff;padding:3px 10px;border-radius:12px;font-size:12px;">${j.estado}</span></td>
        <td>${acciones}</td>
      </tr>`;
    }).join('');
  } catch (err) {
    console.error('Error:', err);
    tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;color:red;">Error de conexión.</td></tr>';
  }
}

async function resolverJust(id, estado) {
  const accion = estado === 'APROBADA' ? 'aprobar' : 'rechazar';
  const confirmado = await confirmarAccion(
    `¿Estás seguro de <strong>${accion}</strong> esta justificación?`,
    `${estado === 'APROBADA' ? '✅' : '❌'} ${accion.charAt(0).toUpperCase() + accion.slice(1)} Justificación`
  );
  if (!confirmado) return;

  // Pedir comentario opcional
  let comentario = '';
  const comentarioInput = prompt('Comentario (opcional):');
  if (comentarioInput !== null) comentario = comentarioInput;

  try {
    const res = await apiFetch('/justificaciones/' + id + '/resolver', {
      method: 'PUT',
      body: JSON.stringify({ estado, comentario })
    });
    if (!res) return;
    const data = await res.json();

    if (res.ok) {
      mostrarAlerta(data.msg || `Justificación ${accion}da.`, 'success');
      cargarJustificaciones();
    } else {
      mostrarAlerta(data.msg || 'Error al resolver.', 'error');
    }
  } catch (err) {
    mostrarAlerta('Error de conexión.', 'error');
  }
}

window.cargarJustificaciones = cargarJustificaciones;
window.resolverJust = resolverJust;
