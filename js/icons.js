// ============================================================
// Set de íconos vectoriales (SVG en línea, estilo trazo 2px,
// currentColor) para reemplazar los emojis del sitio por algo más
// prolijo y consistente entre dispositivos (un emoji se ve distinto
// en iPhone/Android/Windows; un SVG siempre se ve igual).
//
// Uso: ICON('home') devuelve el <svg>...</svg> como string listo
// para insertar en un template literal. Opcional: ICON('home', {size:20,
// color:'var(--primary)', class:'mi-clase'}).
//
// No depende de ningún CDN externo: todo el path vive acá, así el
// ícono se ve igual siempre (incluso sin internet) y no hay que
// confiar en que un servicio externo esté disponible.
// ============================================================

const ICON_PATHS = {
  // --- Navegación / secciones ---
  home: '<path d="M3 12 L12 3 L21 12 M5 10 V21 H19 V10"/>',
  star: '<path d="M12 2 L14.9 8.6 L22 9.3 L16.8 14.1 L18.2 21 L12 17.4 L5.8 21 L7.2 14.1 L2 9.3 L9.1 8.6 Z"/>',
  'star-filled': '<path d="M12 2 L14.9 8.6 L22 9.3 L16.8 14.1 L18.2 21 L12 17.4 L5.8 21 L7.2 14.1 L2 9.3 L9.1 8.6 Z" fill="currentColor" stroke="none"/>',
  calendar: '<rect x="3" y="5" width="18" height="16" rx="2"/><line x1="16" y1="3" x2="16" y2="7"/><line x1="8" y1="3" x2="8" y2="7"/><line x1="3" y1="10" x2="21" y2="10"/>',
  activity: '<polyline points="2,12 6,12 9,20 14,4 17,12 22,12"/>',
  runner: '<circle cx="13" cy="4" r="2"/><path d="M4 21c1-3 2-4 4-5l2-6 3 2-1 5c2 1 3 2 4 5"/><path d="M10 10l3-3 3 2"/>',
  newspaper: '<rect x="4" y="4" width="16" height="16" rx="2"/><line x1="8" y1="8" x2="16" y2="8"/><line x1="8" y1="12" x2="16" y2="12"/><line x1="8" y1="16" x2="13" y2="16"/>',
  'message-circle': '<path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5Z"/>',
  layout: '<rect x="3" y="3" width="18" height="18" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="9" y1="21" x2="9" y2="9"/>',
  users: '<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>',

  // --- Categorías / rubros ---
  utensils: '<path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2M7 2v20M21 15V2a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3Zm0 0v7"/>',
  bed: '<path d="M2 4v16 M2 8h18a2 2 0 0 1 2 2v10 M2 17h20 M6 8V6a2 2 0 0 1 2-2h3a2 2 0 0 1 2 2v2"/>',
  compass: '<circle cx="12" cy="12" r="10"/><polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88"/>',
  store: '<path d="M2 7l1.5-4h17L22 7 M2 7v13a1 1 0 0 0 1 1h18a1 1 0 0 0 1-1V7 M2 7h20 M8 12v4 M12 12v4 M16 12v4"/>',
  medal: '<circle cx="12" cy="8" r="6"/><path d="M8.5 13.5 6 22l6-3 6 3-2.5-8.5"/>',
  trophy: '<path d="M7 4h10v4a5 5 0 0 1-10 0Z"/><path d="M7 5H4.5A1.5 1.5 0 0 0 3 6.5C3 8.5 5 10 7 10"/><path d="M17 5h2.5A1.5 1.5 0 0 1 21 6.5C21 8.5 19 10 17 10"/><path d="M9 17h6"/><path d="M12 13v4"/><path d="M8 21h8"/>',
  palette: '<circle cx="12" cy="12" r="10"/><circle cx="9" cy="9" r="1.3" fill="currentColor" stroke="none"/><circle cx="15" cy="9" r="1.3" fill="currentColor" stroke="none"/><circle cx="12" cy="15" r="1.3" fill="currentColor" stroke="none"/>',
  tag: '<path d="M20.6 12.6 12 21.2 2.8 12 2.8 3.6 11.2 3.6z"/><circle cx="7.5" cy="8.5" r="1.5" fill="currentColor" stroke="none"/>',
  'shopping-bag': '<path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/>',
  music: '<path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/>',
  smile: '<circle cx="12" cy="12" r="10"/><path d="M8 14s1.5 2 4 2 4-2 4-2"/><line x1="9" y1="9" x2="9.01" y2="9"/><line x1="15" y1="9" x2="15.01" y2="9"/>',

  // --- Contacto / redes ---
  'map-pin': '<path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/>',
  phone: '<path d="M6.6 10.8a15.9 15.9 0 0 0 6.6 6.6l2.2-2.2c.3-.3.7-.4 1.1-.3 1.2.4 2.5.6 3.8.6.6 0 1 .4 1 1V20c0 .6-.4 1-1 1C10.1 21 3 13.9 3 5c0-.6.4-1 1-1h3.3c.6 0 1 .4 1 1 0 1.3.2 2.6.6 3.8.1.4 0 .8-.3 1.1L6.6 10.8Z"/>',
  mail: '<rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 6-10 7L2 6"/>',
  globe: '<circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>',
  instagram: '<rect x="2" y="2" width="20" height="20" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="1.2" fill="currentColor" stroke="none"/>',
  facebook: '<path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3Z" fill="currentColor" stroke="none"/>',
  navigation: '<polygon points="3 11 22 2 13 21 11 13 3 11"/>',
  users2: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>',

  // --- Fecha / hora ---
  clock: '<circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>',

  // --- Estado / destacado ---
  crown: '<path d="M3 18h18l-2-9-4 3-3-6-3 6-4-3Z"/>',
  eye: '<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/>',

  // --- Acciones CRUD / UI ---
  edit: '<path d="M12 20h9 M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"/>',
  trash: '<path d="M3 6h18 M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2 M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6 M10 11v6 M14 11v6"/>',
  plus: '<line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>',
  check: '<polyline points="20 6 9 17 4 12"/>',
  x: '<line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>',
  'chevron-down': '<polyline points="6 9 12 15 18 9"/>',
  'chevron-up': '<polyline points="18 15 12 9 6 15"/>',
  'chevron-right': '<polyline points="9 18 15 12 9 6"/>',
  'arrow-left': '<line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/>',
  search: '<circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>',
  share: '<circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.6" y1="10.6" x2="15.4" y2="6.4"/><line x1="8.6" y1="13.4" x2="15.4" y2="17.6"/>',
  'log-out': '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>',
  upload: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>',
  camera: '<path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2Z"/><circle cx="12" cy="13" r="4"/>',
  ticket: '<path d="M2 9a3 3 0 0 1 0 6v3a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-3a3 3 0 0 1 0-6V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2Z"/><line x1="13" y1="5" x2="13" y2="19" stroke-dasharray="2 2"/>',
  loader: '<line x1="12" y1="2" x2="12" y2="6"/><line x1="12" y1="18" x2="12" y2="22"/><line x1="4.9" y1="4.9" x2="7.8" y2="7.8"/><line x1="16.2" y1="16.2" x2="19.1" y2="19.1"/><line x1="2" y1="12" x2="6" y2="12"/><line x1="18" y1="12" x2="22" y2="12"/><line x1="4.9" y1="19.1" x2="7.8" y2="16.2"/><line x1="16.2" y1="7.8" x2="19.1" y2="4.9"/>',
  'bar-chart': '<line x1="12" y1="20" x2="12" y2="10"/><line x1="18" y1="20" x2="18" y2="4"/><line x1="6" y1="20" x2="6" y2="16"/>',
  grid: '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/>',
  list: '<line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/>',
  settings: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>',
  image: '<rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="m21 15-5-5L5 21"/>',
  'dollar-sign': '<line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>',
  handshake: '<path d="M11 17 5.5 11.5a2.1 2.1 0 0 1 3-3L11 11"/><path d="M13 7 18.5 12.5a2.1 2.1 0 0 1-3 3L13 13"/><path d="M2 12l4-4 4.5 4.5"/><path d="M22 12l-4-4-4.5 4.5"/>',
  clipboard: '<rect x="4" y="4" width="16" height="18" rx="2"/><rect x="8" y="2" width="8" height="4" rx="1"/>',

  // --- Amenities / servicios ---
  wifi: '<path d="M5 13a10 10 0 0 1 14 0"/><path d="M8.5 16.5a5 5 0 0 1 7 0"/><line x1="12" y1="20" x2="12.01" y2="20"/>',
  parking: '<rect x="3" y="3" width="18" height="18" rx="2"/><text x="12" y="16.5" font-size="11" font-weight="800" text-anchor="middle" fill="currentColor" stroke="none" font-family="sans-serif">P</text>',
  waves: '<path d="M2 6c1.5 1.5 3 1.5 4.5 0s3-1.5 4.5 0 3 1.5 4.5 0 3-1.5 4.5 0"/><path d="M2 12c1.5 1.5 3 1.5 4.5 0s3-1.5 4.5 0 3 1.5 4.5 0 3-1.5 4.5 0"/><path d="M2 18c1.5 1.5 3 1.5 4.5 0s3-1.5 4.5 0 3 1.5 4.5 0 3-1.5 4.5 0"/>',
  egg: '<path d="M12 2C8 2 5 8 5 14a7 7 0 0 0 14 0c0-6-3-12-7-12Z"/>',
  dumbbell: '<circle cx="5" cy="12" r="3"/><circle cx="19" cy="12" r="3"/><line x1="8" y1="12" x2="16" y2="12"/>',
  snowflake: '<line x1="12" y1="2" x2="12" y2="22"/><line x1="2" y1="12" x2="22" y2="12"/><line x1="5" y1="5" x2="19" y2="19"/><line x1="5" y1="19" x2="19" y2="5"/>',
  flame: '<path d="M12 21c4 0 6-2.5 6-6 0-3-2-5-3-7 0 2-1 3-2 3-1-2 0-4-1-6-3 3-5 6-5 10 0 3.5 2 6 5 6Z"/>',
  sparkle: '<path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5 18 18M6 18l2.5-2.5M15.5 8.5 18 6"/>',
  'paw-print': '<circle cx="11" cy="4" r="2"/><circle cx="18" cy="8" r="2"/><circle cx="20" cy="16" r="2"/><path d="M9 10a5 5 0 0 0-5 5c0 3 2 5 5 5s5-2 8-2 5-1 5-4a5 5 0 0 0-8-4Z"/>',
  mountain: '<path d="M3 20 9 8l4 6 3-4 5 10Z"/>',
};

