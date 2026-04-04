/**
 * registro-incidencias.js — Registro de incidencias (RegistroIncidenciasPri.html)
 */
document.addEventListener('DOMContentLoaded', () => {
  protegerPagina();
  setFooterYear();
  configurarLogout();

  const form = document.querySelector('form');
  if (!form) return;

  form.removeAttribute('action');
  form.removeAttribute('method');

  // ✅ Campo CURP no editable
  const curpField = document.getElementById('Curp');
  if (curpField) {
    curpField.readOnly = true;
    curpField.style.backgroundColor = '#f0f0f0';
  }

  // ✅ Al escribir número de trabajador busca la CURP automáticamente
  const numField = document.getElementById('Num_Trabajador');
  if (numField) {
    let timeout;
    numField.addEventListener('input', () => {
      clearTimeout(timeout);
      const num = numField.value.trim();
      if (!num) {
        if (curpField) curpField.value = '';
        return;
      }
      // Espera 600ms después de que el usuario deje de escribir
      timeout = setTimeout(() => buscarCurp(num), 600);
    });
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const body = {
      numTrabajador: document.getElementById('Num_Trabajador').value.trim(),
      curp: document.getElementById('Curp').value.trim(),
      fecha: document.getElementById('fecha').value,
      descripcion: document.getElementById('descripcion').value.trim()
    };

    if (!body.numTrabajador || !body.fecha || !body.descripcion) {
      mostrarAlerta('Completa todos los campos obligatorios', 'info');
      return;
    }

    if (!body.curp) {
      mostrarAlerta('El número de trabajador no existe o no tiene CURP registrada', 'info');
      return;
    }

    const btnSubmit = form.querySelector('button[type="submit"]');
    btnSubmit.disabled = true;
    btnSubmit.textContent = 'Guardando...';

    try {
      const res = await apiFetch('/incidencias', {
        method: 'POST',
        body: JSON.stringify(body)
      });

      const data = await res.json();

      if (res.ok) {
        mostrarAlerta(data.message || 'Incidencia registrada exitosamente', 'success');
        form.reset();
        if (curpField) curpField.value = '';
      } else {
        mostrarAlerta(data.message || 'Error al registrar incidencia', 'error');
      }
    } catch (err) {
      console.error('Error:', err);
      mostrarAlerta('Error de conexión con el servidor.', 'info');
    } finally {
      btnSubmit.disabled = false;
      btnSubmit.textContent = 'Guardar incidencia';
    }
  });
});

// ✅ Busca la CURP del empleado por número de trabajador
async function buscarCurp(numTrabajador) {
  try {
    const res = await apiFetch('/empleados/' + numTrabajador);
    const curpField = document.getElementById('Curp');
    if (res && res.ok) {
      const emp = await res.json();
      if (curpField) curpField.value = emp.CURP || '';
    } else {
      if (curpField) curpField.value = '';
    }
  } catch (err) {
    console.error('Error buscando empleado:', err);
  }
}

function configurarLogout() {
  document.querySelectorAll('a').forEach(a => {
    if (a.textContent.trim() === 'Cerrar sesión') {
      a.href = '#';
      a.addEventListener('click', (e) => { e.preventDefault(); logout(); });
    }
  });
}