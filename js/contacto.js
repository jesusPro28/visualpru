/**
 * contacto.js — Formulario de contacto + Mapa de ubicación con ruta
 * Universidad Tecnológica de la Huasteca Hidalguense
 */

// ─── Coordenadas de la UTHH ────────────────────────────────
const UTHH = {
  lat: 21.155653,
  lng: -98.381034,
  nombre: 'Universidad Tecnológica de la Huasteca Hidalguense (UTHH)'
};
// ──────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {

  // ── 1. AÑO EN FOOTER ──────────────────────────────
  const yearEl = document.getElementById('year');
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  // ── 2. FORMULARIO DE CONTACTO (EmailJS) ───────────
  const form = document.querySelector('.contact-form');

  if (form) {

    // Inicializar EmailJS
    emailjs.init("yo5uxjIPQMXbwGfYV");

    form.addEventListener('submit', function (e) {
      e.preventDefault();

      const correo = document.getElementById('correo').value.trim();
      const mensaje = document.getElementById('mensaje').value.trim();

      if (!correo || !mensaje) {
        mostrarAlerta('Completa todos los campos', 'info');
        return;
      }

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(correo)) {
        mostrarAlerta('Ingresa un correo electrónico válido', 'info');
        return;
      }

      const btn = form.querySelector('button[type="submit"]');
      btn.disabled = true;
      btn.textContent = 'Enviando...';

      emailjs.sendForm("gmail_uthh", "template_c6wweaf", form)
        .then(() => {
          mostrarAlerta('Mensaje enviado correctamente ✅', 'info');
          form.reset();
        })
        .catch((error) => {
          console.error('EmailJS Error:', error);
          mostrarAlerta('Error al enviar el mensaje ❌', 'info');
        })
        .finally(() => {
          btn.disabled = false;
          btn.textContent = 'Enviar mensaje';
        });

    });
  }

  // ── 3. MAPA ───────────────────────────────────────
  if (typeof L !== 'undefined') {
    iniciarMapa();
  } else {
    window.addEventListener('load', () => {
      if (typeof L !== 'undefined') iniciarMapa();
      else console.error('Leaflet no se pudo cargar.');
    });
  }
});

// ───────────────── MAPA ─────────────────────────────
let mapa, marcadorUsuario, marcadorUTHH, capaRuta;
let coordsUsuario = null;

function iniciarMapa() {
  mapa = L.map('mapa-uthh').setView([UTHH.lat, UTHH.lng], 14);

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: 'OpenStreetMap',
    maxZoom: 19
  }).addTo(mapa);

  const iconoUTHH = L.divIcon({
    html: '<div class="marcador-uthh">UTHH</div>',
    iconSize: [36, 36],
    iconAnchor: [18, 18],
    className: ''
  });

  marcadorUTHH = L.marker([UTHH.lat, UTHH.lng], { icon: iconoUTHH })
    .addTo(mapa)
    .bindPopup(`<b>${UTHH.nombre}</b>`)
    .openPopup();

  setTimeout(() => mapa.invalidateSize(), 200);

  document.getElementById('btn-mi-ubicacion')
    .addEventListener('click', obtenerUbicacion);

  document.getElementById('btn-ruta')
    .addEventListener('click', calcularRuta);
}

// ── Ubicación ─────────────────────────────
function obtenerUbicacion() {
  if (!navigator.geolocation) {
    mostrarAlerta('Tu navegador no soporta geolocalización', 'info');
    return;
  }

  navigator.geolocation.getCurrentPosition(pos => {
    coordsUsuario = {
      lat: pos.coords.latitude,
      lng: pos.coords.longitude
    };

    if (marcadorUsuario) mapa.removeLayer(marcadorUsuario);

    marcadorUsuario = L.marker([coordsUsuario.lat, coordsUsuario.lng])
      .addTo(mapa)
      .bindPopup('Tu ubicación')
      .openPopup();

    mapa.fitBounds([
      [coordsUsuario.lat, coordsUsuario.lng],
      [UTHH.lat, UTHH.lng]
    ]);

    document.getElementById('btn-ruta').disabled = false;

  }, () => {
    mostrarAlerta('No se pudo obtener tu ubicación', 'info');
  });
}

// ── Ruta ─────────────────────────────
function calcularRuta() {
  if (!coordsUsuario) return;

  if (capaRuta) mapa.removeLayer(capaRuta);

  const url = `https://router.project-osrm.org/route/v1/driving/${coordsUsuario.lng},${coordsUsuario.lat};${UTHH.lng},${UTHH.lat}?overview=full&geometries=geojson`;

  fetch(url)
    .then(r => r.json())
    .then(data => {
      const ruta = data.routes[0];

      capaRuta = L.geoJSON(ruta.geometry, {
        style: { color: '#5b1220', weight: 4 }
      }).addTo(mapa);
    })
    .catch(() => alert('Error al calcular ruta'));
}