// size: número (px) o {w,h}; color: cualquier valor CSS de color
// (por defecto hereda currentColor, es decir el color de texto del
// elemento contenedor).
function ICON(name, opts) {
  const o = opts || {};
  const size = o.size || 18;
  const cls = o.class ? ` ${o.class}` : '';
  const body = ICON_PATHS[name];
  if (!body) return '';
  const color = o.color ? ` style="color:${o.color};"` : '';
  return `<svg class="icn${cls}" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"${color}>${body}</svg>`;
}

// Para markup ESTÁTICO en el HTML (no generado por JS): en vez de
// escribir el <svg> a mano en el archivo, se pone un
// <span data-icon="nombre" data-icon-size="14"></span> y esta función
// lo completa apenas carga la página. El contenido dinámico (armado en
// los template literals de cada admin-*.js) sigue usando ICON()/catIcon()
// directo, esto es solo para lo que ya viene fijo en el HTML.
function hydrateIcons(root) {
  (root || document).querySelectorAll('[data-icon]').forEach((el) => {
    const name = el.getAttribute('data-icon');
    const sizeAttr = el.getAttribute('data-icon-size');
    const color = el.getAttribute('data-icon-color') || undefined;
    el.innerHTML = ICON(name, { size: sizeAttr ? parseInt(sizeAttr, 10) : undefined, color });
  });
}
hydrateIcons();

