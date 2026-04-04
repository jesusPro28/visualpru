/**
 * registro-empleados.js — Registro / edición de empleados (RegistroEmpleadosPri.html)
 */
document.addEventListener('DOMContentLoaded', () => {
  protegerPagina();
  setFooterYear();
  configurarLogout();

  const form = document.querySelector('.registro-form');
  if (!form) return;

  form.removeAttribute('action');
  form.removeAttribute('method');

  const params = new URLSearchParams(window.location.search);
  const editarId = params.get('editar');

  if (editarId) {
    cargarEmpleadoParaEdicion(editarId);
    const titulo = document.querySelector('.registro-title');
    if (titulo) titulo.textContent = 'Editar Empleado';
    const pwField = document.getElementById('password');
    if (pwField) {
      pwField.required = false;
      pwField.placeholder = 'Dejar vacío para no cambiar';
    }
  }

  // ✅ Validación de CURP en tiempo real
  const curpInput = document.getElementById('Curp');
  if (curpInput) {
    let curpTimer = null;
    curpInput.addEventListener('input', () => {
      clearTimeout(curpTimer);
      const val = curpInput.value.trim().toUpperCase();
      curpInput.value = val;
      
      // Eliminar mensaje previo
      let msgEl = document.getElementById('curp-msg');
      if (!msgEl) {
        msgEl = document.createElement('span');
        msgEl.id = 'curp-msg';
        msgEl.style.cssText = 'display:block;font-size:12px;margin-top:4px;';
        curpInput.parentNode.appendChild(msgEl);
      }

      if (val.length === 0) {
        msgEl.textContent = '';
        curpInput.style.borderColor = '';
        return;
      }

      // Validar formato local
      const resultado = validarCURP(val);
      if (!resultado.valido) {
        msgEl.textContent = resultado.error;
        msgEl.style.color = '#dc3545';
        curpInput.style.borderColor = '#dc3545';
        return;
      }

      // Validar duplicado en servidor
      curpTimer = setTimeout(async () => {
        try {
          const excluir = editarId || '';
          const res = await apiFetch(`/empleados/validar-curp?curp=${val}&excluir=${excluir}`);
          if (res && res.ok) {
            const data = await res.json();
            if (data.valido) {
              msgEl.textContent = '✅ CURP válido';
              msgEl.style.color = '#28a745';
              curpInput.style.borderColor = '#28a745';
            } else {
              msgEl.textContent = '❌ ' + data.error;
              msgEl.style.color = '#dc3545';
              curpInput.style.borderColor = '#dc3545';
            }
          }
        } catch (e) {
          // Silenciar errores de red en validación en tiempo real
        }
      }, 500);
    });
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const numTrabajador = document.getElementById('Num_Trabajador').value.trim();
    const curp = document.getElementById('Curp').value.trim().toUpperCase();
    const nombre = document.getElementById('nombre').value.trim();
    const aPaterno = document.getElementById('apP').value.trim();
    const aMaterno = document.getElementById('apM').value.trim();
    const puesto = document.getElementById('Puesto').value;
    const departamento = document.getElementById('Departamento').value;
    const turno = document.getElementById('Turno').value;
    const password = document.getElementById('password') ? document.getElementById('password').value : '';
    const fotoInput = document.getElementById('foto');

    // ✅ Validaciones mejoradas
    if (!numTrabajador || !curp || !nombre || !aPaterno || !aMaterno) {
      mostrarAlerta('Completa todos los campos obligatorios.', 'warning');
      return;
    }

    if (!puesto) {
      mostrarAlerta('Selecciona un puesto.', 'warning');
      return;
    }

    if (!departamento) {
      mostrarAlerta('Selecciona un departamento.', 'warning');
      return;
    }

    // ✅ Validar CURP
    const curpResult = validarCURP(curp);
    if (!curpResult.valido) {
      mostrarAlerta(curpResult.error, 'error');
      document.getElementById('Curp').focus();
      return;
    }

    if (!editarId && password.length < 8) {
      mostrarAlerta('La contraseña debe tener al menos 8 caracteres.', 'warning');
      return;
    }
    if (editarId && password && password.length < 8) {
      mostrarAlerta('La contraseña debe tener al menos 8 caracteres.', 'warning');
      return;
    }

    const btnGuardar = form.querySelector('.registro-btn--guardar');
    btnGuardar.disabled = true;
    btnGuardar.textContent = 'Guardando...';

    try {
      let res;
      if (editarId) {
        const body = {
          curp, nombre, aPaterno, aMaterno, puesto, departamento, turno,
          lunesAm: document.getElementById('Lunes').value.trim(),
          lunesPm: document.getElementById('LunesPM').value.trim(),
          martesAm: document.getElementById('Martes').value.trim(),
          martesPm: document.getElementById('MartesPM').value.trim(),
          miercolesAm: document.getElementById('Miercoles').value.trim(),
          miercolesPm: document.getElementById('MiercolesPM').value.trim(),
          juevesAm: document.getElementById('Jueves').value.trim(),
          juevesPm: document.getElementById('JuevesPM').value.trim(),
          viernesAm: document.getElementById('Viernes').value.trim(),
          viernesPm: document.getElementById('ViernesPM').value.trim()
        };
        if (password) body.password = password;

        res = await apiFetch('/empleados/' + editarId, {
          method: 'PUT',
          body: JSON.stringify(body)
        });
      } else {
        const formData = new FormData();
        formData.append('numTrabajador', numTrabajador);
        formData.append('curp', curp);
        formData.append('nombre', nombre);
        formData.append('aPaterno', aPaterno);
        formData.append('aMaterno', aMaterno);
        formData.append('puesto', puesto);
        formData.append('departamento', departamento);
        formData.append('password', password);
        formData.append('turno', turno);
        formData.append('lunesAm', document.getElementById('Lunes').value.trim());
        formData.append('lunesPm', document.getElementById('LunesPM').value.trim());
        formData.append('martesAm', document.getElementById('Martes').value.trim());
        formData.append('martesPm', document.getElementById('MartesPM').value.trim());
        formData.append('miercolesAm', document.getElementById('Miercoles').value.trim());
        formData.append('miercolesPm', document.getElementById('MiercolesPM').value.trim());
        formData.append('juevesAm', document.getElementById('Jueves').value.trim());
        formData.append('juevesPm', document.getElementById('JuevesPM').value.trim());
        formData.append('viernesAm', document.getElementById('Viernes').value.trim());
        formData.append('viernesPm', document.getElementById('ViernesPM').value.trim());

        if (fotoInput && fotoInput.files && fotoInput.files[0]) {
          const file = fotoInput.files[0];
          const tiposPermitidos = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
          if (!tiposPermitidos.includes(file.type)) {
            mostrarAlerta('Tipo de imagen no permitido. Se aceptan: JPEG, PNG, WebP, GIF.', 'error');
            btnGuardar.disabled = false;
            btnGuardar.textContent = 'Guardar';
            return;
          }
          if (file.size > 5 * 1024 * 1024) {
            mostrarAlerta('La imagen excede el tamaño máximo de 5MB.', 'error');
            btnGuardar.disabled = false;
            btnGuardar.textContent = 'Guardar';
            return;
          }
          formData.append('foto', file);
        }

        res = await apiFetch('/empleados', {
          method: 'POST',
          body: formData
        });
      }

      if (!res) return;
      const data = await res.json();

      if (res.ok) {
        mostrarAlerta(data.msg || 'Operación exitosa.', 'success');
        if (!editarId) form.reset();
        setTimeout(() => { window.location.href = 'EmpleadosExistentesPri.html'; }, 1500);
      } else {
        mostrarAlerta(data.msg || 'Error al guardar.', 'error');
        // Resaltar campo con error si viene indicado
        if (data.campo) {
          const campoMap = { curp: 'Curp', numTrabajador: 'Num_Trabajador' };
          const el = document.getElementById(campoMap[data.campo] || data.campo);
          if (el) {
            el.style.borderColor = '#dc3545';
            el.focus();
          }
        }
      }
    } catch (err) {
      console.error('Error:', err);
      mostrarAlerta('Error de conexión con el servidor.', 'error');
    } finally {
      btnGuardar.disabled = false;
      btnGuardar.textContent = 'Guardar';
    }
  });

  const btnCancelar = form.querySelector('.registro-btn--cancelar');
  if (btnCancelar) {
    btnCancelar.onclick = () => { window.location.href = 'AdministradorPri.html'; };
  }
});

