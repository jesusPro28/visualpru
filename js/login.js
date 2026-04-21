/**
 * login.js — Lógica de inicio de sesión (loguinPu.html)
 */
document.addEventListener('DOMContentLoaded', () => {
  setFooterYear();

  const form = document.querySelector('.login-form');
  if (!form) return;

  form.removeAttribute('action');
  form.removeAttribute('method');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const tipo     = document.getElementById('tipo').value;
    const usuario  = document.getElementById('usuario').value.trim();
    const password = document.getElementById('password').value;

    if (!tipo)                { mostrarAlerta('Selecciona un tipo de usuario.', 'warning'); return; }
    if (!usuario || !password){ mostrarAlerta('Ingresa usuario y contraseña.', 'warning'); return; }

    const btn = form.querySelector('.login-btn');
    btn.disabled    = true;
    btn.textContent = 'Ingresando...';

    try {
      let endpoint, body;

      if (tipo === 'Administrador') {
        endpoint = '/auth/login-admin';
        body = JSON.stringify({ usuario, password });
      } else {
        endpoint = '/auth/login-empleado';
        body = JSON.stringify({ numTrabajador: usuario, password });
      }

      const res = await apiFetch(endpoint, { method: 'POST', body });
      if (!res) return;

      const data = await res.json();

      if (!res.ok) {
        mostrarAlerta(data.msg || 'Credenciales incorrectas.', 'error');
        return;
      }

      // ── Validar que el tipo seleccionado coincida con el puesto real ──
      if (tipo !== 'Administrador') {
        const puestoReal       = (data.usuario?.puesto || '').toUpperCase().trim();
        const tipoSeleccionado = tipo.toUpperCase().trim();

        if (puestoReal !== tipoSeleccionado) {
          mostrarAlerta(
            'El tipo de usuario seleccionado no coincide con tu perfil. ' +
            'Selecciona "' + data.usuario.puesto + '".',
            'error'
          );
          return;
        }
      }
      // ─────────────────────────────────────────────────────────────────

      setToken(data.token);
      setUsuario(data.usuario);
      mostrarAlerta('¡Bienvenido! Redirigiendo...', 'success', 1500);

      setTimeout(() => {
        if (tipo === 'Administrador') {
          window.location.href = 'AdministradorPri.html';
        } else {
          window.location.href = 'PerfilEmpleadoPri.html';
        }
      }, 1000);

    } catch (err) {
      console.error('Error de conexión:', err);
      mostrarAlerta('No se pudo conectar con el servidor. Verifica tu conexión a internet.', 'error');
    } finally {
      btn.disabled    = false;
      btn.textContent = 'Ingresar';
    }
  });

  // ── Mostrar/ocultar contraseña ──
  window.togglePassword = function () {
    const passInput = document.getElementById('password');
    const icon      = document.getElementById('toggleIcon');
    if (passInput.type === 'password') {
      passInput.type = 'text';
      if (icon) icon.textContent = '🙈';
    } else {
      passInput.type = 'password';
      if (icon) icon.textContent = '👁';
    }
  };
});