// ------------------------------------------------------------
// Traducción de emojis "históricos" a íconos del set de arriba.
// Las categorías de comercios (Alojamiento, Gastronomía, etc.) y de
// eventos viven en tablas de Supabase con su ícono guardado como
// texto emoji (columna "icon"). Para no tener que migrar la base,
// esta tabla traduce cada emoji conocido a su ícono vectorial
// equivalente. Si en algún momento aparece un emoji que no está acá
// (por ejemplo alguien lo cambió desde el panel de Supabase), catIcon()
// devuelve el emoji tal cual en vez de romper nada.
// ------------------------------------------------------------
const EMOJI_TO_ICON = {
  '🏨': 'bed',
  '🛌': 'bed',
  '🍽️': 'utensils',
  '🍽': 'utensils',
  '🍴': 'utensils',
  '🧭': 'compass',
  '🛍️': 'shopping-bag',
  '🛍': 'shopping-bag',
  '🏪': 'store',
  '🔧': 'settings',
  '🛠️': 'settings',
  '🎭': 'music',
  '⚽': 'trophy',
  '🏅': 'trophy',
  '🎵': 'music',
  '🧒': 'smile',
  '🎉': 'ticket',
  '🏷️': 'tag',
  '🏷': 'tag',
  '📍': 'map-pin',
  '📶': 'wifi',
  '🅿️': 'parking',
  '🅿': 'parking',
  '🏊': 'waves',
  '🍳': 'egg',
  '🏋️': 'dumbbell',
  '🏋': 'dumbbell',
  '❄️': 'snowflake',
  '❄': 'snowflake',
  '🔥': 'flame',
  '💆': 'sparkle',
  '🐾': 'paw-print',
  '🏔️': 'mountain',
  '🏔': 'mountain',
  '✔️': 'check',
  '✔': 'check',
};

// Devuelve el ícono vectorial equivalente a un emoji guardado en la
// base, o el emoji sin cambios si no hay traducción conocida (así
// nunca se rompe ni queda en blanco).
function catIcon(emoji, opts) {
  const mapped = EMOJI_TO_ICON[(emoji || '').trim()];
  return mapped ? ICON(mapped, opts) : (emoji || '');
}
