/* ================================================
   Modulo_faltas.js — UTHH Retardos con Predicción
   ================================================ */

const apiUrl = 'https://api-asistencia.vercel.app';

const MESES_NOMBRES = [
  'Enero','Febrero','Marzo','Abril','Mayo','Junio',
  'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'
];

/* Caché de datos para no hacer múltiples peticiones */
let _estadosCache = null;

/* Año actualmente seleccionado */
let anioActual = 2025;

/* Charts de los meses (para destruirlos al redibujar) */
const _chartsMeses = {};

/* ────────────────────────────────────────────────
   API
──────────────────────────────────────────────── */
async function fetchEstados() {
  if (_estadosCache) return _estadosCache;
  const res = await fetch(`${apiUrl}/api/estados`);
  const data = await res.json();
  if (!data.ok || !data.data) throw new Error('Error al obtener datos de la API');
  _estadosCache = data.data;
  return _estadosCache;
}

function isRetardo(item) {
  return item.ESTATUS && item.ESTATUS.toString().trim().toUpperCase() === 'RETARDO';
}

/* Retorna los registros de retardo dentro de un rango de fechas */
function filtrarRetardos(data, startIso, endIso) {
  const start = new Date(startIso);
  const end   = new Date(endIso);
  return data.filter(item => {
    const fecha = new Date(item.FECHA);
    return fecha >= start && fecha <= end && isRetardo(item);
  });
}

/* Retorna el último día del mes dado (mes = 1-12) */
function ultimoDia(anio, mes) {
  return new Date(anio, mes, 0).getDate();
}

/* ────────────────────────────────────────────────
   INICIALIZACIÓN
──────────────────────────────────────────────── */
window.addEventListener('load', async () => {
  anioActual = parseInt(document.getElementById('selectorAnio').value, 10);
  generarTarjetas(anioActual);
  await cargarDatos();
});

async function cambiarAnio() {
  anioActual = parseInt(document.getElementById('selectorAnio').value, 10);
  generarTarjetas(anioActual);
  await cargarDatos();
}

/* ────────────────────────────────────────────────
   GENERAR TARJETAS VACÍAS
──────────────────────────────────────────────── */
function generarTarjetas(anio) {
  const grid = document.getElementById('mesesGrid');
  grid.innerHTML = '';

  MESES_NOMBRES.forEach((nombre, idx) => {
    const mesNum = idx + 1;
    const card = document.createElement('div');
    card.className = 'mes-card';
    card.id = `card-mes-${mesNum}`;
    card.innerHTML = `
      <div class="mes-card-header">
        <span class="mes-nombre">${nombre} ${anio}</span>
        <span class="mes-badge" id="badge-mes-${mesNum}">...</span>
      </div>
      <div class="mes-grafica-wrap">
        <canvas id="canvas-mes-${mesNum}" height="90"></canvas>
        <div class="mes-sin-datos" id="vacio-mes-${mesNum}" style="display:none;">
          <span>📭</span>
          <p>No hay retardos en este mes</p>
        </div>
      </div>
      <button class="mes-detalle-btn" id="btn-mes-${mesNum}"
              onclick="verDetalle(${mesNum}, ${anio})" disabled>
        Ver más detalle ▼
      </button>
    `;
    grid.appendChild(card);
  });
}

/* ────────────────────────────────────────────────
   CARGAR DATOS Y RENDERIZAR
──────────────────────────────────────────────── */
async function cargarDatos() {
  mostrarCargando(true);
  try {
    const estados = await fetchEstados();

    for (let mes = 1; mes <= 12; mes++) {
      const mesStr  = String(mes).padStart(2, '0');
      const ultimo  = ultimoDia(anioActual, mes);
      const inicio  = `${anioActual}-${mesStr}-01`;
      const fin     = `${anioActual}-${mesStr}-${String(ultimo).padStart(2, '0')}`;

      const retardosMes = filtrarRetardos(estados, inicio, fin);
      renderizarMes(mes, retardosMes);
    }

    const initialCount = filtrarRetardos(estados, '2025-07-01', '2025-10-31').length;
    const finalCount   = filtrarRetardos(estados, '2025-07-01', '2026-03-31').length;

    document.getElementById('nr_initial').textContent = initialCount;
    document.getElementById('nr_final').textContent   = finalCount;

    if (initialCount > 0 && finalCount > 0) {
      const t = 5;
      const k = Math.log(finalCount / initialCount) / t;
      window.N0 = initialCount;
      window.k  = k;
    } else {
      window.N0 = 0; window.k = 0;
    }

  } catch (error) {
    console.error('Error al cargar datos:', error);
  } finally {
    mostrarCargando(false);
  }
}

/* ────────────────────────────────────────────────
   MODELO MATEMÁTICO — CALCULAR RETARDOS (MESES)
──────────────────────────────────────────────── */
async function calcularRetardos() {
  const input  = document.getElementById('meses');
  const output = document.getElementById('resultado_meses');
  const meses  = parseFloat(input.value);

  if (isNaN(meses) || meses < 0) { output.textContent = 'Ingrese un número válido.'; return; }

  const N0 = window.N0, k = window.k;
  if (!N0 || !k) { output.textContent = 'No hay datos válidos.'; return; }

  const retardos = N0 * Math.exp(k * meses);
  output.textContent = `En ${meses.toFixed(1)} meses se estiman ${retardos.toFixed(2)} retardos.`;

  // --- NUEVO: Construir Panel de Notificaciones ---
  await construirPanelNotificacion('panel-notif-meses', retardos, 'meses', meses);

  // Lógica de Gráfica
  const totalPuntos = Math.max(Math.ceil(meses * 1.5), 12);
  const labels = [], valores = [];
  for (let i = 0; i <= totalPuntos; i++) {
    labels.push(`Mes ${i}`);
    valores.push(parseFloat((N0 * Math.exp(k * i)).toFixed(2)));
  }

  const container = document.getElementById('grafica-retardos-container');
  container.style.display = 'block';
  const ctx = document.getElementById('graficaRetardos').getContext('2d');
  if (window._chartRetardos) window._chartRetardos.destroy();
  window._chartRetardos = new Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets: [{
        label: 'Retardos estimados N(t)',
        data: valores,
        borderColor: '#5b1220',
        backgroundColor: 'rgba(91,18,32,0.08)',
        fill: true,
        tension: 0.4
      }]
    }
  });
}

