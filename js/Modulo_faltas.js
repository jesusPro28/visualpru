/* ================================================
   Modulo_faltas.js  —  UTHH  Retardos
   ================================================ */

const apiUrl = 'https://api-asistencia.vercel.app';


const notificacionUrl = 'https://apiserver-eta.vercel.app/api/notificaciones/enviar';

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

/* ════════════════════════════════════════════════
   NUEVO — TARJETA DE NOTIFICACIÓN DE RIESGO
   ────────────────────────────────────────────────
   Renderiza (o actualiza) la tarjeta de alerta encima
   de la gráfica de resultados, sin tocar la lógica
   matemática existente.
   ════════════════════════════════════════════════ */

/**
 * Determina el trabajador con MÁS retardos en el período
 * de referencia (jul 2025 – mar 2026) y lo devuelve como
 * string, o null si no hay datos.
 */
function obtenerTrabajadoresEnRiesgo() {
  if (!_estadosCache) return [];

  const retardos = filtrarRetardos(_estadosCache, '2025-07-01', '2026-03-31');
  if (retardos.length === 0) return [];

  const conteo = {};
  retardos.forEach(item => {
    // Mantenemos tu lógica de búsqueda de campos, incluyendo 'NUM-TRABAJADOR' con guion
    const num = item['NUM-TRABAJADOR'] || item.NUM_TRABAJADOR || item.num_trabajador || null;
    if (num !== null) {
      const clave = String(num);
      conteo[clave] = (conteo[clave] || 0) + 1;
    }
  });

  // Convertimos a una lista de objetos para poder filtrar mejor
  const empleadosValidados = Object.entries(conteo).map(([num, total]) => ({
    numero: num,
    total: total
  }));

  // SUGERENCIA: Retornamos a todos los que tengan 3 o más retardos
  // Esto cubrirá a los que tengan 4 (el máximo) y los que tengan 3.
  return empleadosValidados
    .filter(emp => emp.total >= 3)
    .sort((a, b) => b.total - a.total); // Los de 4 arriba, luego los de 3
}
/**
 * Muestra u oculta la tarjeta de notificación.
 * @param {string} containerId  - ID del div contenedor de la sección (padre del botón Calcular)
 * @param {string} cardId       - ID único de la tarjeta a crear/actualizar
 * @param {string} graficaId    - ID del div de la gráfica (la tarjeta se inserta antes de él)
 * @param {number} valorCalculado - Resultado numérico de la predicción (para contexto del mensaje)
 * @param {string} tipoCalculo  - 'meses' | 'tiempo'  (para personalizar el mensaje sugerido)
 */function mostrarTarjetaNotificacion(containerId, cardId, graficaId, valorCalculado, tipoCalculo) {
  // Ahora recibimos la LISTA de trabajadores (los que tienen >= 3 retardos)
  const trabajadoresEnRiesgo = obtenerTrabajadoresEnRiesgo();

  const previa = document.getElementById(cardId);
  if (previa) previa.remove();

  const graficaDiv = document.getElementById(graficaId);
  if (!graficaDiv) return;

  let mensajeSugerido = '';
  if (tipoCalculo === 'meses') {
    mensajeSugerido = `Se estima que en ${valorCalculado} mes(es) habrá un aumento crítico de retardos. Se recomienda entrevista preventiva.`;
  } else {
    mensajeSugerido = `La predicción indica que se alcanzarán ${Math.round(valorCalculado)} retardos pronto. Favor de atender con prioridad.`;
  }

  const tarjeta = document.createElement('div');
  tarjeta.id        = cardId;
  tarjeta.className = 'notif-card';

  // Generamos las opciones del selector basadas en la lista de trabajadores
  let opcionesHtml = '';
  if (trabajadoresEnRiesgo.length > 0) {
    trabajadoresEnRiesgo.forEach(emp => {
      opcionesHtml += `<option value="${emp.numero}">Trabajador  ${emp.numero} (${emp.total} retardos)</option>`;
    });
  }

  tarjeta.innerHTML = `
    <div class="notif-card-header">
      <span class="notif-icono">⚠</span>
      <div class="notif-header-texto">
        <h4 class="notif-titulo">Personal en Riesgo Detectado</h4>
        <p class="notif-subtitulo">Se encontraron ${trabajadoresEnRiesgo.length} empleados que superan el umbral de alerta.</p>
      </div>
      <button class="notif-cerrar" onclick="cerrarTarjetaNotificacion('${cardId}')">✕</button>
    </div>

    <div class="notif-card-body">
      <div class="notif-dato-wrap">
        <label class="notif-label">Seleccionar Trabajador para Notificar</label>
        ${trabajadoresEnRiesgo.length > 0 ? `
          <select id="${cardId}-select-trabajador" class="notif-textarea" style="padding:8px; margin-bottom:10px;">
            ${opcionesHtml}
          </select>
        ` : '<p style="color:red;">No hay trabajadores que cumplan el criterio de riesgo.</p>'}
      </div>

      <div class="notif-mensaje-wrap">
        <label class="notif-label" for="${cardId}-textarea">Mensaje de Notificación</label>
        <textarea id="${cardId}-textarea" class="notif-textarea" rows="3" maxlength="1000">${mensajeSugerido}</textarea>
        <span class="notif-contador" id="${cardId}-contador">${mensajeSugerido.length}/1000</span>
      </div>
    </div>

    <div class="notif-card-footer">
      <span class="notif-status" id="${cardId}-status"></span>
      <button
        class="notif-btn-enviar"
        id="${cardId}-btn"
        onclick="prepararEnvio('${cardId}')"
        ${trabajadoresEnRiesgo.length === 0 ? 'disabled' : ''}
      >
        <span class="notif-btn-icono"></span> Registrar Notificación
      </button>
    </div>
  `;

  graficaDiv.parentNode.insertBefore(tarjeta, graficaDiv);

  // Contador de caracteres
  const textarea = document.getElementById(`${cardId}-textarea`);
  const contador = document.getElementById(`${cardId}-contador`);
  textarea.addEventListener('input', () => {
    contador.textContent = `${textarea.value.length}/1000`;
  });

  requestAnimationFrame(() => tarjeta.classList.add('notif-card--visible'));
}

