/* ===== ÉTAT GLOBAL ===== */
let currentUser = null;
let allProducts  = [];
let cart         = [];

/* ===== NAVIGATION ===== */
const ADMIN_VIEWS = [
  { id: 'dashboard', icon: '📊', label: 'Tableau de bord' },
  { id: 'products',  icon: '👕', label: 'Produits' },
  { id: 'stock',     icon: '📦', label: 'Gestion du stock' },
  { id: 'prices',    icon: '💰', label: 'Gestion des prix' },
  { id: 'sell',      icon: '🛒', label: 'Vente' },
  { id: 'history',   icon: '📋', label: 'Historique' },
  { id: 'reports',   icon: '📈', label: 'Rapports' },
  { id: 'sellers',   icon: '👥', label: 'Vendeurs' },
  { id: 'settings',  icon: '⚙️', label: 'Paramètres email' },
];
const SELLER_VIEWS = [
  { id: 'sell',     icon: '🛒', label: 'Vente' },
  { id: 'products', icon: '👕', label: 'Produits & stocks' },
  { id: 'history',  icon: '📋', label: 'Mes ventes' },
];

/* ===== PRODUITS ===== */
const CATEGORIES = {
  tshirt:        'T-Shirt',
  polo:          'Polo',
  polo_vip:      'Polo VIP',
  tshirt_enfant: 'T-Shirt Enfant',
  polo_enfant:   'Polo Enfant',
  casquette:     'Casquette',
  tshirt_adulte: 'T-Shirt',   // backward compat
  polo_adulte:   'Polo',      // backward compat
};
const CAT_ICONS = {
  tshirt: '👕', polo: '👔', polo_vip: '🥇',
  tshirt_enfant: '👕', polo_enfant: '👔', casquette: '🧢',
  tshirt_adulte: '👕', polo_adulte: '👔',
};
const CAT_DISPLAY_ORDER = ['tshirt','polo','polo_vip','tshirt_enfant','polo_enfant','casquette'];

/* ===== UTILITAIRES ===== */
function escapeHtml(str) {
  if (str == null) return '';
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}
function categoryLabel(cat) { return CATEGORIES[cat] || cat; }
function categoryIcon(cat)  { return CAT_ICONS[cat] || '👗'; }
function unitTypeLabel(ut) {
  if (ut === 'gros' || ut === 'douzaine') return 'Gros';
  if (ut === 'detail' || ut === 'unite')  return 'Détail';
  return ut || 'Gros';
}
function unitTypeIsGros(ut) { return !ut || ut === 'gros' || ut === 'douzaine'; }

function formatPrice(p) {
  return new Intl.NumberFormat('fr-FR').format(Math.round(p || 0)) + ' F CFA';
}
function formatDate(d) {
  if (!d) return '-';
  return new Date(d).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}
function formatDateShort(d) {
  if (!d) return '-';
  return new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}
function initials(name) { return (name || '?').substring(0, 2).toUpperCase(); }

function getUnitPrice(p, unitType) {
  return unitTypeIsGros(unitType) ? p.price : (p.price_unit || Math.round(p.price / 12));
}

/* ===== STOCK EN DOUZAINES + UNITÉS (1 douzaine = 12 unités) ===== */
function stockDz(units) { return Math.floor((units || 0) / 12); }
function stockU(units)  { return (units || 0) % 12; }

// Affichage long : "4 douzaines + 3 unités"
function formatStock(units) {
  units = units || 0;
  const dz = stockDz(units), u = stockU(units);
  if (units === 0) return '0';
  if (dz === 0) return `${u} unité${u > 1 ? 's' : ''}`;
  if (u === 0)  return `${dz} douzaine${dz > 1 ? 's' : ''}`;
  return `${dz} dz + ${u} u`;
}

// Affichage court pour les badges : "4 dz + 3 u"
function stockShort(units) {
  units = units || 0;
  const dz = stockDz(units), u = stockU(units);
  if (units === 0) return '0';
  if (dz === 0) return `${u} u`;
  if (u === 0)  return `${dz} dz`;
  return `${dz} dz + ${u} u`;
}

// Unités déjà réservées dans le panier pour un produit (gros = 12 unités/douzaine)
function cartUnitsFor(productId) {
  return cart
    .filter(c => c.product_id === productId)
    .reduce((s, c) => s + (unitTypeIsGros(c.unit_type) ? c.quantity * 12 : c.quantity), 0);
}

/* ===== DARK MODE ===== */
function toggleDark() {
  const isDark = document.documentElement.dataset.theme === 'dark';
  const next = isDark ? 'light' : 'dark';
  document.documentElement.dataset.theme = next;
  localStorage.setItem('theme', next);
  const icon = isDark ? '🌙' : '☀️';
  const el = document.getElementById('dark-icon');
  const elM = document.getElementById('dark-icon-mobile');
  if (el) el.textContent = icon;
  if (elM) elM.textContent = icon;
}
function initDark() {
  const saved = localStorage.getItem('theme') || 'light';
  document.documentElement.dataset.theme = saved;
  const icon = saved === 'dark' ? '☀️' : '🌙';
  const el = document.getElementById('dark-icon');
  const elM = document.getElementById('dark-icon-mobile');
  if (el) el.textContent = icon;
  if (elM) elM.textContent = icon;
}

/* ===== MOBILE SIDEBAR ===== */
function toggleSidebar(open) {
  const sidebar  = document.getElementById('sidebar');
  const overlay  = document.getElementById('sidebar-overlay');
  if (!sidebar || !overlay) return;
  if (open) {
    sidebar.classList.add('open');
    overlay.classList.add('show');
  } else {
    sidebar.classList.remove('open');
    overlay.classList.remove('show');
  }
}

/* ===== API ===== */
async function api(method, path, body) {
  try {
    const opts = { method, headers: { 'Content-Type': 'application/json' } };
    if (body !== undefined) opts.body = JSON.stringify(body);
    const res = await fetch(path, opts);
    if (res.status === 401) { showLogin(); return null; }
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Erreur serveur');
    return data;
  } catch (err) { throw err; }
}

/* ===== TOASTS ===== */
function toast(msg, type = 'info') {
  const icons = { success: '✅', error: '❌', warning: '⚠️', info: 'ℹ️' };
  const el = document.createElement('div');
  el.className = `toast toast-${type}`;
  el.innerHTML = `<span>${icons[type]}</span><span>${msg}</span>`;
  document.getElementById('toast-container').appendChild(el);
  setTimeout(() => {
    el.style.animation = 'slideOut .3s ease forwards';
    setTimeout(() => el.remove(), 300);
  }, 3500);
}

/* ===== MODALE ===== */
function openModal(title, html, wide = false) {
  document.getElementById('modal-title').textContent = title;
  document.getElementById('modal-body').innerHTML = html;
  document.getElementById('modal').className = wide ? 'modal modal-lg' : 'modal';
  document.getElementById('modal-overlay').hidden = false;
}
function closeModal() { document.getElementById('modal-overlay').hidden = true; }
function handleOverlayClick(e) {
  if (e.target === document.getElementById('modal-overlay')) closeModal();
}

/* ===== AUTH ===== */
async function checkAuth() {
  try {
    const res = await fetch('/api/auth/me');
    if (res.ok) setupApp((await res.json()).user);
    else showLogin();
  } catch { showLogin(); }
}

function showLogin() {
  currentUser = null;
  document.getElementById('login-screen').hidden = false;
  document.getElementById('app-screen').hidden = true;
  document.getElementById('login-error').hidden = true;
  document.getElementById('login-username').value = '';
  document.getElementById('login-password').value = '';

  document.getElementById('login-form').onsubmit = async (e) => {
    e.preventDefault();
    const btn = document.getElementById('login-btn');
    btn.disabled = true; btn.textContent = 'Connexion...';
    const errEl = document.getElementById('login-error');
    try {
      const data = await api('POST', '/api/auth/login', {
        username: document.getElementById('login-username').value,
        password: document.getElementById('login-password').value,
      });
      if (data) setupApp(data.user);
    } catch (err) {
      errEl.textContent = err.message;
      errEl.hidden = false;
    } finally {
      btn.disabled = false; btn.textContent = 'Se connecter';
    }
  };
}

async function logout() {
  await fetch('/api/auth/logout', { method: 'POST' });
  cart = [];
  showLogin();
}

/* ===== SETUP ===== */
function setupApp(user) {
  currentUser = user;
  document.getElementById('login-screen').hidden = true;
  document.getElementById('app-screen').hidden = false;

  const roleEl = document.getElementById('sidebar-role');
  roleEl.textContent = user.role === 'admin' ? 'Administrateur' : 'Vendeur';
  roleEl.className = 'role-badge ' + user.role;
  document.getElementById('sidebar-username').textContent = user.username;
  document.getElementById('user-avatar').textContent = initials(user.username);

  const views = user.role === 'admin' ? ADMIN_VIEWS : SELLER_VIEWS;
  document.getElementById('sidebar-nav').innerHTML = views.map(v => `
    <a class="nav-item" data-view="${v.id}" href="#"
       onclick="navigate('${v.id}'); toggleSidebar(false); return false;">
      <span class="nav-icon">${v.icon}</span>
      <span>${v.label}</span>
    </a>
  `).join('');

  initDark();
  navigate(user.role === 'admin' ? 'dashboard' : 'sell');

  // PWA service worker
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js').catch(() => {});
  }
}

function navigate(viewId) {
  document.querySelectorAll('.nav-item').forEach(el =>
    el.classList.toggle('active', el.dataset.view === viewId)
  );
  setView('<div class="loading">⏳ Chargement...</div>');
  const fns = {
    dashboard: renderDashboard,
    products: renderProducts,
    stock: renderStock,
    prices: renderPrices,
    sell: renderSell,
    history: renderHistory,
    reports: renderReports,
    sellers: renderSellers,
    settings: renderSettings,
  };
  if (fns[viewId]) fns[viewId]().catch(err => setView(`<p class="empty-msg text-danger">Erreur: ${err.message}</p>`));
}

