/**
 * reportes.js — Generación de reportes (ReportesPri.html)
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

  // Estado inicial — individual
  seleccionarTipo('individual');

  const form = document.getElementById('form-reporte');
  if (!form) return;

  form.removeAttribute('action');
  form.removeAttribute('method');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const tipo = document.getElementById('accion').value;
    const fechaInicio = document.getElementById('fechainicio').value;
    const fechaFin = document.getElementById('fechaFin').value;
    const numTrabajador = document.getElementById('Num_Trabajador').value.trim();

    if (!fechaInicio || !fechaFin) {
      alert('Selecciona el rango de fechas');
      return;
    }

    if (tipo === 'individual' && !numTrabajador) {
      alert('Ingresa el número de trabajador');
      return;
    }

    const btn = form.querySelector('button[type="submit"]');
    btn.disabled = true;
    btn.textContent = 'Generando...';

    try {
      let res, data;

      if (tipo === 'individual') {
        res = await apiFetch(`/reportes/individual?numTrabajador=${encodeURIComponent(numTrabajador)}&fechaInicio=${fechaInicio}&fechaFin=${fechaFin}`);
        data = await res.json();
        if (!res.ok) { alert(data.msg || 'Error al generar reporte'); return; }
        mostrarReporteIndividual(data, fechaInicio, fechaFin);
      } else {
        res = await apiFetch(`/reportes/general?fechaInicio=${fechaInicio}&fechaFin=${fechaFin}`);
        data = await res.json();
        if (!res.ok) { alert(data.msg || 'Error al generar reporte'); return; }
        mostrarReporteGeneral(data, fechaInicio, fechaFin);
      }

    } catch (err) {
      console.error('Error:', err);
      alert('Error de conexión con el servidor.');
    } finally {
      btn.disabled = false;
      btn.textContent = 'Generar reporte';
    }
  });
});

function mostrarReporteIndividual(data, fechaInicio, fechaFin) {
  const { empleado, asistencias, incidencias } = data;
  const nombreCompleto = `${empleado.NOMBRE} ${empleado['A-PATERNO']} ${empleado['A-MATERNO']}`;

  // ✅ Combinar asistencias, estados e incidencias por fecha
  const fechas = {};
  asistencias.forEach(a => {
    const f = a.FECHA?.substring(0, 10);
    if (!fechas[f]) fechas[f] = { fecha: f, entrada: '', salida: '', estatus: '', incidencias: [] };
    fechas[f].entrada = a.ENTRADA || '';
    fechas[f].salida = a.SALIDA || '';
    fechas[f].estatus = a.ESTATUS || '';
  });
  incidencias.forEach(i => {
    const f = i.FECHA?.substring(0, 10);
    if (!fechas[f]) fechas[f] = { fecha: f, entrada: '', salida: '', estatus: '', incidencias: [] };
    fechas[f].incidencias.push(i.DESCRIPCION);
  });

  const filas = Object.values(fechas).sort((a, b) => a.fecha.localeCompare(b.fecha));

  const html = `
    <div id="reporte-contenido" style="background:#fff;padding:20px;border-radius:8px;margin-top:20px;box-shadow:0 2px 8px rgba(0,0,0,0.1);">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:15px;">
        <h3 style="margin:0;color:#6b1a2a;">Reporte Individual</h3>
        <button onclick="descargarReporte()" style="background:#6b1a2a;color:#fff;border:none;padding:8px 16px;border-radius:4px;cursor:pointer;">
          ⬇ Descargar / Imprimir
        </button>
      </div>
      <div id="reporte-imprimible">
        <p><strong>Empleado:</strong> ${nombreCompleto}</p>
        <p><strong>Núm. Trabajador:</strong> ${empleado['NUM-TRABAJADOR']}</p>
        <p><strong>Puesto:</strong> ${empleado.PUESTO} — <strong>Departamento:</strong> ${empleado.DEPARTAMENTO}</p>
        <p><strong>Periodo:</strong> ${fechaInicio} al ${fechaFin}</p>

        <table style="width:100%;border-collapse:collapse;margin-top:15px;">
          <thead>
            <tr style="background:#6b1a2a;color:#fff;">
              <th style="padding:8px;border:1px solid #ddd;">Fecha</th>
              <th style="padding:8px;border:1px solid #ddd;">Entrada</th>
              <th style="padding:8px;border:1px solid #ddd;">Salida</th>
              <th style="padding:8px;border:1px solid #ddd;">Estado</th>
              <th style="padding:8px;border:1px solid #ddd;">Incidencias</th>
            </tr>
          </thead>
          <tbody>
            ${filas.length === 0
              ? '<tr><td colspan="5" style="text-align:center;padding:15px;">Sin registros en este periodo</td></tr>'
              : filas.map(f => `
                <tr style="background:${f.estatus === 'RETARDO' ? '#fff3cd' : f.estatus === 'FALTA' ? '#f8d7da' : '#fff'}">
                  <td style="padding:8px;border:1px solid #ddd;">${f.fecha}</td>
                  <td style="padding:8px;border:1px solid #ddd;">${f.entrada}</td>
                  <td style="padding:8px;border:1px solid #ddd;">${f.salida}</td>
                  <td style="padding:8px;border:1px solid #ddd;font-weight:bold;color:${f.estatus === 'RETARDO' ? '#856404' : f.estatus === 'FALTA' ? '#721c24' : '#155724'}">${f.estatus || '—'}</td>
                  <td style="padding:8px;border:1px solid #ddd;">${f.incidencias.join(', ') || '—'}</td>
                </tr>`).join('')}
          </tbody>
        </table>

        <p style="margin-top:10px;">
          <strong>Total asistencias:</strong> ${asistencias.length} |
          <strong>Total incidencias:</strong> ${incidencias.length} |
          <strong>Retardos:</strong> ${filas.filter(f => f.estatus === 'RETARDO').length}
        </p>
      </div>
    </div>
  `;

  mostrarResultado(html);
}

function mostrarReporteGeneral(data, fechaInicio, fechaFin) {
  const { asistencias, incidencias } = data;

  // ✅ Agrupar incidencias por trabajador y fecha
  const incMap = {};
  incidencias.forEach(i => {
    const key = `${i['NUM-TRABAJADOR']}_${i.FECHA?.substring(0, 10)}`;
    if (!incMap[key]) incMap[key] = [];
    incMap[key].push(i.DESCRIPCION);
  });

  const html = `
    <div id="reporte-contenido" style="background:#fff;padding:20px;border-radius:8px;margin-top:20px;box-shadow:0 2px 8px rgba(0,0,0,0.1);">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:15px;">
        <h3 style="margin:0;color:#6b1a2a;">Reporte General</h3>
        <button onclick="descargarReporte()" style="background:#6b1a2a;color:#fff;border:none;padding:8px 16px;border-radius:4px;cursor:pointer;">
          ⬇ Descargar / Imprimir
        </button>
      </div>
      <div id="reporte-imprimible">
        <p><strong>Periodo:</strong> ${fechaInicio} al ${fechaFin}</p>

        <table style="width:100%;border-collapse:collapse;margin-top:15px;">
          <thead>
            <tr style="background:#6b1a2a;color:#fff;">
              <th style="padding:8px;border:1px solid #ddd;">Núm. Trab.</th>
              <th style="padding:8px;border:1px solid #ddd;">Nombre</th>
              <th style="padding:8px;border:1px solid #ddd;">Fecha</th>
              <th style="padding:8px;border:1px solid #ddd;">Entrada</th>
              <th style="padding:8px;border:1px solid #ddd;">Salida</th>
              <th style="padding:8px;border:1px solid #ddd;">Estado</th>
              <th style="padding:8px;border:1px solid #ddd;">Incidencias</th>
            </tr>
          </thead>
          <tbody>
            ${asistencias.length === 0
              ? '<tr><td colspan="7" style="text-align:center;padding:15px;">Sin registros en este periodo</td></tr>'
              : asistencias.map(a => {
                  const fecha = a.FECHA?.substring(0, 10);
                  const key = `${a['NUM-TRABAJADOR']}_${fecha}`;
                  const incs = incMap[key] ? incMap[key].join(', ') : '—';
                  return `
                    <tr style="background:${a.ESTATUS === 'RETARDO' ? '#fff3cd' : a.ESTATUS === 'FALTA' ? '#f8d7da' : '#fff'}">
                      <td style="padding:8px;border:1px solid #ddd;">${a['NUM-TRABAJADOR']}</td>
                      <td style="padding:8px;border:1px solid #ddd;">${a.nombre_completo || ''}</td>
                      <td style="padding:8px;border:1px solid #ddd;">${fecha}</td>
                      <td style="padding:8px;border:1px solid #ddd;">${a.ENTRADA || ''}</td>
                      <td style="padding:8px;border:1px solid #ddd;">${a.SALIDA || ''}</td>
                      <td style="padding:8px;border:1px solid #ddd;font-weight:bold;color:${a.ESTATUS === 'RETARDO' ? '#856404' : a.ESTATUS === 'FALTA' ? '#721c24' : '#155724'}">${a.ESTATUS || '—'}</td>
                      <td style="padding:8px;border:1px solid #ddd;">${incs}</td>
                    </tr>`;
                }).join('')}
          </tbody>
        </table>
        <p style="margin-top:10px;"><strong>Total registros:</strong> ${asistencias.length}</p>
      </div>
    </div>
  `;

  mostrarResultado(html);
}

function mostrarResultado(html) {
  let contenedor = document.getElementById('resultado-reporte');
  if (!contenedor) {
    contenedor = document.createElement('div');
    contenedor.id = 'resultado-reporte';
    document.querySelector('main').appendChild(contenedor);
  }
  contenedor.innerHTML = html;
  contenedor.scrollIntoView({ behavior: 'smooth' });
}

// ✅ Descargar / Imprimir reporte
function descargarReporte() {
  const contenido = document.getElementById('reporte-imprimible').innerHTML;
  const ventana = window.open('', '_blank');
  ventana.document.write(`
    <html>
      <head>
        <title>Reporte UTHH</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 20px; }
          table { width: 100%; border-collapse: collapse; }
          th, td { border: 1px solid #ddd; padding: 8px; text-align: left; font-size: 12px; }
          th { background: #6b1a2a; color: white; }
          p { margin: 5px 0; font-size: 13px; }
          @media print { button { display: none; } }
        </style>
      </head>
      <body>
        <h2 style="color:#6b1a2a;text-align:center;">UTHH - Sistema de Gestión de Empleados</h2>
        ${contenido}
        <br>
        <button onclick="window.print()" style="background:#6b1a2a;color:#fff;border:none;padding:8px 16px;border-radius:4px;cursor:pointer;">
          Imprimir
        </button>
      </body>
    </html>
  `);
  ventana.document.close();
}

// ✅ Controlar tipo de reporte
function seleccionarTipo(tipo) {
  const grupoTrabajador = document.getElementById('grupo-trabajador');
  const inputTrabajador = document.getElementById('Num_Trabajador');
  const accionInput = document.getElementById('accion');
  const btnIndividual = document.getElementById('btn-individual');
  const btnGeneral = document.getElementById('btn-general');

  if (tipo === 'individual') {
    grupoTrabajador.style.display = 'block';
    inputTrabajador.required = true;
    accionInput.value = 'individual';
    btnIndividual.classList.add('activo');
    btnGeneral.classList.remove('activo');
  } else {
    grupoTrabajador.style.display = 'none';
    inputTrabajador.required = false;
    inputTrabajador.value = '';
    accionInput.value = 'general';
    btnGeneral.classList.add('activo');
    btnIndividual.classList.remove('activo');
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