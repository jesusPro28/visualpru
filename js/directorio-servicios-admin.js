/**
 * directorio-servicios-admin.js — Admin PDFs (DirectorioServiciosPri.html)
 */
document.addEventListener('DOMContentLoaded', () => {
  protegerPagina();
  setFooterYear();
  configurarLogout();
  cargarArchivos();

  function configurarLogout() {
  document.querySelectorAll('a').forEach(a => {
    if (a.textContent.trim() === 'Cerrar sesión') {
      a.href = '#';
      a.addEventListener('click', (e) => { e.preventDefault(); logout(); });
    }
  });
}

  // ✅ Subir nuevo archivo
  document.getElementById('form-subir').addEventListener('submit', async (e) => {
    e.preventDefault();
    const seccion = document.getElementById('seccion-subir').value;
    const titulo = document.getElementById('titulo-subir').value.trim();
    const archivoInput = document.getElementById('archivo-subir');

    if (!titulo || !archivoInput.files[0]) {
      mostrarAlerta('Completa todos los campos', 'info');
      return;
    }

    const btn = e.target.querySelector('button[type="submit"]');
    btn.disabled = true;
    btn.textContent = 'Subiendo...';

    try {
      const pdfBase64 = await convertirBase64(archivoInput.files[0]);

      const res = await apiFetch('/contenido', {
        method: 'POST',
        body: JSON.stringify({ seccion, titulo, pdfBase64 })
      });

      const data = await res.json();
      if (res.ok) {
        mostrarAlerta('Archivo subido correctamente', 'info');
        e.target.reset();
        cargarArchivos();
      } else {
        mostrarAlerta(data.msg || 'Error al subir', 'error');
      }
    } catch (err) {
      console.error(err);
      mostrarAlerta('Error de conexión.', 'info');
    } finally {
      btn.disabled = false;
      btn.textContent = 'Subir';
    }
  });

  // ✅ Filtrar por sección
  document.getElementById('filtro-seccion').addEventListener('change', cargarArchivos);
});

async function cargarArchivos() {
  const tbody = document.getElementById('tbody-archivos');
  const filtro = document.getElementById('filtro-seccion').value;
  const url = filtro ? `/contenido?seccion=${filtro}` : '/contenido';

  tbody.innerHTML = '<tr><td colspan="6">Cargando...</td></tr>';

  try {
    const res = await apiFetch(url);
    if (!res || !res.ok) {
      tbody.innerHTML = '<tr><td colspan="6">Error al cargar</td></tr>';
      return;
    }

    const archivos = await res.json();

    if (archivos.length === 0) {
      tbody.innerHTML = '<tr><td colspan="6">No hay archivos registrados</td></tr>';
      return;
    }

    tbody.innerHTML = '';
    archivos.forEach(arch => {
      const fecha = arch.fecha ? new Date(arch.fecha).toLocaleDateString('es-MX') : '';
      const tr = document.createElement('tr');
      tr.id = `arch-${arch.id}`;
      tr.innerHTML = `
        <td>${arch.id}</td>
        <td>${arch.seccion}</td>
        <td>${arch.titulo}</td>
        <td><a href="${API_BASE_URL}/contenido/${arch.id}/pdf" target="_blank">Ver PDF</a></td>
        <td>${fecha}</td>
        <td>
          <button class="btn-editar" onclick="mostrarEditar(${arch.id},'${arch.seccion}','${arch.titulo}')">Editar</button>
          <button class="btn-eliminar" onclick="eliminarArchivo(${arch.id})">Eliminar</button>
        </td>
      `;
      tbody.appendChild(tr);
    });

  } catch (err) {
    console.error(err);
    tbody.innerHTML = '<tr><td colspan="6">Error de conexión</td></tr>';
  }
}

function mostrarEditar(id, seccion, titulo) {
  document.getElementById('editar-id').value = id;
  document.getElementById('seccion-editar').value = seccion;
  document.getElementById('titulo-editar').value = titulo;
  document.getElementById('seccion-editar-form').style.display = 'block';
  document.getElementById('seccion-editar-form').scrollIntoView({ behavior: 'smooth' });
}

document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('form-editar').addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = document.getElementById('editar-id').value;
    const seccion = document.getElementById('seccion-editar').value;
    const titulo = document.getElementById('titulo-editar').value.trim();
    const archivoInput = document.getElementById('archivo-editar');

    const btn = e.target.querySelector('button[type="submit"]');
    btn.disabled = true;
    btn.textContent = 'Guardando...';

    try {
      const body = { seccion, titulo };

      if (archivoInput.files[0]) {
        body.pdfBase64 = await convertirBase64(archivoInput.files[0]);
      }

      const res = await apiFetch('/contenido/' + id, {
        method: 'PUT',
        body: JSON.stringify(body)
      });

      const data = await res.json();
      if (res.ok) {
        mostrarAlerta('Archivo actualizado correctamente', 'info');
        document.getElementById('seccion-editar-form').style.display = 'none';
        cargarArchivos();
      } else {
        mostrarAlerta(data.msg || 'Error al actualizar', 'error');
      }
    } catch (err) {
      console.error(err);
      mostrarAlerta('Error de conexión.', 'info');
    } finally {
      btn.disabled = false;
      btn.textContent = 'Guardar cambios';
    }
  });
});

async function eliminarArchivo(id) {
  if (!confirm('¿Estás seguro de eliminar este archivo?')) return;
  try {
    const res = await apiFetch('/contenido/' + id, { method: 'DELETE' });
    const data = await res.json();
    if (res.ok) {
      mostrarAlerta('Archivo eliminado', 'info');
      document.getElementById(`arch-${id}`)?.remove();
    } else {
      mostrarAlerta(data.msg || 'Error al eliminar', 'error');
    }
  } catch (err) {
    mostrarAlerta('Error de conexión.', 'info');
  }
}

function convertirBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function configurarLogout() {
  document.querySelectorAll('a').forEach(a => {
    if (a.textContent.trim() === 'Cerrar sesión') {
      a.href = '#';
      a.addEventListener('click', (e) => { e.preventDefault(); logout(); });
    }
  });
}