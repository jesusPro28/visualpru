/* ================================================
   Modulo_faltas.js  —  UTHH  Retardos
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
  generarTarjetas(anioActual);   // Crea el esqueleto de las 12 tarjetas
  await cargarDatos();           // Carga API y llena todo
});

/* Cuando cambia el año en el selector */
async function cambiarAnio() {
  anioActual = parseInt(document.getElementById('selectorAnio').value, 10);
  generarTarjetas(anioActual);
  await cargarDatos();
}

/* ────────────────────────────────────────────────
   GENERAR TARJETAS VACÍAS (esqueleto)
──────────────────────────────────────────────── */
function generarTarjetas(anio) {
  const grid = document.getElementById('mesesGrid');
  grid.innerHTML = '';

  MESES_NOMBRES.forEach((nombre, idx) => {
    const mesNum = idx + 1; // 1-12
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

    // --- Llenar cada mes ---
    for (let mes = 1; mes <= 12; mes++) {
      const mesStr  = String(mes).padStart(2, '0');
      const ultimo  = ultimoDia(anioActual, mes);
      const inicio  = `${anioActual}-${mesStr}-01`;
      const fin     = `${anioActual}-${mesStr}-${String(ultimo).padStart(2, '0')}`;

      const retardosMes = filtrarRetardos(estados, inicio, fin);
      renderizarMes(mes, retardosMes);
    }

    // --- Modelo matemático (fijo: jul-oct 2025 vs nov 2025-mar 2026) ---
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
      window.N0 = 0;
      window.k  = 0;
    }

  } catch (error) {
    console.error('Error al cargar datos:', error);
    document.getElementById('nr_initial').textContent = 'Error';
    document.getElementById('nr_final').textContent   = 'Error';
  } finally {
    mostrarCargando(false);
  }
}

/* ────────────────────────────────────────────────
   RENDERIZAR UNA TARJETA DE MES
──────────────────────────────────────────────── */
function renderizarMes(mesNum, retardos) {
  const badge  = document.getElementById(`badge-mes-${mesNum}`);
  const vacio  = document.getElementById(`vacio-mes-${mesNum}`);
  const canvas = document.getElementById(`canvas-mes-${mesNum}`);
  const btn    = document.getElementById(`btn-mes-${mesNum}`);

  // Destruir gráfica anterior si existe
  if (_chartsMeses[mesNum]) {
    _chartsMeses[mesNum].destroy();
    delete _chartsMeses[mesNum];
  }

  if (retardos.length === 0) {
    badge.textContent  = '0 retardos';
    badge.className    = 'mes-badge badge-cero';
    canvas.style.display = 'none';
    vacio.style.display  = 'flex';
    btn.disabled = true;
    return;
  }

  /* Hay retardos → construir gráfica de barras por día */
  badge.textContent = `${retardos.length} retardo${retardos.length !== 1 ? 's' : ''}`;
  badge.className   = 'mes-badge badge-activo';
  canvas.style.display = 'block';
  vacio.style.display  = 'none';
  btn.disabled = false;

  // Agrupar por día del mes
  const porDia = {};
  retardos.forEach(item => {
    const d = new Date(item.FECHA).getDate();
    porDia[d] = (porDia[d] || 0) + 1;
  });

  const diasKeys  = Object.keys(porDia).map(Number).sort((a, b) => a - b);
  const diasLabel = diasKeys.map(d => `Día ${d}`);
  const diasData  = diasKeys.map(d => porDia[d]);

  const ctx = canvas.getContext('2d');
  _chartsMeses[mesNum] = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: diasLabel,
      datasets: [{
        label: 'Retardos',
        data: diasData,
        backgroundColor: 'rgba(91,18,32,0.75)',
        borderColor: '#5b1220',
        borderWidth: 1,
        borderRadius: 4
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: ctx => `${ctx.parsed.y} retardo${ctx.parsed.y !== 1 ? 's' : ''}`
          }
        }
      },
      scales: {
        x: {
          ticks: { font: { size: 9 }, maxRotation: 45 },
          grid: { display: false }
        },
        y: {
          beginAtZero: true,
          ticks: { stepSize: 1, font: { size: 9 } }
        }
      }
    }
  });
}