/**
 * Cierra y elimina la tarjeta de notificación.
 */
function cerrarTarjetaNotificacion(cardId) {
  const tarjeta = document.getElementById(cardId);
  if (!tarjeta) return;
  tarjeta.classList.remove('notif-card--visible');
  tarjeta.classList.add('notif-card--saliendo');
  tarjeta.addEventListener('transitionend', () => tarjeta.remove(), { once: true });
}

/**
 * Lee el trabajador seleccionado en el <select> de la tarjeta y llama a enviarNotificacion.
 * Esta función es la que el botón "Registrar Notificación" invoca directamente.
 * @param {string} cardId
 */
function prepararEnvio(cardId) {
  const select = document.getElementById(`${cardId}-select-trabajador`);
  if (!select) {
    console.warn('prepararEnvio: no se encontró el select de trabajador para', cardId);
    return;
  }
  const numTrabajador = select.value;
  if (!numTrabajador) {
    const status = document.getElementById(`${cardId}-status`);
    mostrarStatusNotificacion(status, 'error', '⚠ Selecciona un trabajador antes de enviar.');
    return;
  }
  enviarNotificacion(cardId, numTrabajador);
}

/**
 * Envía la notificación al endpoint del API (Node/Express).
 * Incluye el token JWT del administrador en el header Authorization.
 * @param {string} cardId
 * @param {string} numTrabajador
 */
