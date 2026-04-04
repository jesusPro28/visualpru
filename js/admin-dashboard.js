/**
 * admin-dashboard.js — Dashboard del administrador (AdministradorPri.html)
 */
document.addEventListener('DOMContentLoaded', () => {
  protegerPagina();
  setFooterYear();

  // Mostrar nombre del usuario
  const usuario = getUsuario();
  const h1 = document.querySelector('main h1');
  if (h1 && usuario) {
    h1.textContent = 'Bienvenido, ' + (usuario.nombre || usuario.usuario || 'Administrador');
  }

  // Configurar link de cerrar sesión
  document.querySelectorAll('a').forEach(a => {
    if (a.textContent.trim() === 'Cerrar sesión') {
      a.href = '#';
      a.addEventListener('click', (e) => {
        e.preventDefault();
        logout();
      });
    }
  });
});