function setView(html) { document.getElementById('view-container').innerHTML = html; }

/* =================================================
   TABLEAU DE BORD
================================================= */
async function renderDashboard() {
  const s = await api('GET', '/api/dashboard/stats');
  if (!s) return;

  const alertsHtml = s.lowStockList.length ? `
    <div class="alert-section">
      <div class="section-title">⚠️ Alertes stock (${s.lowStockList.length})</div>
      <div class="alert-grid">
        ${s.lowStockList.map(p => `
          <div class="alert-card ${p.stock === 0 ? 'out-of-stock' : 'low-stock'}">
            <div class="alert-product">${p.name}</div>
            <div class="alert-details">${categoryLabel(p.category)}</div>
            <div class="alert-stock">${p.stock === 0 ? '❌ Rupture de stock' : '⚠️ ' + formatStock(p.stock) + ' restant'}</div>
          </div>
        `).join('')}
      </div>
    </div>
  ` : `<div class="info-box">✅ Tous les stocks sont au-dessus des seuils d'alerte.</div>`;

  // Bar chart 30 jours
  const maxVal = Math.max(...(s.salesByDay.map(d => d.total)), 1);
  const chartBars = s.salesByDay.length ? s.salesByDay.map(d => `
    <div class="bar-col" title="${d.day} — ${formatPrice(d.total)}">
      <div class="bar" style="height:${Math.max(4, Math.round((d.total / maxVal) * 100))}%"></div>
      <div class="bar-label">${d.day.slice(5)}</div>
    </div>
  `).join('') : '<p class="empty-msg" style="padding:1rem">Aucune donnée</p>';

  // Top produits
  const topHtml = s.topProducts.length ? s.topProducts.map((p, i) => `
    <div style="display:flex;align-items:center;gap:.75rem;padding:.5rem 0;border-bottom:1px solid var(--border)">
      <div style="width:24px;height:24px;background:var(--primary-light);border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:.75rem;font-weight:700;color:var(--primary-dark);flex-shrink:0">${i+1}</div>
      <div style="flex:1">
        <div style="font-weight:600;font-size:.875rem;color:var(--text)">${p.name}</div>
        <div style="font-size:.75rem;color:var(--text-muted)">${categoryLabel(p.category)}</div>
      </div>
      <div style="text-align:right">
        <div style="font-size:.8rem;font-weight:600;color:var(--text)">${formatPrice(p.revenue)}</div>
        <div style="font-size:.7rem;color:var(--text-muted)">${p.qty} vendu(s)</div>
      </div>
    </div>
  `).join('') : '<p class="empty-msg" style="padding:.75rem">Aucune vente ce mois</p>';

  const recentHtml = s.recentSales.length ? `
    <div class="table-container">
      <table class="data-table">
        <thead><tr><th>Date</th><th>Vendeur</th><th>Produit</th><th>Type</th><th>Qté</th><th>Total</th></tr></thead>
        <tbody>
          ${s.recentSales.map(r => `
            <tr>
              <td>${formatDate(r.created_at)}</td>
              <td>${r.seller_name}</td>
              <td>${r.product_name}</td>
              <td><span class="badge ${unitTypeIsGros(r.unit_type) ? 'badge-primary' : 'badge-gray'}">${unitTypeLabel(r.unit_type)}</span></td>
              <td>${r.quantity}</td>
              <td class="price">${formatPrice(r.total_price)}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  ` : '<p class="empty-msg">Aucune vente enregistrée.</p>';

  setView(`
    <div class="view-header">
      <div><h2>📊 Tableau de bord</h2><div class="view-subtitle">Vue d'ensemble en temps réel</div></div>
      <button class="btn btn-secondary btn-sm" onclick="renderDashboard()">🔄 Actualiser</button>
    </div>

    <div class="stats-grid">
      <div class="stat-card">
        <div class="stat-icon green">💶</div>
        <div class="stat-info"><div class="stat-value">${formatPrice(s.totalSalesToday)}</div><div class="stat-label">CA aujourd'hui</div></div>
      </div>
      <div class="stat-card">
        <div class="stat-icon blue">📅</div>
        <div class="stat-info"><div class="stat-value">${formatPrice(s.totalSalesMonth)}</div><div class="stat-label">CA ce mois</div></div>
      </div>
      <div class="stat-card">
        <div class="stat-icon purple">🧾</div>
        <div class="stat-info"><div class="stat-value">${s.countToday}</div><div class="stat-label">Ventes aujourd'hui</div></div>
      </div>
      <div class="stat-card">
        <div class="stat-icon orange">💰</div>
        <div class="stat-info"><div class="stat-value">${formatPrice(s.totalRevenue)}</div><div class="stat-label">CA total</div></div>
      </div>
      <div class="stat-card">
        <div class="stat-icon red">⚠️</div>
        <div class="stat-info"><div class="stat-value">${s.lowStockItems + s.outOfStock}</div><div class="stat-label">Alertes stock</div></div>
      </div>
      <div class="stat-card">
        <div class="stat-icon indigo">📦</div>
        <div class="stat-info"><div class="stat-value">${formatPrice(s.stockValue)}</div><div class="stat-label">Valeur du stock</div></div>
      </div>
    </div>

    <div style="display:grid;grid-template-columns:1fr 280px;gap:1.25rem;margin-bottom:1.5rem">
      <div class="chart-wrap">
        <div class="chart-title">📈 Ventes — 30 derniers jours</div>
        <div class="bar-chart">${chartBars}</div>
      </div>
      <div class="chart-wrap">
        <div class="chart-title">🏆 Top produits (30j)</div>
        ${topHtml}
      </div>
    </div>

    ${alertsHtml}

    <div class="recent-section">
      <div class="section-title">🕒 Dernières ventes</div>
      ${recentHtml}
    </div>
  `);
}

/* =================================================
   PRODUITS
================================================= */
async function renderProducts() {
  allProducts = await api('GET', '/api/products') || [];
  _renderProductsView(allProducts);
}

function _renderProductsView(products) {
  const isAdmin = currentUser.role === 'admin';
  const grouped = {};
  products.forEach(p => { (grouped[p.category] = grouped[p.category] || []).push(p); });

  const allCats = [...new Set([...CAT_DISPLAY_ORDER, ...Object.keys(grouped)])];

  const tableRows = (prods) => prods.map(p => `
    <tr class="${p.stock === 0 ? 'row-out' : p.stock <= p.low_stock_threshold ? 'row-low' : ''}">
      <td><strong>${escapeHtml(p.name)}</strong></td>
      ${isAdmin ? `<td class="price">${formatPrice(p.price)}<br><span style="font-size:.75rem;color:var(--text-muted)">${formatPrice(p.price_unit || Math.round(p.price/12))} (détail)</span></td>` : ''}
      <td>
        <span class="badge ${p.stock === 0 ? 'badge-danger' : p.stock <= p.low_stock_threshold ? 'badge-warning' : 'badge-success'}">
          ${stockShort(p.stock)}
        </span>
      </td>
      ${isAdmin ? `
        <td class="col-actions">
          <button class="btn btn-sm btn-secondary" onclick="showProductModal(${p.id})">✏️ Modifier</button>
          <button class="btn btn-sm btn-danger" onclick="deleteProduct(${p.id})">🗑️</button>
        </td>
      ` : ''}
    </tr>
  `).join('');

  const categorySections = allCats
    .filter(k => grouped[k])
    .map(k => `
      <div class="category-section">
        <div class="category-title">
          ${categoryIcon(k)} ${categoryLabel(k)}
          <span class="category-count">${grouped[k].length}</span>
        </div>
        <div class="table-container">
          <table class="data-table">
            <thead>
              <tr>
                <th>Nom du produit</th>
                ${isAdmin ? '<th>Prix</th>' : ''}
                <th>Stock</th>
                ${isAdmin ? '<th>Actions</th>' : ''}
              </tr>
            </thead>
            <tbody>${tableRows(grouped[k])}</tbody>
          </table>
        </div>
      </div>
    `).join('');

  setView(`
    <div class="view-header">
      <div><h2>👕 Produits</h2><div class="view-subtitle">${products.length} référence(s) au total</div></div>
      ${isAdmin ? '<button class="btn btn-primary" onclick="showProductModal()">+ Ajouter un produit</button>' : ''}
    </div>

    <div class="filters-bar">
      <div class="search-input">
        <span class="search-icon">🔍</span>
        <input type="text" placeholder="Rechercher..." oninput="filterProductsView(this.value)" id="prod-search">
      </div>
      <select class="filter-select" onchange="filterProductsView(document.getElementById('prod-search')?.value||'', this.value)" id="prod-cat-filter">
        <option value="">Toutes les catégories</option>
        ${CAT_DISPLAY_ORDER.map(k => `<option value="${k}">${categoryIcon(k)} ${categoryLabel(k)}</option>`).join('')}
      </select>
    </div>

    <div id="products-body">
      ${products.length === 0 ? '<p class="empty-msg">Aucun produit. Commencez par en ajouter un.</p>' : categorySections}
    </div>
  `);
}

function filterProductsView(search = '', category = '') {
  search = (search || '').toLowerCase();
  category = category || document.getElementById('prod-cat-filter')?.value || '';
  const filtered = allProducts.filter(p => {
    const matchSearch = !search || [p.name, categoryLabel(p.category)].some(v => v && v.toLowerCase().includes(search));
    const matchCat = !category || p.category === category;
    return matchSearch && matchCat;
  });
  _renderProductsView(filtered);
  const si = document.getElementById('prod-search');
  const ci = document.getElementById('prod-cat-filter');
  if (si) { si.value = search; si.focus(); }
  if (ci) ci.value = category;
}

/* ===== MODAL PRODUIT ===== */
function showProductModal(productId = null) {
  const p = productId ? allProducts.find(x => x.id === productId) : null;
  openModal(p ? 'Modifier le produit' : 'Ajouter un produit', `
    <form id="product-form" onsubmit="saveProduct(event, ${productId || 'null'})">
      <div class="form-group">
        <label>Nom du produit <span class="required">*</span></label>
        <input class="form-control" name="name" required value="${escapeHtml(p?.name || '')}"
          placeholder="ex: Polo Standard, T-Shirt VIP..." autofocus>
      </div>
      <div class="form-group">
        <label>Catégorie <span class="required">*</span></label>
        <select class="form-control" name="category" required>
          <option value="">— Choisir —</option>
          ${CAT_DISPLAY_ORDER.map(k => `<option value="${k}" ${p?.category === k ? 'selected' : ''}>${categoryIcon(k)} ${categoryLabel(k)}</option>`).join('')}
        </select>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label>Prix GROS (F CFA) <span class="required">*</span></label>
          <input class="form-control" name="price" type="number" step="1" min="0"
            required value="${p?.price ?? ''}" placeholder="ex: 12500">
        </div>
        <div class="form-group">
          <label>Prix DÉTAIL (F CFA)</label>
          <input class="form-control" name="price_unit" type="number" step="1" min="0"
            value="${p?.price_unit ?? ''}" placeholder="Auto (÷ 12)">
        </div>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label>Stock ${p ? 'actuel' : 'initial'} — Douzaines</label>
          <input class="form-control" name="stock_dz" type="number" min="0" value="${p ? stockDz(p.stock) : 0}">
        </div>
        <div class="form-group">
          <label>+ Unités</label>
          <input class="form-control" name="stock_u" type="number" min="0" max="11" value="${p ? stockU(p.stock) : 0}">
        </div>
      </div>
      <div class="form-group">
        <label>Seuil d'alerte (en unités — ex: 12 = 1 douzaine)</label>
        <input class="form-control" name="low_stock_threshold" type="number" min="0" value="${p?.low_stock_threshold ?? 12}">
      </div>
      <div class="form-actions">
        <button type="button" class="btn btn-secondary" onclick="closeModal()">Annuler</button>
        <button type="submit" class="btn btn-primary">💾 Enregistrer</button>
      </div>
    </form>
  `);
}

async function saveProduct(e, productId) {
  e.preventDefault();
  const fd = new FormData(e.target);
  const priceUnit = fd.get('price_unit');
  const data = {
    name: fd.get('name').trim(),
    category: fd.get('category'),
    price: parseFloat(fd.get('price')),
    price_unit: priceUnit ? parseFloat(priceUnit) : null,
    stock: (parseInt(fd.get('stock_dz')) || 0) * 12 + (parseInt(fd.get('stock_u')) || 0),
    low_stock_threshold: parseInt(fd.get('low_stock_threshold')) || 12,
  };
  const btn = e.target.querySelector('[type=submit]');
  btn.disabled = true; btn.textContent = 'Enregistrement...';
  try {
    if (productId) {
      await api('PUT', `/api/products/${productId}`, data);
      toast('Produit modifié avec succès', 'success');
    } else {
      await api('POST', '/api/products', data);
      toast('Produit ajouté avec succès', 'success');
    }
    closeModal();
    await renderProducts();
  } catch (err) {
    toast(err.message, 'error');
    btn.disabled = false; btn.textContent = '💾 Enregistrer';
  }
}

function deleteProduct(productId) {
  const p = allProducts.find(x => x.id === productId);
  if (!p) return;
  openModal('Supprimer le produit', `
    <p class="confirm-text">
      Voulez-vous vraiment supprimer <strong>${escapeHtml(p.name)}</strong> ?
      <br><br>
      <span class="text-danger">⚠️ Cette action est irréversible.</span>
    </p>
    <div class="form-actions">
      <button class="btn btn-secondary" onclick="closeModal()">Annuler</button>
      <button class="btn btn-danger" onclick="confirmDeleteProduct(${productId})">🗑️ Supprimer</button>
    </div>
  `);
}

async function confirmDeleteProduct(productId) {
  try {
    await api('DELETE', `/api/products/${productId}`);
    toast('Produit supprimé', 'success');
    closeModal();
    await renderProducts();
  } catch (err) { toast(err.message, 'error'); }
}

/* =================================================
   GESTION DU STOCK
================================================= */
async function renderStock() {
  allProducts = await api('GET', '/api/products') || [];
  _renderStockView(allProducts);
}

function _renderStockView(products) {
  const sorted = [...products].sort((a, b) => a.stock - b.stock);
  const outCount = sorted.filter(p => p.stock === 0).length;
  const lowCount = sorted.filter(p => p.stock > 0 && p.stock <= p.low_stock_threshold).length;
  const okCount  = sorted.filter(p => p.stock > p.low_stock_threshold).length;

  const rows = sorted.map(p => `
    <tr class="${p.stock === 0 ? 'row-out' : p.stock <= p.low_stock_threshold ? 'row-low' : ''}">
      <td>
        <div style="font-weight:600">${escapeHtml(p.name)}</div>
        <div class="text-muted">${categoryLabel(p.category)}</div>
      </td>
      <td>
        <span class="badge ${p.stock === 0 ? 'badge-danger' : p.stock <= p.low_stock_threshold ? 'badge-warning' : 'badge-success'}">
          ${p.stock === 0 ? '❌ Rupture' : formatStock(p.stock)}
        </span>
      </td>
      <td>${p.low_stock_threshold}</td>
      <td class="col-actions">
        <button class="btn btn-sm btn-primary" onclick="showStockModal(${p.id})">+ Ajouter</button>
        <button class="btn btn-sm btn-secondary" onclick="showSetStockModal(${p.id})">=  Définir</button>
      </td>
    </tr>
  `).join('');

  setView(`
    <div class="view-header">
      <div><h2>📦 Gestion du stock</h2><div class="view-subtitle">${products.length} références</div></div>
    </div>

    <div class="stats-grid" style="margin-bottom:1.25rem">
      <div class="stat-card">
        <div class="stat-icon red">❌</div>
        <div class="stat-info"><div class="stat-value">${outCount}</div><div class="stat-label">Ruptures</div></div>
      </div>
      <div class="stat-card">
        <div class="stat-icon orange">⚠️</div>
        <div class="stat-info"><div class="stat-value">${lowCount}</div><div class="stat-label">Stocks bas</div></div>
      </div>
      <div class="stat-card">
        <div class="stat-icon green">✅</div>
        <div class="stat-info"><div class="stat-value">${okCount}</div><div class="stat-label">Stocks OK</div></div>
      </div>
    </div>

    <div class="filters-bar">
      <div class="search-input">
        <span class="search-icon">🔍</span>
        <input type="text" placeholder="Rechercher..." oninput="filterStockView(this.value)" id="stock-search">
      </div>
      <select class="filter-select" onchange="filterStockView('', this.value, '')" id="stock-status-filter">
        <option value="">Tous les statuts</option>
        <option value="out">Ruptures</option>
        <option value="low">Stocks bas</option>
        <option value="ok">Stocks OK</option>
      </select>
      <select class="filter-select" onchange="filterStockView('', '', this.value)" id="stock-cat-filter">
        <option value="">Toutes catégories</option>
        ${CAT_DISPLAY_ORDER.map(k => `<option value="${k}">${categoryLabel(k)}</option>`).join('')}
      </select>
    </div>

    <div class="table-container">
      <table class="data-table">
        <thead><tr><th>Produit</th><th>Stock actuel</th><th>Seuil alerte</th><th>Actions</th></tr></thead>
        <tbody id="stock-tbody">${rows}</tbody>
      </table>
    </div>
  `);
}

function filterStockView(search = '', status = '', cat = '') {
  search = search !== '' ? search : (document.getElementById('stock-search')?.value || '');
  search = search.toLowerCase();
  status = status !== '' ? status : (document.getElementById('stock-status-filter')?.value || '');
  cat    = cat    !== '' ? cat    : (document.getElementById('stock-cat-filter')?.value    || '');
  const filtered = allProducts.filter(p => {
    const matchSearch = !search || [p.name, categoryLabel(p.category)].some(v => v && v.toLowerCase().includes(search));
    const matchCat    = !cat || p.category === cat;
    const matchStatus = !status ||
      (status === 'out' && p.stock === 0) ||
      (status === 'low' && p.stock > 0 && p.stock <= p.low_stock_threshold) ||
      (status === 'ok'  && p.stock > p.low_stock_threshold);
    return matchSearch && matchCat && matchStatus;
  });
  const sorted = [...filtered].sort((a, b) => a.stock - b.stock);
  const tbody = document.getElementById('stock-tbody');
  if (tbody) tbody.innerHTML = sorted.map(p => `
    <tr class="${p.stock === 0 ? 'row-out' : p.stock <= p.low_stock_threshold ? 'row-low' : ''}">
      <td>
        <div style="font-weight:600">${escapeHtml(p.name)}</div>
        <div class="text-muted">${categoryLabel(p.category)}</div>
      </td>
      <td>
        <span class="badge ${p.stock === 0 ? 'badge-danger' : p.stock <= p.low_stock_threshold ? 'badge-warning' : 'badge-success'}">
          ${p.stock === 0 ? '❌ Rupture' : formatStock(p.stock)}
        </span>
      </td>
      <td>${p.low_stock_threshold}</td>
      <td class="col-actions">
        <button class="btn btn-sm btn-primary" onclick="showStockModal(${p.id})">+ Ajouter</button>
        <button class="btn btn-sm btn-secondary" onclick="showSetStockModal(${p.id})">= Définir</button>
      </td>
    </tr>
  `).join('');
}

function showStockModal(productId) {
  const p = allProducts.find(x => x.id === productId);
  if (!p) return;
  openModal('Ajouter du stock', `
    <div class="info-box" style="margin-bottom:1rem">
      <strong>${escapeHtml(p.name)}</strong> — ${categoryLabel(p.category)}<br>
      Stock actuel : <strong>${formatStock(p.stock)}</strong>
    </div>
    <form onsubmit="submitStock(event, ${productId}, 'add')">
      <div class="form-row">
        <div class="form-group">
          <label>Douzaines à ajouter</label>
          <input class="form-control" id="stock-dz" type="number" min="0" value="0" placeholder="ex: 4" autofocus>
        </div>
        <div class="form-group">
          <label>+ Unités à ajouter</label>
          <input class="form-control" id="stock-u" type="number" min="0" value="0" placeholder="ex: 6">
        </div>
      </div>
      <div class="form-actions">
        <button type="button" class="btn btn-secondary" onclick="closeModal()">Annuler</button>
        <button type="submit" class="btn btn-success">📦 Ajouter au stock</button>
      </div>
    </form>
  `);
}

function showSetStockModal(productId) {
  const p = allProducts.find(x => x.id === productId);
  if (!p) return;
  openModal('Définir le stock', `
    <div class="info-box" style="margin-bottom:1rem">
      <strong>${escapeHtml(p.name)}</strong> — Stock actuel : <strong>${formatStock(p.stock)}</strong>
    </div>
    <form onsubmit="submitStock(event, ${productId}, 'set')">
      <div class="form-row">
        <div class="form-group">
          <label>Douzaines <span class="required">*</span></label>
          <input class="form-control" id="stock-dz" type="number" min="0" required value="${stockDz(p.stock)}" autofocus>
        </div>
        <div class="form-group">
          <label>+ Unités</label>
          <input class="form-control" id="stock-u" type="number" min="0" max="11" value="${stockU(p.stock)}">
        </div>
      </div>
      <div class="form-actions">
        <button type="button" class="btn btn-secondary" onclick="closeModal()">Annuler</button>
        <button type="submit" class="btn btn-primary">💾 Enregistrer</button>
      </div>
    </form>
  `);
}

async function submitStock(e, productId, mode) {
  e.preventDefault();
  const dozens = parseInt(document.getElementById('stock-dz').value) || 0;
  const units  = parseInt(document.getElementById('stock-u').value) || 0;
  if (mode === 'add' && dozens === 0 && units === 0) {
    toast('Saisissez au moins une douzaine ou une unité', 'warning');
    return;
  }
  try {
    await api('PATCH', `/api/products/${productId}/stock`, { dozens, units, mode });
    toast('Stock mis à jour', 'success');
    closeModal();
    await renderStock();
  } catch (err) { toast(err.message, 'error'); }
}

/* =================================================
   VENTE
================================================= */
async function renderSell() {
  allProducts = await api('GET', '/api/products') || [];
  _renderSellView();
}

function _renderSellView(filterCat = '', filterSearch = '') {
  let filtered = allProducts;
  if (filterCat)    filtered = filtered.filter(p => p.category === filterCat);
  if (filterSearch) filtered = filtered.filter(p =>
    [p.name, categoryLabel(p.category)].some(v => v && v.toLowerCase().includes(filterSearch.toLowerCase()))
  );

  const cards = filtered.map(p => {
    const inCartGros   = cart.find(c => c.product_id === p.id && unitTypeIsGros(c.unit_type));
    const inCartDetail = cart.find(c => c.product_id === p.id && !unitTypeIsGros(c.unit_type));
    const outOfStock   = p.stock === 0;
    const priceDetail  = p.price_unit || Math.round(p.price / 12);
    return `
      <div class="product-card ${outOfStock ? 'out-of-stock-card' : ''}">
        <div class="product-card-cat">${categoryIcon(p.category)} ${categoryLabel(p.category)}</div>
        <div class="product-card-name">${escapeHtml(p.name)}</div>
        <div class="product-card-prices">
          <span class="price-gros">💰 Gros : ${formatPrice(p.price)}</span>
          <span class="price-detail">🏷️ Détail : ${formatPrice(priceDetail)}</span>
        </div>
        <div class="product-card-stock">
          <span class="badge ${outOfStock ? 'badge-danger' : p.stock <= p.low_stock_threshold ? 'badge-warning' : 'badge-success'}">
            ${outOfStock ? 'Rupture' : stockShort(p.stock) + ' dispo'}
          </span>
        </div>
        ${!outOfStock ? `
          <div class="product-card-btns">
            <button class="btn-sell-gros ${inCartGros ? 'active' : ''}" onclick="addToCart(${p.id},'gros')"
              ${p.stock < 12 ? 'disabled style="opacity:.4" title="Stock insuffisant pour une douzaine"' : ''}>
              💰 Gros${inCartGros ? ' ×' + inCartGros.quantity : ''}
            </button>
            <button class="btn-sell-detail ${inCartDetail ? 'active' : ''}" onclick="addToCart(${p.id},'detail')">
              🏷️ Détail${inCartDetail ? ' ×' + inCartDetail.quantity : ''}
            </button>
          </div>
        ` : '<div style="margin-top:.5rem;font-size:.75rem;color:var(--danger);font-weight:600">Rupture de stock</div>'}
      </div>
    `;
  }).join('');

  const total = cart.reduce((sum, item) => {
    const p = allProducts.find(x => x.id === item.product_id);
    if (!p) return sum;
    return sum + getUnitPrice(p, item.unit_type) * item.quantity;
  }, 0);

  const cartHtml = cart.length === 0 ? `
    <div class="cart-empty">
      <div class="cart-empty-icon">🛒</div>
      <div>Cliquez sur <strong>Gros</strong> ou <strong>Détail</strong><br>pour ajouter des articles</div>
    </div>
  ` : cart.map((item, idx) => {
    const p = allProducts.find(x => x.id === item.product_id);
    if (!p) return '';
    const isGros = unitTypeIsGros(item.unit_type);
    const unitPrice = getUnitPrice(p, item.unit_type);
    return `
      <div class="cart-item">
        <div class="cart-item-info">
          <div class="cart-item-name">${escapeHtml(p.name)}</div>
          <div class="cart-item-sub">
            ${categoryLabel(p.category)}
            <span class="cart-unit-badge ${isGros ? 'badge-gros' : 'badge-detail'}">${isGros ? 'Gros' : 'Détail'}</span>
          </div>
          <div class="cart-item-uprice">${formatPrice(unitPrice)} / ${isGros ? 'douzaine' : 'unité'}</div>
        </div>
        <div class="cart-qty-controls">
          <button class="qty-btn" onclick="changeCartQty(${idx}, -1)">−</button>
          <span class="qty-val">${item.quantity}</span>
          <button class="qty-btn" onclick="changeCartQty(${idx}, 1)" ${cartUnitsFor(p.id) + (isGros ? 12 : 1) > p.stock ? 'disabled style="opacity:.4"' : ''}>+</button>
        </div>
        <button class="cart-remove" onclick="removeFromCart(${idx})" title="Retirer">×</button>
      </div>
    `;
  }).join('');

  setView(`
    <div class="view-header" style="margin-bottom:1rem">
      <div><h2>🛒 Vente</h2><div class="view-subtitle">Sélectionnez les articles à vendre</div></div>
    </div>
    <div class="sell-layout">
      <div class="products-panel">
        <div class="filters-bar" style="margin-bottom:.75rem">
          <div class="search-input">
            <span class="search-icon">🔍</span>
            <input type="text" placeholder="Rechercher un article..." id="sell-search"
              oninput="_renderSellView(document.getElementById('sell-cat').value, this.value)" value="${filterSearch}">
          </div>
          <select class="filter-select" id="sell-cat"
            onchange="_renderSellView(this.value, document.getElementById('sell-search')?.value||'')">
            <option value="">Toutes les catégories</option>
            ${CAT_DISPLAY_ORDER.map(k => `<option value="${k}" ${filterCat===k?'selected':''}>${categoryIcon(k)} ${categoryLabel(k)}</option>`).join('')}
          </select>
        </div>
        <div class="products-grid">
          ${cards || '<p class="empty-msg">Aucun produit trouvé.</p>'}
        </div>
      </div>

      <div class="cart-panel" id="cart-panel">
        <div class="cart-panel-toggle" id="cart-toggle-bar"></div>
        <div class="cart-header" onclick="toggleCart()">
          <span>🛒 Panier <span class="badge badge-primary" style="font-size:.75rem">${cart.length}</span></span>
          ${cart.length ? '<button class="btn btn-sm btn-secondary" onclick="event.stopPropagation();clearCart()">Vider</button>' : ''}
        </div>
        <div class="cart-items" id="cart-items-container">${cartHtml}</div>
        <div class="cart-footer">
          <div class="cart-total">
            <span class="cart-total-label">Total</span>
            <span class="cart-total-amount">${formatPrice(total)}</span>
          </div>
          <button class="btn btn-success btn-lg btn-block" onclick="validateSale()"
            ${cart.length === 0 ? 'disabled' : ''}>
            ✅ Valider la vente
          </button>
        </div>
      </div>
    </div>
  `);
}

function toggleCart() {
  const panel = document.getElementById('cart-panel');
  if (!panel) return;
  panel.classList.toggle('open');
}

function addToCart(productId, unitType = 'gros') {
  const p = allProducts.find(x => x.id === productId);
  if (!p || p.stock === 0) return;
  // Gros = 12 unités par douzaine — vérifier le stock restant (panier inclus)
  const needed = unitTypeIsGros(unitType) ? 12 : 1;
  if (cartUnitsFor(productId) + needed > p.stock) {
    toast(`Stock insuffisant pour "${p.name}" (disponible : ${formatStock(p.stock)})`, 'warning');
    return;
  }
  const existing = cart.find(c => c.product_id === productId && c.unit_type === unitType);
  if (existing) {
    existing.quantity++;
  } else {
    cart.push({ product_id: productId, quantity: 1, unit_type: unitType });
  }
  const filterCat    = document.getElementById('sell-cat')?.value || '';
  const filterSearch = document.getElementById('sell-search')?.value || '';
  _renderSellView(filterCat, filterSearch);
}

function changeCartQty(idx, delta) {
  const item = cart[idx];
  const p = allProducts.find(x => x.id === item.product_id);
  if (delta > 0 && p) {
    const needed = unitTypeIsGros(item.unit_type) ? 12 : 1;
    if (cartUnitsFor(item.product_id) + needed > p.stock) {
      toast(`Stock insuffisant (disponible : ${formatStock(p.stock)})`, 'warning');
      return;
    }
  }
  item.quantity += delta;
  if (item.quantity <= 0) {
    cart.splice(idx, 1);
  }
  const filterCat    = document.getElementById('sell-cat')?.value || '';
  const filterSearch = document.getElementById('sell-search')?.value || '';
  _renderSellView(filterCat, filterSearch);
}

function removeFromCart(idx) {
  cart.splice(idx, 1);
  const filterCat    = document.getElementById('sell-cat')?.value || '';
  const filterSearch = document.getElementById('sell-search')?.value || '';
  _renderSellView(filterCat, filterSearch);
}

function clearCart() {
  cart = [];
  _renderSellView();
}

async function validateSale() {
  if (cart.length === 0) return;
  const total = cart.reduce((sum, item) => {
    const p = allProducts.find(x => x.id === item.product_id);
    return sum + (p ? getUnitPrice(p, item.unit_type) * item.quantity : 0);
  }, 0);

  const lines = cart.map(item => {
    const p = allProducts.find(x => x.id === item.product_id);
    const unitPrice = getUnitPrice(p, item.unit_type);
    const isGros = unitTypeIsGros(item.unit_type);
    return `
      <div class="receipt-row">
        <span>${p.name} × ${item.quantity} <span class="cart-unit-badge ${isGros?'badge-gros':'badge-detail'}" style="font-size:.65rem">${isGros?'Gros':'Détail'}</span></span>
        <span>${formatPrice(unitPrice * item.quantity)}</span>
      </div>
    `;
  }).join('');

  openModal('Confirmer la vente', `
    <p class="confirm-text" style="margin-bottom:1rem">Récapitulatif de la vente :</p>
    <div class="receipt">
      ${lines}
      <div class="receipt-total"><span>Total</span><span>${formatPrice(total)}</span></div>
    </div>
    <div class="form-actions">
      <button class="btn btn-secondary" onclick="closeModal()">Annuler</button>
      <button class="btn btn-success" onclick="confirmSale()">✅ Confirmer</button>
    </div>
  `);
}

async function confirmSale() {
  const items = cart.map(c => ({ product_id: c.product_id, quantity: c.quantity, unit_type: c.unit_type }));
  try {
    const res = await api('POST', '/api/sales', { items });
    if (!res) return;

    const total    = res.results.reduce((s, r) => s + r.total, 0);
    // Total en t-shirts : 1 douzaine vendue = 12 articles
    const totalQty = res.results.reduce((s, r) => s + (unitTypeIsGros(r.unit_type) ? r.quantity * 12 : r.quantity), 0);
    const saleDate = new Date();
    const receiptNumber = res.receiptNumber || '';

    const receiptLines = res.results.map((r, i) => {
      const item = items[i];
      const isGros = unitTypeIsGros(item.unit_type);
      return `
        <div class="receipt-row">
          <span>${r.product_name} × ${r.quantity}
            <span class="cart-unit-badge ${isGros?'badge-gros':'badge-detail'}" style="font-size:.65rem">${isGros?'Gros':'Détail'}</span>
          </span>
          <span>${formatPrice(r.total)}</span>
        </div>
      `;
    }).join('');

    window._lastSale = {
      results: res.results.map((r, i) => ({ ...r, product_id: items[i]?.product_id, unit_type: items[i]?.unit_type })),
      total, totalQty, date: saleDate, seller: currentUser.username, receiptNumber,
    };

    cart = [];

    openModal('Vente enregistrée ✅', `
      <div class="receipt">
        ${receiptNumber ? `<div class="receipt-number">Reçu N° ${receiptNumber}</div>` : ''}
        ${receiptLines}
        <div class="receipt-total"><span>Total encaissé</span><span>${formatPrice(total)}</span></div>
      </div>
      <div class="receipt-actions" style="margin-top:1.25rem">
        <button class="btn btn-secondary" onclick="printReceipt()">🖨️ Imprimer</button>
        <button class="btn btn-whatsapp" onclick="shareWhatsApp()">📱 WhatsApp</button>
        <button class="btn btn-primary" onclick="closeModal(); renderSell()">🛒 Nouvelle vente</button>
      </div>
    `);
    toast('Vente enregistrée avec succès !', 'success');
  } catch (err) {
    toast(err.message, 'error');
  }
}

function printReceipt() {
  const sale = window._lastSale;
  if (!sale) return;

  const dateStr = sale.date.toLocaleDateString('fr-FR', { day:'2-digit', month:'2-digit', year:'numeric' });
  const timeStr = sale.date.toLocaleTimeString('fr-FR', { hour:'2-digit', minute:'2-digit' });

  const itemRows = sale.results.map(r => {
    const isGros = unitTypeIsGros(r.unit_type);
    return `
      <div class="ticket-item">
        <span class="ticket-item-name">${r.product_name}</span>
        <span class="ticket-item-qty">×${r.quantity} ${isGros ? 'dz' : 'u'}</span>
        <span class="ticket-item-type">${isGros ? 'Gros' : 'Détail'}</span>
        <span class="ticket-item-price">${formatPrice(r.total)}</span>
      </div>
    `;
  }).join('');

  document.getElementById('print-area').innerHTML = `
    <div class="ticket">
      <div class="ticket-header">
        <div class="ticket-shop">👕 BOUTIQUE STOCK</div>
        ${sale.receiptNumber ? `<div class="ticket-receipt">Reçu N° ${sale.receiptNumber}</div>` : ''}
        <div class="ticket-date">${dateStr} — ${timeStr}</div>
        <div class="ticket-seller">Vendeur : ${sale.seller}</div>
      </div>
      <div class="ticket-items">${itemRows}</div>
      <div class="ticket-items-count">${sale.totalQty} article(s)</div>
      <div class="ticket-total"><span>TOTAL</span><span>${formatPrice(sale.total)}</span></div>
      <div class="ticket-footer">Merci de votre visite !<br>— BoutiqueStock —</div>
    </div>
  `;
  window.print();
}

function shareWhatsApp() {
  const sale = window._lastSale;
  if (!sale) return;

  const dateStr = sale.date.toLocaleDateString('fr-FR');
  const timeStr = sale.date.toLocaleTimeString('fr-FR', { hour:'2-digit', minute:'2-digit' });

  let msg = `*🧾 REÇU BOUTIQUE STOCK*\n`;
  if (sale.receiptNumber) msg += `N° ${sale.receiptNumber}\n`;
  msg += `📅 ${dateStr} à ${timeStr}\n`;
  msg += `👤 Vendeur : ${sale.seller}\n`;
  msg += `━━━━━━━━━━━━━━━━━\n`;
  sale.results.forEach(r => {
    const isGros = unitTypeIsGros(r.unit_type);
    msg += `• ${r.product_name} × ${r.quantity} (${isGros?'Gros':'Détail'})\n`;
    msg += `  ${formatPrice(r.total)}\n`;
  });
  msg += `━━━━━━━━━━━━━━━━━\n`;
  msg += `*TOTAL : ${formatPrice(sale.total)}*\n`;
  msg += `\nMerci de votre visite ! 🙏`;

  window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank');
}

/* =================================================
   HISTORIQUE
================================================= */
async function renderHistory() {
  const isAdmin = currentUser.role === 'admin';
  let sellers = [];
  if (isAdmin) sellers = await api('GET', '/api/users') || [];
  const sales = await api('GET', '/api/sales') || [];
  _renderHistoryView(sales, sellers);
}

function _renderHistoryView(sales, sellers) {
  const isAdmin = currentUser.role === 'admin';
  const total = sales.reduce((s, r) => s + r.total_price, 0);

  const rows = sales.map(s => `
    <tr>
      <td>${s.receipt_number ? `<span style="font-size:.75rem;font-weight:600;color:var(--primary)">${s.receipt_number}</span><br>` : ''}${formatDate(s.created_at)}</td>
      ${isAdmin ? `<td>${s.seller_name}</td>` : ''}
      <td><div style="font-weight:600">${escapeHtml(s.product_name)}</div><div class="text-muted">${categoryLabel(s.category)}</div></td>
      <td>
        ${s.quantity}
        <span class="cart-unit-badge ${unitTypeIsGros(s.unit_type) ? 'badge-gros' : 'badge-detail'}" style="font-size:.7rem;margin-left:4px">${unitTypeLabel(s.unit_type)}</span>
      </td>
      <td class="price">${formatPrice(s.unit_price)}</td>
      <td class="price"><strong>${formatPrice(s.total_price)}</strong></td>
      <td>${s.receipt_number ? `<button class="btn btn-sm btn-secondary" onclick="reprintReceipt('${s.receipt_number}')" title="Réimprimer le reçu">🖨️</button>` : ''}</td>
    </tr>
  `).join('');

  setView(`
    <div class="view-header">
      <div><h2>📋 Historique des ventes</h2><div class="view-subtitle">${sales.length} ligne(s) · Total : ${formatPrice(total)}</div></div>
    </div>

    <div class="filters-bar">
      <div style="display:flex;align-items:center;gap:.5rem">
        <label style="white-space:nowrap;font-size:.85rem;color:var(--text-muted)">Du</label>
        <input type="date" class="filter-select" id="hist-from">
      </div>
      <div style="display:flex;align-items:center;gap:.5rem">
        <label style="white-space:nowrap;font-size:.85rem;color:var(--text-muted)">Au</label>
        <input type="date" class="filter-select" id="hist-to">
      </div>
      ${isAdmin ? `
        <select class="filter-select" id="hist-seller">
          <option value="">Tous les vendeurs</option>
          ${sellers.map(u => `<option value="${u.id}">${u.username}</option>`).join('')}
        </select>
      ` : ''}
      <select class="filter-select" id="hist-cat">
        <option value="">Toutes les catégories</option>
        ${CAT_DISPLAY_ORDER.map(k => `<option value="${k}">${categoryLabel(k)}</option>`).join('')}
      </select>
      <button class="btn btn-primary" onclick="applyHistoryFilters()">🔍 Filtrer</button>
      <button class="btn btn-secondary" onclick="resetHistoryFilters()">✖</button>
    </div>

    <div id="history-table">
      ${sales.length === 0 ? '<p class="empty-msg">Aucune vente enregistrée.</p>' : `
        <div class="table-container">
          <table class="data-table">
            <thead>
              <tr>
                <th>Date / Reçu</th>
                ${isAdmin ? '<th>Vendeur</th>' : ''}
                <th>Produit</th><th>Qté</th><th>Prix unit.</th><th>Total</th><th>Reçu</th>
              </tr>
            </thead>
            <tbody>${rows}</tbody>
            <tfoot>
              <tr style="background:var(--surface2)">
                <td colspan="${isAdmin ? 5 : 4}" style="text-align:right;font-weight:600;padding:.75rem 1rem;color:var(--text-2)">Total :</td>
                <td class="price" style="padding:.75rem 1rem"><strong>${formatPrice(total)}</strong></td>
                <td></td>
              </tr>
            </tfoot>
          </table>
        </div>
      `}
    </div>
  `);
}

// Réimpression d'un reçu (y compris ventes des dates passées)
async function reprintReceipt(receiptNumber) {
  try {
    const rows = await api('GET', `/api/sales/receipt/${encodeURIComponent(receiptNumber)}`);
    if (!rows || !rows.length) return;

    window._lastSale = {
      results: rows.map(r => ({
        product_name: r.product_name,
        quantity: r.quantity,
        unit_type: r.unit_type,
        total: r.total_price,
      })),
      total: rows.reduce((s, r) => s + r.total_price, 0),
      totalQty: rows.reduce((s, r) => s + (unitTypeIsGros(r.unit_type) ? r.quantity * 12 : r.quantity), 0),
      date: new Date(rows[0].created_at),
      seller: rows[0].seller_name,
      receiptNumber,
    };
    printReceipt();
  } catch (err) { toast(err.message, 'error'); }
}

async function applyHistoryFilters() {
  const isAdmin  = currentUser.role === 'admin';
  const from     = document.getElementById('hist-from')?.value || '';
  const to       = document.getElementById('hist-to')?.value || '';
  const sellerId = isAdmin ? (document.getElementById('hist-seller')?.value || '') : '';
  const cat      = document.getElementById('hist-cat')?.value || '';
  const params   = new URLSearchParams();
  if (from) params.set('from', from);
  if (to)   params.set('to', to);
  if (sellerId) params.set('seller_id', sellerId);
  if (cat)  params.set('category', cat);
  try {
    const sales = await api('GET', `/api/sales?${params}`) || [];
    let sellers = [];
    if (isAdmin) sellers = await api('GET', '/api/users') || [];
    _renderHistoryView(sales, sellers);
    if (from) document.getElementById('hist-from').value = from;
    if (to)   document.getElementById('hist-to').value   = to;
    if (cat)  document.getElementById('hist-cat').value  = cat;
    if (isAdmin && sellerId) document.getElementById('hist-seller').value = sellerId;
  } catch (err) { toast(err.message, 'error'); }
}

async function resetHistoryFilters() { await renderHistory(); }

/* =================================================
   RAPPORTS
================================================= */
async function renderReports() {
  const users = await api('GET', '/api/users') || [];
  const sellers = users.filter(u => u.role === 'vendeur');
  _renderReportsShell(sellers);
  await loadReport('month', '', '', '', sellers);
}

function _renderReportsShell(sellers) {
  setView(`
    <div class="view-header">
      <div><h2>📈 Rapports</h2><div class="view-subtitle">Analyse des ventes par période</div></div>
    </div>

    <div class="filters-bar" style="margin-bottom:1.5rem">
      <select class="filter-select" id="rep-period" onchange="onRepPeriodChange(this.value)">
        <option value="today">Aujourd'hui</option>
        <option value="week">7 derniers jours</option>
        <option value="month" selected>Ce mois</option>
        <option value="year">Cette année</option>
        <option value="custom">Période personnalisée</option>
      </select>
      <div id="rep-custom" style="display:none;gap:.5rem;align-items:center">
        <input type="date" class="filter-select" id="rep-from">
        <span style="color:var(--text-muted)">au</span>
        <input type="date" class="filter-select" id="rep-to">
      </div>
      <select class="filter-select" id="rep-seller">
        <option value="">Tous les vendeurs</option>
        ${sellers.map(u => `<option value="${u.id}">${u.username}</option>`).join('')}
      </select>
      <button class="btn btn-primary" onclick="applyReport()">🔍 Analyser</button>
      <button class="btn btn-secondary" onclick="exportReportCSV()">📥 Exporter CSV</button>
      <button class="btn btn-secondary" onclick="printReport()">🖨️ Imprimer PDF</button>
    </div>

    <div id="report-content">
      <div class="loading">⏳ Chargement...</div>
    </div>
  `);
  document.getElementById('rep-custom').style.display = 'none';
}

function onRepPeriodChange(val) {
  const custom = document.getElementById('rep-custom');
  if (custom) custom.style.display = val === 'custom' ? 'flex' : 'none';
}

async function applyReport() {
  const period   = document.getElementById('rep-period')?.value || 'month';
  const from     = document.getElementById('rep-from')?.value || '';
  const to       = document.getElementById('rep-to')?.value || '';
  const sellerId = document.getElementById('rep-seller')?.value || '';
  const users    = await api('GET', '/api/users') || [];
  await loadReport(period, from, to, sellerId, users.filter(u => u.role === 'vendeur'));
}

async function loadReport(period, from, to, sellerId, sellers) {
  const params = new URLSearchParams({ period });
  if (from && to) { params.set('from', from); params.set('to', to); }
  if (sellerId) params.set('seller_id', sellerId);

  const d = await api('GET', `/api/reports?${params}`);
  if (!d) return;

  window._reportData = d;

  // Chart
  const maxVal = Math.max(...(d.byDay.map(x => x.total)), 1);
  const chartBars = d.byDay.length ? d.byDay.map(x => `
    <div class="bar-col" title="${x.day} — ${formatPrice(x.total)}">
      <div class="bar" style="height:${Math.max(4, Math.round((x.total/maxVal)*100))}%"></div>
      <div class="bar-label">${x.day.slice(5)}</div>
    </div>
  `).join('') : '<p class="empty-msg" style="padding:.5rem">Aucune donnée</p>';

  // Top produits
  const topRows = d.topProducts.map((p, i) => `
    <tr>
      <td>${i + 1}</td>
      <td><strong>${escapeHtml(p.name)}</strong><br><span class="text-muted">${categoryLabel(p.category)}</span></td>
      <td>${p.qty}</td>
      <td class="price">${formatPrice(p.revenue)}</td>
    </tr>
  `).join('');

  // Par vendeur
  const sellerRows = d.bySeller.map(s => `
    <tr>
      <td>${escapeHtml(s.username)}</td>
      <td>${s.count}</td>
      <td class="price">${formatPrice(s.revenue)}</td>
    </tr>
  `).join('');

  // Par catégorie
  const catRows = d.byCategory.map(c => `
    <tr>
      <td>${categoryIcon(c.category)} ${categoryLabel(c.category)}</td>
      <td>${c.qty}</td>
      <td class="price">${formatPrice(c.revenue)}</td>
    </tr>
  `).join('');

  document.getElementById('report-content').innerHTML = `
    <div class="stats-grid" style="margin-bottom:1.5rem">
      <div class="stat-card">
        <div class="stat-icon green">💶</div>
        <div class="stat-info"><div class="stat-value">${formatPrice(d.revenue)}</div><div class="stat-label">Chiffre d'affaires</div></div>
      </div>
      <div class="stat-card">
        <div class="stat-icon purple">🧾</div>
        <div class="stat-info"><div class="stat-value">${d.count}</div><div class="stat-label">Lignes de vente</div></div>
      </div>
      <div class="stat-card">
        <div class="stat-icon blue">📊</div>
        <div class="stat-info"><div class="stat-value">${d.count > 0 ? formatPrice(Math.round(d.revenue / d.count)) : '—'}</div><div class="stat-label">Panier moyen</div></div>
      </div>
    </div>

    <div class="chart-wrap" style="margin-bottom:1.5rem">
      <div class="chart-title">📈 Évolution des ventes</div>
      <div class="bar-chart">${chartBars}</div>
    </div>

    <div style="display:grid;grid-template-columns:1fr 1fr;gap:1.25rem;margin-bottom:1.5rem">
      <div>
        <div class="section-title">🏆 Top produits</div>
        ${d.topProducts.length ? `
          <div class="table-container">
            <table class="data-table">
              <thead><tr><th>#</th><th>Produit</th><th>Qté</th><th>Revenu</th></tr></thead>
              <tbody>${topRows}</tbody>
            </table>
          </div>
        ` : '<p class="empty-msg">Aucune donnée</p>'}
      </div>
      <div>
        <div class="section-title">👕 Par catégorie</div>
        ${d.byCategory.length ? `
          <div class="table-container">
            <table class="data-table">
              <thead><tr><th>Catégorie</th><th>Qté</th><th>Revenu</th></tr></thead>
              <tbody>${catRows}</tbody>
            </table>
          </div>
        ` : '<p class="empty-msg">Aucune donnée</p>'}
      </div>
    </div>

    <div class="section-title">👥 Par vendeur</div>
    ${d.bySeller.length ? `
      <div class="table-container">
        <table class="data-table">
          <thead><tr><th>Vendeur</th><th>Nb lignes</th><th>CA total</th></tr></thead>
          <tbody>${sellerRows}</tbody>
        </table>
      </div>
    ` : '<p class="empty-msg">Aucune donnée</p>'}
  `;
}

function exportReportCSV() {
  const d = window._reportData;
  if (!d) { toast('Aucun rapport chargé', 'warning'); return; }

  let csv = 'RAPPORT BOUTIQUESTOCK\n\n';
  csv += `CA Total;${Math.round(d.revenue)} F CFA\nNb ventes;${d.count}\n\n`;

  csv += 'TOP PRODUITS\nProduit;Catégorie;Quantité;Revenu\n';
  d.topProducts.forEach(p => {
    csv += `${p.name};${categoryLabel(p.category)};${p.qty};${Math.round(p.revenue)}\n`;
  });

  csv += '\nPAR VENDEUR\nVendeur;Nb ventes;Revenu\n';
  d.bySeller.forEach(s => {
    csv += `${s.username};${s.count};${Math.round(s.revenue)}\n`;
  });

  csv += '\nPAR JOUR\nDate;Total;Nb ventes\n';
  d.byDay.forEach(x => {
    csv += `${x.day};${Math.round(x.total)};${x.count}\n`;
  });

  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href = url; a.download = `rapport-boutiquestock-${new Date().toISOString().slice(0,10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
  toast('CSV exporté avec succès', 'success');
}

function printReport() {
  window.print();
}

/* =================================================
   VENDEURS
================================================= */
let _cachedUsers = [];

async function renderSellers() {
  _cachedUsers = await api('GET', '/api/users') || [];
  const admins  = _cachedUsers.filter(u => u.role === 'admin');
  const sellers = _cachedUsers.filter(u => u.role === 'vendeur');

  const sellerCard = (u) => `
    <div class="seller-card">
      <div class="seller-avatar ${u.role === 'admin' ? 'admin-av' : ''}">${initials(u.username)}</div>
      <div class="seller-info">
        <div class="seller-name">${escapeHtml(u.username)}</div>
        <div class="seller-role">${u.role === 'admin' ? '👑 Administrateur' : '🙋 Vendeur'} · Depuis le ${formatDateShort(u.created_at)}</div>
      </div>
      <div class="seller-actions">
        <button class="btn btn-sm btn-secondary btn-icon" onclick="showUserModal(${u.id})" title="Modifier">✏️</button>
        ${u.id !== currentUser.id ? `<button class="btn btn-sm btn-danger btn-icon" onclick="deleteUser(${u.id}, '${u.username.replace(/'/g, "\\'")}')" title="Supprimer">🗑️</button>` : ''}
      </div>
    </div>
  `;

  setView(`
    <div class="view-header">
      <div><h2>👥 Gestion des vendeurs</h2><div class="view-subtitle">${_cachedUsers.length} utilisateur(s)</div></div>
      <button class="btn btn-primary" onclick="showUserModal()">+ Ajouter un vendeur</button>
    </div>

    ${admins.length ? `
      <div class="section-title" style="margin-bottom:.75rem">👑 Administrateurs</div>
      <div class="sellers-grid" style="margin-bottom:1.5rem">${admins.map(sellerCard).join('')}</div>
    ` : ''}

    <div class="section-title" style="margin-bottom:.75rem">🙋 Vendeurs (${sellers.length})</div>
    ${sellers.length ? `<div class="sellers-grid">${sellers.map(sellerCard).join('')}</div>` : '<p class="empty-msg">Aucun vendeur. Ajoutez-en un !</p>'}
  `);
}

function _getUserName(id) { return (_cachedUsers.find(x => x.id === id) || {}).username || ''; }
function _getUserRole(id) { return (_cachedUsers.find(x => x.id === id) || {}).role || 'vendeur'; }

function showUserModal(userId = null) {
  openModal(userId ? 'Modifier l\'utilisateur' : 'Ajouter un vendeur', `
    <form id="user-form" onsubmit="saveUser(event, ${userId || 'null'})">
      <div class="form-group">
        <label>Identifiant <span class="required">*</span></label>
        <input class="form-control" id="u-username" name="username" required placeholder="ex: marie" autofocus
          ${userId ? `value="${_getUserName(userId)}"` : ''}>
      </div>
      <div class="form-group">
        <label>${userId ? 'Nouveau mot de passe' : 'Mot de passe'} ${userId ? '' : '<span class="required">*</span>'}</label>
        <input class="form-control" name="password" type="password"
          placeholder="${userId ? 'Laisser vide pour ne pas changer' : 'Choisir un mot de passe'}"
          ${userId ? '' : 'required'} autocomplete="new-password">
        ${userId ? '<div class="text-muted mt-1">Laissez vide pour conserver le mot de passe actuel.</div>' : ''}
      </div>
      <div class="form-group">
        <label>Rôle</label>
        <select class="form-control" name="role">
          <option value="vendeur" ${!userId || _getUserRole(userId) === 'vendeur' ? 'selected' : ''}>Vendeur</option>
          <option value="admin"   ${userId && _getUserRole(userId) === 'admin' ? 'selected' : ''}>Administrateur</option>
        </select>
      </div>
      <div class="form-actions">
        <button type="button" class="btn btn-secondary" onclick="closeModal()">Annuler</button>
        <button type="submit" class="btn btn-primary">💾 Enregistrer</button>
      </div>
    </form>
  `);
}

async function saveUser(e, userId) {
  e.preventDefault();
  const fd = new FormData(e.target);
  const data = { username: fd.get('username').trim(), password: fd.get('password') || undefined, role: fd.get('role') };
  if (!data.password) delete data.password;
  const btn = e.target.querySelector('[type=submit]');
  btn.disabled = true; btn.textContent = 'Enregistrement...';
  try {
    if (userId) {
      await api('PUT', `/api/users/${userId}`, data);
      toast('Utilisateur modifié', 'success');
    } else {
      await api('POST', '/api/users', data);
      toast('Vendeur ajouté avec succès', 'success');
    }
    closeModal();
    await renderSellers();
  } catch (err) {
    toast(err.message, 'error');
    btn.disabled = false; btn.textContent = '💾 Enregistrer';
  }
}

function deleteUser(userId, username) {
  openModal('Supprimer l\'utilisateur', `
    <p class="confirm-text">
      Voulez-vous vraiment supprimer le compte <strong>${escapeHtml(username)}</strong> ?
      <br><br><span class="text-danger">⚠️ Cette action est irréversible.</span>
    </p>
    <div class="form-actions">
      <button class="btn btn-secondary" onclick="closeModal()">Annuler</button>
      <button class="btn btn-danger" onclick="confirmDeleteUser(${userId})">🗑️ Supprimer</button>
    </div>
  `);
}

async function confirmDeleteUser(userId) {
  try {
    await api('DELETE', `/api/users/${userId}`);
    toast('Utilisateur supprimé', 'success');
    closeModal();
    await renderSellers();
  } catch (err) { toast(err.message, 'error'); }
}

/* =================================================
   GESTION DES PRIX
================================================= */
async function renderPrices() {
  allProducts = await api('GET', '/api/products') || [];
  const grouped = {};
  allProducts.forEach(p => { (grouped[p.category] = grouped[p.category] || []).push(p); });
  const allCats = [...new Set([...CAT_DISPLAY_ORDER, ...Object.keys(grouped)])];

  const sections = allCats.filter(k => grouped[k]).map(cat => {
    const rows = grouped[cat].map(p => {
      const priceDetail = p.price_unit || Math.round(p.price / 12);
      return `
        <tr id="price-row-${p.id}">
          <td><div style="font-weight:600">${p.name}</div></td>
          <td>
            <div class="price-input-wrap">
              <input class="price-input" type="number" min="0" step="1"
                id="pgros-${p.id}" value="${p.price}"
                onchange="markPriceChanged(${p.id})"
                onkeydown="if(event.key==='Enter') saveSinglePrice(${p.id})">
              <span class="price-currency">F CFA</span>
            </div>
          </td>
          <td>
            <div class="price-input-wrap">
              <input class="price-input" type="number" min="0" step="1"
                id="pdet-${p.id}" value="${priceDetail}"
                onchange="markPriceChanged(${p.id})"
                onkeydown="if(event.key==='Enter') saveSinglePrice(${p.id})">
              <span class="price-currency">F CFA</span>
            </div>
          </td>
          <td>
            <button class="btn btn-sm btn-secondary" id="save-btn-${p.id}"
              onclick="saveSinglePrice(${p.id})" style="opacity:.4;pointer-events:none">
              💾 Sauver
            </button>
          </td>
        </tr>
      `;
    }).join('');

    return `
      <div class="category-section">
        <div class="category-title">${categoryIcon(cat)} ${categoryLabel(cat)}<span class="category-count">${grouped[cat].length}</span></div>
        <div class="table-container">
          <table class="data-table">
            <thead><tr><th>Produit</th><th>💰 Prix Gros</th><th>🏷️ Prix Détail</th><th></th></tr></thead>
            <tbody>${rows}</tbody>
          </table>
        </div>
      </div>
    `;
  }).join('');

  setView(`
    <div class="view-header">
      <div><h2>💰 Gestion des prix</h2><div class="view-subtitle">Modifiez un prix et cliquez 💾 Sauver — ou appuyez sur Entrée</div></div>
      <button class="btn btn-success" onclick="saveAllPrices()">💾 Tout sauvegarder</button>
    </div>
    <div class="info-box" style="margin-bottom:1.25rem">
      💡 Laissez le <strong>Prix Détail</strong> à 0 pour le calculer automatiquement (Prix Gros ÷ 12).
    </div>
    ${sections}
  `);
}

function markPriceChanged(productId) {
  const btn = document.getElementById(`save-btn-${productId}`);
  if (btn) {
    btn.style.opacity = '1'; btn.style.pointerEvents = 'auto';
    btn.classList.add('btn-primary'); btn.classList.remove('btn-secondary');
  }
}

async function saveSinglePrice(productId) {
  const priceGros   = parseFloat(document.getElementById(`pgros-${productId}`)?.value) || 0;
  const priceDetail = parseFloat(document.getElementById(`pdet-${productId}`)?.value) || 0;
  const btn         = document.getElementById(`save-btn-${productId}`);
  if (btn) { btn.textContent = '⏳'; btn.disabled = true; }
  try {
    await api('PUT', `/api/products/${productId}`, { price: priceGros, price_unit: priceDetail || null });
    if (btn) {
      btn.textContent = '✅ Sauvé';
      btn.classList.remove('btn-primary'); btn.classList.add('btn-secondary');
      setTimeout(() => {
        btn.textContent = '💾 Sauver'; btn.style.opacity = '.4';
        btn.style.pointerEvents = 'none'; btn.disabled = false;
      }, 1500);
    }
    const p = allProducts.find(x => x.id === productId);
    if (p) { p.price = priceGros; p.price_unit = priceDetail || Math.round(priceGros / 12); }
    toast('Prix mis à jour', 'success');
  } catch (err) {
    toast(err.message, 'error');
    if (btn) { btn.textContent = '💾 Sauver'; btn.disabled = false; }
  }
}

async function saveAllPrices() {
  const rows = document.querySelectorAll('[id^="price-row-"]');
  let saved = 0;
  const btn = document.querySelector('.btn-success');
  if (btn) { btn.disabled = true; btn.textContent = '⏳ Sauvegarde...'; }
  for (const row of rows) {
    const id = parseInt(row.id.replace('price-row-', ''));
    const priceGros   = parseFloat(document.getElementById(`pgros-${id}`)?.value) || 0;
    const priceDetail = parseFloat(document.getElementById(`pdet-${id}`)?.value) || 0;
    try {
      await api('PUT', `/api/products/${id}`, { price: priceGros, price_unit: priceDetail || null });
      const p = allProducts.find(x => x.id === id);
      if (p) { p.price = priceGros; p.price_unit = priceDetail || Math.round(priceGros / 12); }
      saved++;
    } catch {}
  }
  if (btn) { btn.disabled = false; btn.textContent = '💾 Tout sauvegarder'; }
  toast(`${saved} prix sauvegardés`, 'success');
  document.querySelectorAll('[id^="save-btn-"]').forEach(b => {
    b.textContent = '💾 Sauver'; b.style.opacity = '.4';
    b.style.pointerEvents = 'none'; b.classList.remove('btn-primary'); b.classList.add('btn-secondary');
  });
}

/* =================================================
   PARAMÈTRES EMAIL
================================================= */
const SMTP_PRESETS = {
  gmail:   { host: 'smtp.gmail.com',          port: '587', secure: '0' },
  outlook: { host: 'smtp-mail.outlook.com',   port: '587', secure: '0' },
  yahoo:   { host: 'smtp.mail.yahoo.com',     port: '587', secure: '0' },
  ovh:     { host: 'ssl0.ovh.net',            port: '465', secure: '1' },
  custom:  { host: '',                         port: '587', secure: '0' },
};

async function renderSettings() {
  const s = await api('GET', '/api/settings');
  if (!s) return;
  const preset = Object.entries(SMTP_PRESETS).find(([, v]) => v.host === s.smtp_host)?.[0] || 'custom';

  setView(`
    <div class="view-header">
      <div><h2>⚙️ Paramètres email</h2><div class="view-subtitle">Alertes automatiques de stock bas</div></div>
    </div>

    <div style="max-width:640px">
      <div class="card" style="margin-bottom:1.25rem">
        <div class="card-header">🔔 Notifications de stock</div>
        <div class="card-body">
          <div class="info-box" style="margin-bottom:1rem">
            Un email est envoyé automatiquement lorsqu'un produit franchit son seuil d'alerte.
          </div>
          <label style="display:flex;align-items:center;gap:.75rem;cursor:pointer;font-weight:500;color:var(--text)">
            <input type="checkbox" id="email-enabled" style="width:18px;height:18px;accent-color:var(--primary)"
              ${s.email_enabled === '1' ? 'checked' : ''}>
            Activer les notifications email
          </label>
        </div>
      </div>

      <div class="card" style="margin-bottom:1.25rem">
        <div class="card-header">📤 Configuration SMTP</div>
        <div class="card-body">
          <div class="form-group">
            <label>Fournisseur de messagerie</label>
            <select class="form-control" id="smtp-preset" onchange="applySmtpPreset(this.value)">
              <option value="gmail"   ${preset==='gmail'   ? 'selected':''}>Gmail</option>
              <option value="outlook" ${preset==='outlook' ? 'selected':''}>Outlook / Hotmail</option>
              <option value="yahoo"   ${preset==='yahoo'   ? 'selected':''}>Yahoo</option>
              <option value="ovh"     ${preset==='ovh'     ? 'selected':''}>OVH</option>
              <option value="custom"  ${preset==='custom'  ? 'selected':''}>Autre / Personnalisé</option>
            </select>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label>Serveur SMTP <span class="required">*</span></label>
              <input class="form-control" id="smtp-host" value="${s.smtp_host}" placeholder="smtp.example.com">
            </div>
            <div class="form-group">
              <label>Port</label>
              <input class="form-control" id="smtp-port" type="number" value="${s.smtp_port || 587}">
            </div>
          </div>
          <div class="form-group">
            <label style="display:flex;align-items:center;gap:.5rem;cursor:pointer;color:var(--text)">
              <input type="checkbox" id="smtp-secure" style="accent-color:var(--primary)" ${s.smtp_secure === '1' ? 'checked' : ''}>
              Connexion SSL/TLS (port 465)
            </label>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label>Identifiant <span class="required">*</span></label>
              <input class="form-control" id="smtp-user" type="email" value="${s.smtp_user}">
            </div>
            <div class="form-group">
              <label>Mot de passe <span class="required">*</span></label>
              <input class="form-control" id="smtp-pass" type="password" value="${s.smtp_pass}">
            </div>
          </div>
        </div>
      </div>

      <div class="card" style="margin-bottom:1.25rem">
        <div class="card-header">📬 Destinataire</div>
        <div class="card-body">
          <div class="form-row">
            <div class="form-group">
              <label>Email destinataire <span class="required">*</span></label>
              <input class="form-control" id="alert-email" type="email" value="${s.alert_email}">
            </div>
            <div class="form-group">
              <label>Nom de l'expéditeur</label>
              <input class="form-control" id="from-name" value="${s.from_name || 'BoutiqueStock'}">
            </div>
          </div>
        </div>
      </div>

      <div style="display:flex;gap:.75rem;flex-wrap:wrap">
        <button class="btn btn-primary" onclick="saveSettings()">💾 Enregistrer</button>
        <button class="btn btn-secondary" onclick="testEmail()" id="test-btn">📧 Email de test</button>
      </div>
      <div id="settings-msg" style="margin-top:1rem"></div>
    </div>
  `);
}

function applySmtpPreset(preset) {
  const p = SMTP_PRESETS[preset];
  if (!p) return;
  if (p.host) document.getElementById('smtp-host').value = p.host;
  document.getElementById('smtp-port').value   = p.port;
  document.getElementById('smtp-secure').checked = p.secure === '1';
}

function getSettingsFormData() {
  return {
    email_enabled: document.getElementById('email-enabled').checked ? '1' : '0',
    smtp_host:     document.getElementById('smtp-host').value.trim(),
    smtp_port:     document.getElementById('smtp-port').value.trim(),
    smtp_secure:   document.getElementById('smtp-secure').checked ? '1' : '0',
    smtp_user:     document.getElementById('smtp-user').value.trim(),
    smtp_pass:     document.getElementById('smtp-pass').value,
    alert_email:   document.getElementById('alert-email').value.trim(),
    from_name:     document.getElementById('from-name').value.trim(),
  };
}

async function saveSettings() {
  const msgEl = document.getElementById('settings-msg');
  try {
    await api('PUT', '/api/settings', getSettingsFormData());
    msgEl.innerHTML = '<div class="info-box" style="background:var(--success-light);border-color:#A7F3D0;color:#065F46">✅ Configuration enregistrée avec succès.</div>';
    toast('Paramètres enregistrés', 'success');
  } catch (err) { msgEl.innerHTML = `<div class="error-banner">${err.message}</div>`; }
}

async function testEmail() {
  const btn = document.getElementById('test-btn');
  const msgEl = document.getElementById('settings-msg');
  btn.disabled = true; btn.textContent = '⏳ Envoi...';
  try {
    await api('PUT', '/api/settings', getSettingsFormData());
    const res = await api('POST', '/api/settings/test-email', {});
    msgEl.innerHTML = `<div class="info-box" style="background:var(--success-light);border-color:#A7F3D0;color:#065F46">✅ ${res.message}</div>`;
    toast('Email de test envoyé !', 'success');
  } catch (err) {
    msgEl.innerHTML = `<div class="error-banner">❌ ${err.message}</div>`;
    toast(err.message, 'error');
  } finally {
    btn.disabled = false; btn.textContent = '📧 Email de test';
  }
}

/* ===== INIT ===== */
window.onload = () => {
  initDark();
  checkAuth();
};