async function enviarNotificacion(cardId, numTrabajador) {
  if (!numTrabajador) return;

  const textarea = document.getElementById(`${cardId}-textarea`);
  const btnEnviar = document.getElementById(`${cardId}-btn`);
  const status = document.getElementById(`${cardId}-status`);
  const mensaje = textarea.value.trim();

  // Validación básica antes de intentar registrar
  if (!mensaje) {
    mostrarStatusNotificacion(status, 'error', '⚠ Escribe un mensaje.');
    return;
  }

  // Bloquear botón para evitar múltiples clics
  btnEnviar.disabled = true;
  btnEnviar.innerHTML = 'Registrando...';

  try {
    const res = await fetch(notificacionUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      // Enviamos los datos tal cual los espera tu tabla 'notificaciones'
      body: JSON.stringify({ 
        numTrabajador: numTrabajador, 
        mensaje: mensaje 
      }),
    });

    // Verificamos si el servidor aceptó el registro
    if (res.ok) {
      mostrarStatusNotificacion(status, 'exito', '✔ Notificación guardada en la BD.');
      btnEnviar.innerHTML = '✔ Registrado';
      btnEnviar.style.backgroundColor = '#28a745'; // Color verde de éxito
      textarea.disabled = true;
    } else {
      const errorData = await res.json();
      throw new Error(errorData.msg || 'Error al guardar');
    }
  } catch (err) {
    console.error('Error de registro:', err);
    mostrarStatusNotificacion(status, 'error', `✕ Error: ${err.message}`);
    btnEnviar.disabled = false;
    btnEnviar.innerHTML = 'Reintentar registro';
  }
}

  // Estado de carga
  btnEnviar.disabled = true;
  btnEnviar.innerHTML = '<span class="notif-spinner"></span> Enviando…';
  mostrarStatusNotificacion(status, '', '');

  try {
    const res = await fetch(notificacionUrl, {
      method:  'POST',
      headers: {
        'Content-Type':  'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({ numTrabajador, mensaje }),
    });

    const data = await res.json();

    if (res.ok && data.ok) {
      mostrarStatusNotificacion(status, 'exito', '✔ Notificación enviada correctamente al empleado.');
      btnEnviar.innerHTML = '<span class="notif-btn-icono">✔</span> Enviado';
      btnEnviar.classList.add('notif-btn-enviado');
      textarea.disabled = true;
    } else {
      throw new Error(data.msg || data.message || 'Error desconocido del servidor.');
    }
  } catch (err) {
    console.error('Error al enviar notificación:', err);
    mostrarStatusNotificacion(status, 'error', `✕ Error: ${err.message}`);
    btnEnviar.disabled = false;
    btnEnviar.innerHTML = '<span class="notif-btn-icono"></span> Reintentar';
  }
}

/**
 * Actualiza el texto de estado dentro de la tarjeta.
 */
function mostrarStatusNotificacion(el, tipo, texto) {
  el.textContent  = texto;
  el.className    = 'notif-status';
  if (tipo) el.classList.add(`notif-status--${tipo}`);
}

/* ════════════════════════════════════════════════
   MODELO MATEMÁTICO — Calcular retardos en N meses
   (sin modificaciones a la lógica matemática)
   ════════════════════════════════════════════════ */
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

  /* ── NUEVO: Mostrar tarjeta de notificación encima de la gráfica ── */
  mostrarTarjetaNotificacion(
    'seccion-calcular-retardos',      // ID de la sección (div.modulo-seccion)
    'notif-card-retardos',            // ID único de esta tarjeta
    'grafica-retardos-container',     // ID del div de la gráfica (la tarjeta va antes)
    meses,                            // Valor calculado
    'meses'                           // Tipo de cálculo
  );
}

/* ════════════════════════════════════════════════
   MODELO MATEMÁTICO — Calcular tiempo para N retardos
   (sin modificaciones a la lógica matemática)
   ════════════════════════════════════════════════ */
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

  /* ── NUEVO: Mostrar tarjeta de notificación encima de la gráfica ── */
  mostrarTarjetaNotificacion(
    'seccion-calcular-tiempo',        // ID de la sección
    'notif-card-tiempo',              // ID único de esta tarjeta
    'grafica-tiempo-container',       // ID del div de la gráfica
    x,                                // Valor calculado (N retardos objetivo)
    'tiempo'                          // Tipo de cálculo
  );
}
/**
 * Función puente que falta para conectar la UI con la lógica de envío
 */
function prepararEnvio(cardId) {
  const select = document.getElementById(`${cardId}-select-trabajador`);
  
  if (!select) {
    console.error("No se encontró el selector de trabajador.");
    return;
  }

  const numTrabajador = select.value;
  
  // Llamamos a la función que ya tienes definida en tu JS
  enviarNotificacion(cardId, numTrabajador);
}

