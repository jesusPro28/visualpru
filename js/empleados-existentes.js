/**
 * empleados-existentes.js — Listado de empleados (EmpleadosExistentesPri.html)
 */
document.addEventListener('DOMContentLoaded', () => {
  protegerPagina();
  setFooterYear();
  configurarLogout();
  cargarEmpleados();
});

function configurarLogout() {
  document.querySelectorAll('a').forEach(a => {
    if (a.textContent.trim() === 'Cerrar sesión') {
      a.href = '#';
      a.addEventListener('click', (e) => { e.preventDefault(); logout(); });
    }
  });
}

async function cargarEmpleados() {
  const tbody = document.querySelector('table tbody');
  const mensajeVacio = document.querySelector('main h2');
  const linkRegistro = document.querySelector('main > a');

  try {
    const res = await apiFetch('/empleados');
    if (!res || !res.ok) {
      mostrarAlerta('Error al cargar empleados.', 'error');
      return;
    }

    const response = await res.json();
    // Soportar respuesta paginada o array directo
    const empleados = response.data || response;

    if (empleados.length === 0) {
      if (mensajeVacio) mensajeVacio.style.display = '';
      return;
    }

    if (mensajeVacio) mensajeVacio.style.display = 'none';
    if (linkRegistro) linkRegistro.href = 'RegistroEmpleadosPri.html';

    tbody.innerHTML = '';

    empleados.forEach(emp => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${emp['ID-EMPLEADO'] || ''}</td>
        <td>${emp['NUM-TRABAJADOR'] || ''}</td>
        <td>${emp.CURP || ''}</td>
        <td>${emp.NOMBRE || ''}</td>
        <td>${emp['A-PATERNO'] || ''}</td>
        <td>${emp['A-MATERNO'] || ''}</td>
        <td>${emp.PUESTO || ''}</td>
        <td>${emp.DEPARTAMENTO || ''}</td>
        <td>
          <a href="#" class="btn-editar" data-id="${emp['NUM-TRABAJADOR']}">Editar</a>
          <a href="#" class="btn-eliminar" data-id="${emp['NUM-TRABAJADOR']}" data-nombre="${emp.NOMBRE} ${emp['A-PATERNO']}">Eliminar</a>
        </td>
      `;
      tbody.appendChild(tr);
    });

    // Event listeners
    tbody.querySelectorAll('.btn-editar').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        editarEmpleado(btn.dataset.id);
      });
    });

    tbody.querySelectorAll('.btn-eliminar').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        eliminarEmpleado(btn.dataset.id, btn.dataset.nombre);
      });
    });

  } catch (err) {
    console.error('Error cargando empleados:', err);
    mostrarAlerta('Error al conectar con el servidor.', 'error');
  }
}

async function eliminarEmpleado(numTrabajador, nombre) {
  // ✅ Confirmación mejorada
  const confirmado = await confirmarAccion(
    `¿Estás seguro de eliminar al empleado <strong>${nombre || numTrabajador}</strong>?<br><small>Esta acción no se puede deshacer.</small>`,
    '⚠️ Eliminar Empleado'
  );
  if (!confirmado) return;

  try {
    const res = await apiFetch('/empleados/' + numTrabajador, { method: 'DELETE' });
    if (!res) return;
    const data = await res.json();

    if (res.ok) {
      mostrarAlerta(data.msg || 'Empleado eliminado correctamente.', 'success');
      cargarEmpleados();
    } else {
      mostrarAlerta(data.msg || 'Error al eliminar empleado.', 'error');
    }
  } catch (err) {
    console.error('Error eliminando:', err);
    mostrarAlerta('Error de conexión.', 'error');
  }
}

function editarEmpleado(numTrabajador) {
  window.location.href = 'RegistroEmpleadosPri.html?editar=' + numTrabajador;
}
