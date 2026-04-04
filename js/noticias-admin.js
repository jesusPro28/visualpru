/**
 * noticias-admin.js — Agregar publicaciones (NoticiasPri.html)
 */
document.addEventListener('DOMContentLoaded', () => {
  protegerPagina();
  setFooterYear();
  configurarLogout();

  function configurarLogout() {
  document.querySelectorAll('a').forEach(a => {
    if (a.textContent.trim() === 'Cerrar sesión') {
      a.href = '#';
      a.addEventListener('click', (e) => { e.preventDefault(); logout(); });
    }
  });
}

  const form = document.getElementById('publicacion-form');
  if (!form) return;

  form.removeAttribute('method');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const titulo = document.getElementById('titulo').value.trim();
    const contenido = document.getElementById('contenido').value.trim();
    const fecha = document.getElementById('fecha').value;
    const imagenInput = document.getElementById('imagen');

    if (!titulo || !contenido || !fecha) {
      mostrarAlerta('Completa todos los campos obligatorios', 'info');
      return;
    }

    const btnSubmit = form.querySelector('button[type="submit"]');
    btnSubmit.disabled = true;
    btnSubmit.textContent = 'Guardando...';

    try {
      let imagenBase64 = null;
      let nombreImagen = null;

      if (imagenInput.files && imagenInput.files[0]) {
        const file = imagenInput.files[0];
        if (file.size > 5 * 1024 * 1024) {
          mostrarAlerta('La imagen no debe superar 5MB', 'info');
          return;
        }
        imagenBase64 = await convertirBase64(file);
        nombreImagen = file.name;
      }

      const body = { titulo, contenido, fecha };
      if (imagenBase64) {
        body.imagen = imagenBase64;
        body.nombreImagen = nombreImagen;
      }

      const res = await apiFetch('/publicaciones', {
        method: 'POST',
        body: JSON.stringify(body)
      });

      const data = await res.json();

      if (res.ok) {
        mostrarAlerta('Publicación guardada correctamente', 'info');
        // ✅ Redirigir al listado
        window.location.href = 'LitadoNotPri.html';
      } else {
        mostrarAlerta(data.msg || 'Error al guardar publicación', 'error');
      }

    } catch (err) {
      console.error('Error:', err);
      mostrarAlerta('Error de conexión con el servidor.', 'info');
    } finally {
      btnSubmit.disabled = false;
      btnSubmit.textContent = 'Guardar publicación';
    }
  });
});

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