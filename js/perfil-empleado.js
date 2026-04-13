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
    if (emp.foto_perfil) {
      fotoEl.src = `data:image/jpeg;base64,${emp.foto_perfil}`;
    } else {
      fotoEl.src = '../img/805-original.webp';
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