/* ────────────────────────────────────────────────
   MODAL: VER DETALLE DE UN MES
──────────────────────────────────────────────── */
async function verDetalle(mesNum, anio) {
  const mesStr  = String(mesNum).padStart(2, '0');
  const ultimo  = ultimoDia(anio, mesNum);
  const inicio  = `${anio}-${mesStr}-01`;
  const fin     = `${anio}-${mesStr}-${String(ultimo).padStart(2, '0')}`;

  const overlay = document.getElementById('modalOverlay');
  const titulo  = document.getElementById('modalTitulo');
  const body    = document.getElementById('modalBody');

  titulo.textContent = `Retardos — ${MESES_NOMBRES[mesNum - 1]} ${anio}`;
  body.innerHTML = '<p style="text-align:center;color:#777;">Cargando...</p>';
  overlay.style.display = 'flex';
  document.body.style.overflow = 'hidden';

  try {
    const estados     = await fetchEstados();
    const retardosMes = filtrarRetardos(estados, inicio, fin);

    if (retardosMes.length === 0) {
      body.innerHTML = `
        <div class="modal-vacio">
          <span></span>
          <p>No hay retardos registrados en ${MESES_NOMBRES[mesNum - 1]} ${anio}.</p>
        </div>`;
      return;
    }

    /* Agrupar por número de trabajador.
       La BD usa la columna 'NUM-TRABAJADOR' (con guión); la API la devuelve igual. */
    const porEmpleado = {};
    retardosMes.forEach(item => {
      const numTrabajador =
        item['NUM-TRABAJADOR'] ||
        item.NUM_TRABAJADOR    ||
        item.num_trabajador    ||
        item.ID_EMPLEADO       ||
        item.id_empleado       ||
        'SIN-NUM';
      const nombre = item.NOMBRE || item.nombre || '';
      const clave  = String(numTrabajador);
      if (!porEmpleado[clave]) porEmpleado[clave] = { numTrabajador: clave, nombre, registros: [] };
      porEmpleado[clave].registros.push(item);
    });

    const empleados = Object.keys(porEmpleado).sort();

    let html = `
      <p class="modal-resumen">
        Total: <strong>${retardosMes.length} retardo${retardosMes.length !== 1 ? 's' : ''}</strong>
        en <strong>${empleados.length} empleado${empleados.length !== 1 ? 's' : ''}</strong>
      </p>
      <div class="modal-tabla-wrap">
        <table class="modal-tabla">
          <thead>
            <tr>
              <th>#</th>
              <th>Núm. Trabajador</th>
              <th>Retardos</th>
              <th>
                <div class="fechas-th-wrap">
                  <span>Fechas de Retardo</span>
                  <div class="fechas-th-cols">
                    <span>Día</span>
                    <span>Mes</span>
                  </div>
                </div>
              </th>
            </tr>
          </thead>
          <tbody>`;

    empleados.forEach((clave, i) => {
      const { numTrabajador, nombre, registros } = porEmpleado[clave];

      // Ordenar fechas cronológicamente
      const fechasOrdenadas = registros
        .map(r => new Date(r.FECHA))
        .sort((a, b) => a - b);

      const MESES_CORTOS = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];

      const fechasHtml = fechasOrdenadas.map((d, idx) => `
        <div class="fecha-fila ${idx % 2 === 0 ? 'fecha-par' : 'fecha-impar'}">
          <span class="fecha-dia">${String(d.getDate()).padStart(2,'0')}</span>
          <span class="fecha-mes">${MESES_CORTOS[d.getMonth()]}</span>
        </div>`).join('');

      const nivel = registros.length >= 5 ? 'alto' : registros.length >= 3 ? 'medio' : 'bajo';

      html += `
        <tr>
          <td>${i + 1}</td>
          <td class="empleado-nombre">
            <span class="num-trabajador">${numTrabajador}</span>
            ${nombre ? `<span class="nombre-empleado">${nombre}</span>` : ''}
          </td>
          <td><span class="retardo-count nivel-${nivel}">${registros.length}</span></td>
          <td class="fechas-cell">
            <div class="fechas-lista">${fechasHtml}</div>
          </td>
        </tr>`;
    });

    html += `</tbody></table></div>`;
    body.innerHTML = html;

  } catch (err) {
    body.innerHTML = `<p style="color:#c0392b;text-align:center;">Error al cargar el detalle.</p>`;
    console.error(err);
  }
}

function cerrarModal(e) {
  if (e.target.id === 'modalOverlay') cerrarModalBtn();
}
function cerrarModalBtn() {
  document.getElementById('modalOverlay').style.display = 'none';
  document.body.style.overflow = '';
}

/* ────────────────────────────────────────────────
   INDICADOR DE CARGA
──────────────────────────────────────────────── */
function mostrarCargando(estado) {
  document.getElementById('anio-cargando').style.display = estado ? 'inline-flex' : 'none';
}