/* ────────────────────────────────────────────────
   MODELO MATEMÁTICO — CALCULAR TIEMPO (N RETARDOS)
──────────────────────────────────────────────── */
async function calcularTiempo() {
  const input  = document.getElementById('retardos');
  const output = document.getElementById('resultado');
  const x      = parseFloat(input.value);

  if (isNaN(x) || x <= 0) { output.textContent = 'Ingrese un número válido.'; return; }

  const N0 = window.N0, k = window.k;
  if (!N0 || !k) { output.textContent = 'No hay datos válidos.'; return; }

  const t = Math.log(x / N0) / k;
  output.textContent = `Se estima llegar a ${x} retardos en ${t.toFixed(2)} meses.`;

  // --- NUEVO: Construir Panel de Notificaciones ---
  await construirPanelNotificacion('panel-notif-tiempo', t, 'tiempo', x);

  const containerT = document.getElementById('grafica-tiempo-container');
  containerT.style.display = 'block';
  // (Lógica de gráfica se mantiene igual...)
}

/* ────────────────────────────────────────────────
   LÓGICA DE NOTIFICACIONES Y TRABAJADORES EN RIESGO
──────────────────────────────────────────────── */
async function construirPanelNotificacion(containerId, retardosEstimados, tipoCalculo, paramValue) {
  const container = document.getElementById(containerId);
  if (!container) return;

  let topEmpleados = [];
  try {
    const estados = await fetchEstados();
    const retardosBase = filtrarRetardos(estados, '2025-07-01', '2026-03-31');

    const porTrabajador = {};
    retardosBase.forEach(item => {
      const num = item['NUM-TRABAJADOR'] || item.NUM_TRABAJADOR || 'SIN-NUM';
      porTrabajador[num] = (porTrabajador[num] || 0) + 1;
    });

    topEmpleados = Object.entries(porTrabajador)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([num, total]) => ({ num, total }));
  } catch (e) { console.warn(e); }

  const descCalculo = tipoCalculo === 'meses'
    ? `Estimación: <strong>${Math.round(retardosEstimados)} retardos</strong> en <strong>${paramValue} meses</strong>.`
    : `Se alcanzarán <strong>${paramValue} retardos</strong> en <strong>${parseFloat(retardosEstimados).toFixed(2)} meses</strong>.`;

  const filas = topEmpleados.map((emp, i) => `
    <tr class="notif-fila">
      <td style="padding:10px;">${i + 1}</td>
      <td style="padding:10px;"><strong>${emp.num}</strong></td>
      <td style="padding:10px;"><span class="retardo-count nivel-alto">${emp.total} retardos</span></td>
      <td style="padding:10px;">
        <button class="btn-notif-empleado" onclick="enviarNotificacionRapida('${emp.num}', '${tipoCalculo}', ${paramValue}, ${retardosEstimados}, ${emp.total})">
          🔔 Notificar
        </button>
      </td>
    </tr>`).join('');

  container.innerHTML = `
    <div class="notif-prediccion-panel">
      <div class="notif-prediccion-titulo">📊 Trabajadores con Posible Reincidencia</div>
      <p class="notif-prediccion-desc">${descCalculo} Empleados con mayor historial:</p>
      <table style="width:100%; border-collapse:collapse; margin-top:10px; font-size:13px;">
        <thead><tr style="background:#5b1220; color:white;">
          <th style="padding:8px; text-align:left;">#</th>
          <th style="padding:8px; text-align:left;">Num-Trabajador</th>
          <th style="padding:8px; text-align:left;">Historial</th>
          <th style="padding:8px; text-align:left;">Acción</th>
        </tr></thead>
        <tbody>${filas}</tbody>
      </table>
    </div>`;
}

async function enviarNotificacionRapida(num, tipo, param, estimacion, total) {
  const mensaje = `Aviso preventivo UTHH: Según el modelo matemático, se estiman ${Math.round(estimacion)} retardos institucionales próximamente. Su historial de ${total} retardos lo identifica en situación de riesgo.`;
  
  if(!confirm(`¿Desea registrar notificación para ${num}?\n\nMensaje: ${mensaje}`)) return;

  try {
    const res = await fetch(`${apiUrl}/api/notificaciones`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        'NUM-TRABAJADOR': num,
        mensaje: mensaje,
        fecha: new Date().toISOString()
      })
    });
    const data = await res.json();
    if (data.ok) alert('✅ Notificación enviada y registrada.');
    else alert('❌ Error al guardar en base de datos.');
  } catch (e) { alert('❌ Error de conexión con la API.'); }
}

/* (Otras funciones como renderizarMes, verDetalle, mostrarCargando se mantienen igual...) */
function renderizarMes(mesNum, retardos) { /* ... código anterior ... */ }
function verDetalle(mesNum, anio) { /* ... código anterior ... */ }
function mostrarCargando(estado) {
  const el = document.getElementById('anio-cargando');
  if(el) el.style.display = estado ? 'inline-flex' : 'none';
}
