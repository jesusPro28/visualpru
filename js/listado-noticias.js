/**
 * listado-noticias.js — Listado de publicaciones (LitadoNotPri.html)
 */
document.addEventListener('DOMContentLoaded', () => {
  protegerPagina();
  setFooterYear();
  configurarLogout();
  cargarPublicaciones();
});

function configurarLogout() {
  document.querySelectorAll('a').forEach(a => {
    if (a.textContent.trim() === 'Cerrar sesión') {
      a.href = '#';
      a.addEventListener('click', (e) => { e.preventDefault(); logout(); });
    }
  });
}

async function cargarPublicaciones() {
  const container = document.getElementById('lista-publicaciones');
  if (!container) return;

  container.innerHTML = '<p>Cargando publicaciones...</p>';

  try {
    const res = await apiFetch('/publicaciones');
    if (!res || !res.ok) {
      container.innerHTML = '<p>Error al cargar publicaciones.</p>';
      return;
    }

    const publicaciones = await res.json();

    if (publicaciones.length === 0) {
      container.innerHTML = '<p>No hay publicaciones registradas. <a href="NoticiasPri.html">Agregar nueva</a></p>';
      return;
    }

    container.innerHTML = '';

    publicaciones.forEach(pub => {
      const fecha = pub.fecha ? new Date(pub.fecha).toLocaleDateString('es-MX') : '';
      const resumen = (pub.contenido || '').substring(0, 150) + ((pub.contenido || '').length > 150 ? '...' : '');
      const imgSrc = pub.tiene_imagen ? `${API_BASE_URL}/publicaciones/${pub.id}/imagen` : '../img/noticia1.jpg';

      const card = document.createElement('div');
      card.className = 'noticia-card';
      card.id = `pub-${pub.id}`;
      card.innerHTML = `
        <div class="noticia-preview">
          <img src="${imgSrc}" alt="Imagen noticia" class="noticia-imagen"
               style="width:150px;height:100px;object-fit:cover;border-radius:6px;flex-shrink:0;"
               onerror="this.src='../img/noticia1.jpg'">
          <div class="noticia-info">
            <h3>${pub.titulo || ''}</h3>
            <p class="noticia-fecha">${fecha}</p>
            <p class="noticia-resumen">${resumen}</p>
          </div>
        </div>

        <details class="noticia-editar">
          <summary>Editar publicación</summary>

          <form class="form-editar" data-id="${pub.id}">
            <fieldset class="registro-fieldset">
              <legend class="registro-legend">Editar publicación</legend>
              
              <div class="registro-group">
                <label class="registro-label">Título</label>
                <input class="registro-input" type="text" name="titulo" value="${pub.titulo || ''}" required>
              </div>

              <div class="registro-group">
                <label class="registro-label">Contenido</label>
                <textarea class="registro-input" name="contenido" rows="6" required>${pub.contenido || ''}</textarea>
              </div>

              <div class="registro-group">
                <label class="registro-label">Fecha</label>
                <input class="registro-input" type="date" name="fecha" value="${pub.fecha ? pub.fecha.substring(0, 10) : ''}">
              </div>

              <div class="registro-group">
                <label class="registro-label">Cambiar imagen</label>
                <input class="registro-input" type="file" name="imagen" accept="image/*">
              </div>

              <div class="form-buttons">
                <button type="button" class="registro-btn registro-btn--cancelar" onclick="this.closest('details').removeAttribute('open')">Cancelar</button>
                <button type="submit" class="registro-btn registro-btn--guardar">Actualizar</button>
              </div>
            </fieldset>
          </form>

          <button class="btn-eliminar" data-id="${pub.id}" data-titulo="${(pub.titulo || '').replace(/"/g, '&quot;')}">Eliminar publicación</button>
        </details>
      `;

      container.appendChild(card);
    });

    container.querySelectorAll('.form-editar').forEach(form => {
      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        await editarPublicacion(form);
      });
    });

    // ✅ Confirmación mejorada antes de eliminar
    container.querySelectorAll('.btn-eliminar').forEach(btn => {
      btn.addEventListener('click', async () => {
        const confirmado = await confirmarAccion(
          `¿Estás seguro de eliminar la publicación "<strong>${btn.dataset.titulo || ''}</strong>"?<br><small>Esta acción no se puede deshacer.</small>`,
          '⚠️ Eliminar Publicación'
        );
        if (confirmado) {
          await eliminarPublicacion(btn.dataset.id);
        }
      });
    });

  } catch (err) {
    console.error('Error:', err);
    container.innerHTML = '<p>Error de conexión.</p>';
  }
}

async function editarPublicacion(form) {
  const id = form.dataset.id;
  const titulo = form.querySelector('[name="titulo"]').value.trim();
  const contenido = form.querySelector('[name="contenido"]').value.trim();
  const fecha = form.querySelector('[name="fecha"]').value;
  const imagenInput = form.querySelector('[name="imagen"]');

  if (!titulo || !contenido) {
    mostrarAlerta('Título y contenido son obligatorios.', 'warning');
    return;
  }

  const btn = form.querySelector('.btn-editar');
  btn.disabled = true;
  btn.textContent = 'Actualizando...';

  try {
    const body = { titulo, contenido, fecha };

    if (imagenInput.files && imagenInput.files[0]) {
      const file = imagenInput.files[0];
      // ✅ Validar tipo de archivo
      if (!file.type.startsWith('image/')) {
        mostrarAlerta('Solo se permiten archivos de imagen.', 'error');
        return;
      }
      if (file.size > 10 * 1024 * 1024) {
        mostrarAlerta('La imagen no debe superar 10MB.', 'error');
        return;
      }
      body.imagen = await convertirBase64(file);
      body.nombreImagen = file.name;
    }

    const res = await apiFetch('/publicaciones/' + id, {
      method: 'PUT',
      body: JSON.stringify(body)
    });

    if (!res) return;
    const data = await res.json();

    if (res.ok) {
      mostrarAlerta('Publicación actualizada correctamente.', 'success');
      cargarPublicaciones();
    } else {
      mostrarAlerta(data.msg || 'Error al actualizar.', 'error');
    }
  } catch (err) {
    console.error('Error:', err);
    mostrarAlerta('Error de conexión.', 'error');
  } finally {
    btn.disabled = false;
    btn.textContent = 'Actualizar';
  }
}

async function eliminarPublicacion(id) {
  try {
    const res = await apiFetch('/publicaciones/' + id, { method: 'DELETE' });
    if (!res) return;
    const data = await res.json();

    if (res.ok) {
      mostrarAlerta('Publicación eliminada correctamente.', 'success');
      document.getElementById(`pub-${id}`)?.remove();
    } else {
      mostrarAlerta(data.msg || 'Error al eliminar.', 'error');
    }
  } catch (err) {
    console.error('Error:', err);
    mostrarAlerta('Error de conexión.', 'error');
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