async function cargarEmpleadoParaEdicion(numTrabajador) {
  try {
    const res = await apiFetch('/empleados/' + numTrabajador);
    if (!res || !res.ok) { mostrarAlerta('Empleado no encontrado.', 'error'); return; }

    const emp = await res.json();

    document.getElementById('Num_Trabajador').value = emp['NUM-TRABAJADOR'] || '';
    document.getElementById('Num_Trabajador').readOnly = true;
    document.getElementById('Curp').value = emp.CURP || '';
    document.getElementById('nombre').value = emp.NOMBRE || '';
    document.getElementById('apP').value = emp['A-PATERNO'] || '';
    document.getElementById('apM').value = emp['A-MATERNO'] || '';

    const puestoSelect = document.getElementById('Puesto');
    if (emp.PUESTO) setSelectValue(puestoSelect, emp.PUESTO);

    const deptoSelect = document.getElementById('Departamento');
    if (emp.DEPARTAMENTO) setSelectValue(deptoSelect, emp.DEPARTAMENTO);

    const turnoSelect = document.getElementById('Turno');
    if (emp.TURNO) setSelectValue(turnoSelect, emp.TURNO);

    setValue('Lunes', emp['LUNES-am']);
    setValue('LunesPM', emp['LUNES-pm']);
    setValue('Martes', emp['MARTES-am']);
    setValue('MartesPM', emp['MARTES-pm']);
    setValue('Miercoles', emp['MIÉRCOLES-am']);
    setValue('MiercolesPM', emp['MIÉRCOLES-pm']);
    setValue('Jueves', emp['JUEVES-am']);
    setValue('JuevesPM', emp['JUEVES-pm']);
    setValue('Viernes', emp['VIERNES-am']);
    setValue('ViernesPM', emp['VIERNES-pm']);

  } catch (err) {
    console.error('Error cargando empleado:', err);
  }
}

function setValue(id, val) {
  const el = document.getElementById(id);
  if (el && val !== undefined && val !== null) el.value = val;
}

function setSelectValue(select, value) {
  for (let i = 0; i < select.options.length; i++) {
    if (select.options[i].value.toUpperCase() === value.toUpperCase()) {
      select.selectedIndex = i;
      return;
    }
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
