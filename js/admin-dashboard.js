// ============================================================
// Panel de administración — pestaña "Dashboard" (primera, landing
// por defecto). Estadísticas de la tabla "events" únicamente: total
// de eventos, próximos, vistas totales, un gráfico de barras por mes
// y dos listados (próximos / más vistos). Sin desglose por categoría
// (no lo pidió el municipio).
//
// Se carga después de js/admin.js: reutiliza supabaseClient,
// showAlert(), clearAlert(), escapeHtml(), showAdminSection(),
// currentAdminUser.
// ============================================================

const DASH_MESES_ES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

let dashLoaded = false;

const mainTabDashboard = document.getElementById('mainTabDashboard');
mainTabDashboard.addEventListener('click', () => {
  showAdminSection('dashboardAdminSection');
  if (!dashLoaded) {
    dashLoaded = true;
    loadDashboard();
  }
});

function dashParseDate(ymd) {
  const [y, m, d] = ymd.split('-').map(Number);
  return new Date(y, m - 1, d);
}
function dashTodayYMD() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
// "ignacio morris" -> "Ignacio Morris".
function dashTitleCase(str) {
  return (str || '').toLowerCase().replace(/(^|\s)\S/g, (c) => c.toUpperCase());
}

async function loadDashboard() {
  // Saludo + fecha de hoy.
  const greetingEl = document.getElementById('dashGreeting');
  const todayEl = document.getElementById('dashToday');
  const rawName = (currentAdminUser && (currentAdminUser.user_metadata && currentAdminUser.user_metadata.full_name)) || 'Administrador';
  greetingEl.textContent = 'Bienvenido, ' + dashTitleCase(rawName);
  todayEl.textContent = new Date().toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

  const [{ data, error }, { data: catData, error: catError }, siteVisits] = await Promise.all([
    supabaseClient
      .from('events')
      .select('id, title, status, start_date, start_time, address, views_count, category_id')
      .order('start_date', { ascending: true }),
    supabaseClient.from('event_categories').select('id, label, color'),
    supabaseClient.from('site_visits').select('id', { count: 'exact', head: true }),
  ]);

  if (error) {
    showAlert('No se pudo cargar el dashboard: ' + error.message, 'error');
    return;
  }
  if (catError) { showAlert('No se pudieron cargar las categorías: ' + catError.message, 'error'); }
  if (siteVisits.error) { showAlert('No se pudo cargar el total de visitas al sitio: ' + siteVisits.error.message, 'error'); }

  const categoriesById = {};
  (catData || []).forEach((c) => { categoriesById[c.id] = c; });

  const events = data || [];
  const today = dashTodayYMD();
  const todayD = dashParseDate(today);
  const published = events.filter((e) => e.status === 'published');
  const upcoming = published.filter((e) => e.start_date >= today);
  const thisMonth = events.filter((e) => {
    const d = dashParseDate(e.start_date);
    return d.getFullYear() === todayD.getFullYear() && d.getMonth() === todayD.getMonth();
  });
  const topViewed = published.slice().sort((a, b) => (b.views_count || 0) - (a.views_count || 0));
  const totalSiteVisits = siteVisits.count || 0;

  document.getElementById('dashTotalEvents').textContent = events.length;
  document.getElementById('dashTotalEventsUpcoming').textContent = upcoming.length;
  document.getElementById('dashTotalEventsThisMonth').textContent = thisMonth.length;
  document.getElementById('dashTotalViews').textContent = totalSiteVisits.toLocaleString('es-AR');
  document.getElementById('dashTopViewedSub').innerHTML = topViewed.length
    ? `👑 Evento más visto: <strong>${escapeHtml(topViewed[0].title)}</strong> (${topViewed[0].views_count || 0} vistas)`
    : 'Todavía no hay vistas registradas en eventos.';

  renderDashMonthChart(events);
  renderDashUpcomingList(upcoming.slice(0, 5), categoriesById);
  renderDashTopViewedList(topViewed.slice(0, 5), categoriesById);
}

function renderDashMonthChart(events) {
  const chart = document.getElementById('dashMonthChart');

  // Agrupa por mes/año de start_date. Solo se muestran los meses que
  // tienen al menos un evento (igual que la referencia), ordenados
  // cronológicamente.
  const counts = {};
  events.forEach((e) => {
    const d = dashParseDate(e.start_date);
    const key = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');
    counts[key] = (counts[key] || 0) + 1;
  });

  const keys = Object.keys(counts).sort();
  if (!keys.length) {
    chart.innerHTML = '<p class="empty-state">Todavía no hay eventos cargados.</p>';
    return;
  }

  const max = Math.max(...keys.map((k) => counts[k]));
  chart.innerHTML = keys.map((k) => {
    const [y, m] = k.split('-').map(Number);
    const heightPct = Math.max(6, Math.round((counts[k] / max) * 100));
    return `
      <div class="dash-bar-col">
        <span class="dash-bar-count">${counts[k]}</span>
        <div class="dash-bar" style="height:${heightPct}%;"></div>
        <span class="dash-bar-label">${DASH_MESES_ES[m - 1]} ${y}</span>
      </div>
    `;
  }).join('');
}

function renderDashUpcomingList(items, categoriesById) {
  const box = document.getElementById('dashUpcomingList');
  if (!items.length) { box.innerHTML = '<p class="empty-state">No hay eventos próximos publicados.</p>'; return; }
  box.innerHTML = items.map((e) => {
    const d = dashParseDate(e.start_date);
    const cat = categoriesById[e.category_id] || {};
    return `
      <div class="dash-list-item">
        <div class="dash-list-badge" style="background:${cat.color || 'var(--primary)'};">
          <span class="d">${d.getDate()}</span>
          <span class="m">${DASH_MESES_ES[d.getMonth()]}</span>
        </div>
        <div class="dash-list-body">
          <div class="dash-list-title">${escapeHtml(e.title)}</div>
          <div class="dash-list-meta">
            ${e.start_time ? `🕐 ${e.start_time.slice(0, 5)}` : ''}
            ${e.address ? `· 📍 ${escapeHtml(e.address)}` : ''}
            ${cat.label ? `· ${escapeHtml(cat.label)}` : ''}
          </div>
        </div>
      </div>
    `;
  }).join('');
}

function renderDashTopViewedList(items, categoriesById) {
  const box = document.getElementById('dashTopViewedList');
  if (!items.length) { box.innerHTML = '<p class="empty-state">Todavía no hay vistas registradas.</p>'; return; }
  box.innerHTML = items.map((e, i) => {
    const cat = categoriesById[e.category_id] || {};
    return `
      <div class="dash-list-item">
        <div class="dash-list-rank">${i + 1}</div>
        <div class="dash-list-body">
          <div class="dash-list-title">${escapeHtml(e.title)}</div>
          <div class="dash-list-meta">${cat.label ? escapeHtml(cat.label) : ''}</div>
        </div>
        <div class="dash-list-views">👁 ${e.views_count || 0}</div>
      </div>
    `;
  }).join('');
}