/* ────────────────────────────────────────────────
   MODELO MATEMÁTICO — Calcular retardos en N meses
──────────────────────────────────────────────── */
function calcularRetardos() {
  const input  = document.getElementById('meses');
  const output = document.getElementById('resultado_meses');
  const meses  = parseFloat(input.value);

  if (isNaN(meses) || meses < 0) { output.textContent = 'Ingrese un número válido.'; return; }

  const N0 = window.N0, k = window.k;
  if (!N0 || !k) { output.textContent = 'No hay datos válidos.'; return; }

  const retardos = N0 * Math.exp(k * meses);
  output.textContent = `En ${meses.toFixed(1)} meses se estiman ${retardos.toFixed(2)} retardos.`;

  const cardMeses = document.getElementById('card-resultado-meses');
  if (cardMeses) cardMeses.textContent = `N(${meses}) = ${N0} · e^(${k.toFixed(4)} · ${meses}) ≈ ${retardos.toFixed(2)} retardos`;

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
        pointBackgroundColor: '#bd9659',
        pointRadius: 4,
        fill: true,
        tension: 0.4
      }, {
        label: `Punto ingresado (Mes ${meses})`,
        data: labels.map((_, i) => i === Math.round(meses) ? retardos : null),
        borderColor: '#bd9659',
        backgroundColor: '#bd9659',
        pointRadius: 8,
        pointStyle: 'star',
        showLine: false
      }]
    },
    options: {
      responsive: true,
      plugins: { legend: { position: 'top' }, tooltip: { mode: 'index', intersect: false } },
      scales: {
        x: { title: { display: true, text: 'Meses' } },
        y: { title: { display: true, text: 'Número de Retardos' }, beginAtZero: false }
      }
    }
  });
}

/* ────────────────────────────────────────────────
   MODELO MATEMÁTICO — Calcular tiempo para N retardos
──────────────────────────────────────────────── */
function calcularTiempo() {
  const input  = document.getElementById('retardos');
  const output = document.getElementById('resultado');
  const x      = parseFloat(input.value);

  if (isNaN(x) || x <= 0) { output.textContent = 'Ingrese un número válido.'; return; }

  const N0 = window.N0, k = window.k;
  if (!N0 || !k) { output.textContent = 'No hay datos válidos.'; return; }

  const t = Math.log(x / N0) / k;
  if (t < 0) {
    output.textContent = `Se estima que esa cantidad de retardos se alcanzó hace ${Math.abs(t).toFixed(2)} meses.`;
  } else {
    output.textContent = `Se estima llegar a ${x} retardos en ${t.toFixed(2)} meses.`;
  }

  const cardTiempo = document.getElementById('card-resultado-tiempo');
  if (cardTiempo) cardTiempo.textContent = `t = ln(${x} / ${N0}) / ${k.toFixed(4)} ≈ ${t.toFixed(2)} meses`;
  const maxRetardos = Math.max(x * 1.5, N0 * 2);
  const paso = Math.max(1, Math.floor((maxRetardos - N0) / 20));
  const labelsT = [], valoresT = [];
  for (let r = Math.round(N0); r <= Math.ceil(maxRetardos); r += paso) {
    const tiempo = Math.log(r / N0) / k;
    if (isFinite(tiempo)) { labelsT.push(r); valoresT.push(parseFloat(tiempo.toFixed(2))); }
  }

  const containerT = document.getElementById('grafica-tiempo-container');
  containerT.style.display = 'block';
  const ctxT = document.getElementById('graficaTiempo').getContext('2d');
  if (window._chartTiempo) window._chartTiempo.destroy();
  window._chartTiempo = new Chart(ctxT, {
    type: 'line',
    data: {
      labels: labelsT,
      datasets: [{
        label: 'Meses necesarios T(N)',
        data: valoresT,
        borderColor: '#5b1220',
        backgroundColor: 'rgba(91,18,32,0.08)',
        pointBackgroundColor: '#bd9659',
        pointRadius: 4,
        fill: true,
        tension: 0.4
      }, {
        label: `Punto ingresado (${x} retardos)`,
        data: labelsT.map(r => Math.abs(r - x) < paso ? parseFloat((Math.log(x / N0) / k).toFixed(2)) : null),
        borderColor: '#bd9659',
        backgroundColor: '#bd9659',
        pointRadius: 8,
        pointStyle: 'star',
        showLine: false
      }]
    },
    options: {
      responsive: true,
      plugins: { legend: { position: 'top' }, tooltip: { mode: 'index', intersect: false } },
      scales: {
        x: { title: { display: true, text: 'Número de Retardos' } },
        y: { title: { display: true, text: 'Meses necesarios' } }
      }
    }
  });
}