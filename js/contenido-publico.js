/**
 * contenido-publico.js — Carga contenido dinámico para páginas públicas
 * Usado en: quienesSomosPu.html, perfilAcademicoPu.html, directorioPu.html, serviciosAcademicosPu.html
 */
document.addEventListener('DOMContentLoaded', () => {
  setFooterYear();

  const filename = window.location.pathname.split('/').pop();

  if (filename.includes('quienesSomos')) {
    cargarContenidoPagina('Filosofia');
  } else if (filename.includes('perfilAcademico')) {
    cargarContenidoPagina('Perfil');
  } else if (filename.includes('directorio')) {
    cargarContenidoArchivo('directorio');
  } else if (filename.includes('serviciosAcademicos')) {
    cargarContenidoArchivo('servicio');
  }
});

async function cargarContenidoPagina(pagina) {
  try {
    const res = await apiFetch('/contenido-paginas/' + pagina);
    if (!res || !res.ok) return;

    const data = await res.json();

    const h1 = document.querySelector('main h1, h1');
    const contenido = document.querySelector('.contenido');

    if (h1 && data.titulo) h1.textContent = data.titulo;
    if (contenido && data.contenido) {
      const parrafos = data.contenido
        .split('\n')
        .filter(p => p.trim())
        .map(p => `<p style="margin-bottom:12px;line-height:1.7;">${p.trim()}</p>`)
        .join('');
      contenido.innerHTML = parrafos || data.contenido;
    }

  } catch (err) {
    console.error('Error cargando contenido de página:', err);
  }
}

async function cargarContenidoArchivo(seccion) {
  try {
    const res = await apiFetch('/contenido?seccion=' + seccion);
    if (!res || !res.ok) return;

    const archivos = await res.json();
    if (archivos.length === 0) return;

    const newsSection = document.querySelector('.news-section, .servicios, main');
    if (!newsSection) return;

    const h1 = newsSection.querySelector('h1');
    newsSection.innerHTML = '';
    if (h1) newsSection.appendChild(h1);

    // ✅ PDF desde la BD con tamaño uniforme
    archivos.forEach(archivo => {
      const article = document.createElement('article');
      article.style.cssText = 'margin-bottom:30px;width:100%;';
      article.innerHTML = `
        <h3 style="margin-bottom:10px;">${archivo.titulo || 'Documento'}</h3>
        <iframe 
          src="${API_BASE_URL}/contenido/${archivo.id}/pdf"
          style="width:100%;height:600px;border:1px solid #ccc;border-radius:6px;"
          title="${archivo.titulo || 'Documento'}">
        </iframe>
      `;
      newsSection.appendChild(article);
    });

  } catch (err) {
    console.error('Error cargando contenido por sección:', err);
  }
}