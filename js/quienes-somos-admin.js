/**
 * quienes-somos-admin.js — Editar contenido de páginas
 */
document.addEventListener('DOMContentLoaded', () => {
  protegerPagina();
  setFooterYear();
  configurarLogout();
  cargarContenidos();
});

async function cargarContenidos() {
  try {
    // ✅ Cargar ambas páginas
    const [resFilosofia, resPerfil] = await Promise.all([
      apiFetch('/contenido-paginas/Filosofia'),
      apiFetch('/contenido-paginas/Perfil')
    ]);

    if (resFilosofia && resFilosofia.ok) {
      const data = await resFilosofia.json();
      document.getElementById('titulo-filosofia').value = data.titulo || '';
      document.getElementById('contenido-filosofia').value = data.contenido || '';
    }

    if (resPerfil && resPerfil.ok) {
      const data = await resPerfil.json();
      document.getElementById('titulo-perfil').value = data.titulo || '';
      document.getElementById('contenido-perfil').value = data.contenido || '';
    }

  } catch (err) {
    console.error('Error cargando contenidos:', err);
  }
}

async function guardar(pagina, tituloId, contenidoId, btnId) {
  const titulo = document.getElementById(tituloId).value.trim();
  const contenido = document.getElementById(contenidoId).value.trim();
  const btn = document.getElementById(btnId);

  if (!contenido) { mostrarAlerta('El contenido no puede estar vacío', 'info'); return; }

  btn.disabled = true;
  btn.textContent = 'Guardando...';

  try {
    const res = await apiFetch('/contenido-paginas/' + pagina, {
      method: 'PUT',
      body: JSON.stringify({ titulo, contenido })
    });

    const data = await res.json();
    alert(res.ok ? 'Actualizado correctamente' : (data.msg || 'Error al actualizar'));

  } catch (err) {
    console.error('Error:', err);
    mostrarAlerta('Error de conexión.', 'info');
  } finally {
    btn.disabled = false;
    btn.textContent = 'Actualizar';
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