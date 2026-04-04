/**
 * index.js — Página principal pública (index.html)
 * Carga noticias desde la API (tabla publicaciones)
 */
document.addEventListener('DOMContentLoaded', () => {
  setFooterYear();
  cargarNoticias();
});

async function cargarNoticias() {
  const container = document.querySelector('.news-container');
  if (!container) return;

  try {
    const res = await apiFetch('/publicaciones');
    if (!res || !res.ok) return;

    const noticias = await res.json();
    if (noticias.length === 0) return;

    container.innerHTML = '';

    noticias.forEach(noticia => {
      const fecha = noticia.fecha ? new Date(noticia.fecha).toLocaleDateString('es-MX') : '';

      const imgHtml = noticia.tiene_imagen
        ? `<img src="${API_BASE_URL}/publicaciones/${noticia.id}/imagen" alt="${noticia.titulo || 'Noticia'}" class="news-image" onerror="this.style.display='none'">`
        : `<img src="../img/noticia1.jpg" alt="Noticia" class="news-image" onerror="this.style.display='none'">`;

      const article = document.createElement('article');
      article.className = 'news-card';
      article.innerHTML = `
        ${imgHtml}
        <div class="news-content">
          <span class="news-date">${fecha}</span>
          <h2 class="news-title">${noticia.titulo || ''}</h2>
          <p class="news-text">${(noticia.contenido || '').substring(0, 200)}${(noticia.contenido || '').length > 200 ? '...' : ''}</p>
          <div class="news-footer">
            <a href="#" class="read-more" data-id="${noticia.id || ''}">Leer más →</a>
          </div>
        </div>
      `;

      // ✅ Ver más abre modal con detalle completo
      article.querySelector('.read-more').addEventListener('click', (e) => {
        e.preventDefault();
        verDetalle(noticia);
      });

      container.appendChild(article);
    });

  } catch (err) {
    console.error('Error cargando noticias:', err);
  }
}

// ✅ Modal con detalle completo de la noticia
function verDetalle(noticia) {
  const fecha = noticia.fecha ? new Date(noticia.fecha).toLocaleDateString('es-MX') : '';

  const modal = document.createElement('div');
  modal.style.cssText = `
    position:fixed;top:0;left:0;width:100%;height:100%;
    background:rgba(0,0,0,0.7);z-index:9999;display:flex;
    align-items:center;justify-content:center;padding:20px;
    box-sizing:border-box;
  `;

  modal.innerHTML = `
    <div style="background:#fff;max-width:800px;width:100%;border-radius:8px;
                overflow-y:auto;max-height:90vh;padding:30px;position:relative;">
      <button onclick="this.closest('div').parentElement.remove()"
              style="position:absolute;top:10px;right:15px;background:none;
                     border:none;font-size:24px;cursor:pointer;line-height:1;">✕</button>
      ${noticia.tiene_imagen
        ? `<img src="${API_BASE_URL}/publicaciones/${noticia.id}/imagen"
               style="width:100%;max-height:400px;object-fit:cover;
                      border-radius:6px;margin-bottom:15px;"
               onerror="this.style.display='none'">`
        : ''}
      <span style="color:#888;font-size:14px;">${fecha}</span>
      <h2 style="margin:10px 0;color:#6b1a2a;">${noticia.titulo || ''}</h2>
      <p style="line-height:1.8;color:#333;">${noticia.contenido || ''}</p>
    </div>
  `;

  document.body.appendChild(modal);

  // Cerrar al hacer clic fuera
  modal.addEventListener('click', (e) => {
    if (e.target === modal) modal.remove();
  });
}