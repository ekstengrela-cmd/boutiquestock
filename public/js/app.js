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
  { id: 'history',   icon: '📋', label: 'Historique des ventes' },
  { id: 'sellers',   icon: '👥', label: 'Vendeurs' },
  { id: 'settings',  icon: '⚙️', label: 'Paramètres email' },
];

const SELLER_VIEWS = [
  { id: 'sell',     icon: '🛒', label: 'Vente' },
  { id: 'products', icon: '👕', label: 'Produits & stocks' },
  { id: 'history',  icon: '📋', label: 'Mes ventes' },
];

/* ===== DONNÉES PRODUITS ===== */
const CATEGORIES = {
  polo_adulte:   'Polo Adulte',
  polo_enfant:   'Polo Enfant',
  tshirt_adulte: 'T-Shirt Adulte',
  tshirt_enfant: 'T-Shirt Enfant',
  casquette:     'Casquette',
};
const CAT_ICONS = {
  polo_adulte: '👔', polo_enfant: '👕', tshirt_adulte: '👕', tshirt_enfant: '👕', casquette: '🧢',
};
const GRAMMAGES = ['120g','140g','150g','160g','170g','180g','190g','200g','210g','220g','240g','260g'];
const SIZES_ADULT    = ['XS','S','M','L','XL','XXL','XXXL'];
const SIZES_CHILD    = ['2-4 ans','4-6 ans','6-8 ans','8-10 ans','10-12 ans','12-14 ans'];
const SIZES_CASQ     = ['Unique','S/M','L/XL'];

/* ===== UTILITAIRES ===== */
function categoryLabel(cat) { return CATEGORIES[cat] || cat; }
function categoryIcon(cat)  { return CAT_ICONS[cat] || '👗'; }

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

function getSizesForCategory(cat) {
  if (cat === 'casquette') return SIZES_CASQ;
  if (cat === 'polo_enfant' || cat === 'tshirt_enfant') return SIZES_CHILD;
  return SIZES_ADULT;
}

function hasGrammage(cat) { return cat !== 'casquette'; }

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
  } catch (err) {
    if (err.message !== 'Erreur serveur') throw err;
    throw err;
  }
}

/* ===== TOASTS ===== */
function toast(msg, type = 'info') {
  const icons = { success: '✅', error: '❌', warning: '⚠️', info: 'ℹ️' };
  const el = document.createElement('div');
  el.className = `toast toast-${type}`;
  el.innerHTML = `<span>${icons[type]}</span><span>${msg}</span>`;
  document.getElementById('toast-container').appendChild(el);
  setTimeout(() => {
    el.style.animation = 'slideOut 0.3s ease forwards';
    setTimeout(() => el.remove(), 300);
  }, 3500);
}

/* ===== MODALE ===== */
function openModal(title, html, wide = false) {
  document.getElementById('modal-title').textContent = title;
  document.getElementById('modal-body').innerHTML = html;
  const modal = document.getElementById('modal');
  modal.className = wide ? 'modal modal-lg' : 'modal';
  document.getElementById('modal-overlay').hidden = false;
}
function closeModal() { document.getElementById('modal-overlay').hidden = true; }
function handleOverlayClick(e) { if (e.target === document.getElementById('modal-overlay')) closeModal(); }

/* ===== AUTH ===== */
async function checkAuth() {
  try {
    const res = await fetch('/api/auth/me');
    if (res.ok) {
      const data = await res.json();
      setupApp(data.user);
    } else {
      showLogin();
    }
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
    const username = document.getElementById('login-username').value;
    const password = document.getElementById('login-password').value;
    const errEl = document.getElementById('login-error');
    try {
      const data = await api('POST', '/api/auth/login', { username, password });
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
    <a class="nav-item" data-view="${v.id}" href="#" onclick="navigate('${v.id}'); return false;">
      <span class="nav-icon">${v.icon}</span>
      <span>${v.label}</span>
    </a>
  `).join('');

  navigate(user.role === 'admin' ? 'dashboard' : 'sell');
}

function navigate(viewId) {
  document.querySelectorAll('.nav-item').forEach(el => {
    el.classList.toggle('active', el.dataset.view === viewId);
  });
  setView('<div class="loading">⏳ Chargement...</div>');
  const fns = { dashboard: renderDashboard, products: renderProducts, stock: renderStock, prices: renderPrices, sell: renderSell, history: renderHistory, sellers: renderSellers, settings: renderSettings };
  if (fns[viewId]) fns[viewId]().catch(err => setView(`<p class="empty-msg text-danger">Erreur: ${err.message}</p>`));
}

function setView(html) { document.getElementById('view-container').innerHTML = html; }

/* ===================================================
   TABLEAU DE BORD
=================================================== */
async function renderDashboard() {
  const s = await api('GET', '/api/dashboard/stats');
  if (!s) return;

  const alertsHtml = s.lowStockList.length ? `
    <div class="alert-section">
      <div class="section-title">⚠️ Alertes stock bas (${s.lowStockList.length})</div>
      <div class="alert-grid">
        ${s.lowStockList.map(p => `
          <div class="alert-card ${p.stock === 0 ? 'out-of-stock' : 'low-stock'}">
            <div class="alert-product">${p.name}</div>
            <div class="alert-details">${categoryLabel(p.category)}${p.grammage ? ' · ' + p.grammage : ''}${p.size ? ' · ' + p.size : ''}${p.color ? ' · ' + p.color : ''}</div>
            <div class="alert-stock">${p.stock === 0 ? '❌ Rupture de stock' : '⚠️ ' + p.stock + ' restant(s)'}</div>
          </div>
        `).join('')}
      </div>
    </div>
  ` : `<div class="info-box">✅ Tous les stocks sont au-dessus des seuils d'alerte.</div>`;

  const recentHtml = s.recentSales.length ? `
    <div class="table-container">
      <table class="data-table">
        <thead><tr><th>Date</th><th>Vendeur</th><th>Produit</th><th>Qté</th><th>Total</th></tr></thead>
        <tbody>
          ${s.recentSales.map(r => `
            <tr>
              <td>${formatDate(r.created_at)}</td>
              <td>${r.seller_name}</td>
              <td>${r.product_name}${r.size ? ' · ' + r.size : ''}${r.color ? ' · ' + r.color : ''}</td>
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
      <div><h2>Tableau de bord</h2><div class="view-subtitle">Vue d'ensemble en temps réel</div></div>
    </div>

    <div class="stats-grid">
      <div class="stat-card">
        <div class="stat-icon blue">📦</div>
        <div class="stat-info"><div class="stat-value">${s.totalProducts}</div><div class="stat-label">Références produits</div></div>
      </div>
      <div class="stat-card">
        <div class="stat-icon orange">⚠️</div>
        <div class="stat-info"><div class="stat-value">${s.lowStockItems + s.outOfStock}</div><div class="stat-label">Alertes stock</div></div>
      </div>
      <div class="stat-card">
        <div class="stat-icon green">💶</div>
        <div class="stat-info"><div class="stat-value">${formatPrice(s.totalSalesToday)}</div><div class="stat-label">Ventes aujourd'hui</div></div>
      </div>
      <div class="stat-card">
        <div class="stat-icon purple">🧾</div>
        <div class="stat-info"><div class="stat-value">${s.countToday}</div><div class="stat-label">Transactions aujourd'hui</div></div>
      </div>
      <div class="stat-card">
        <div class="stat-icon orange">💰</div>
        <div class="stat-info"><div class="stat-value">${formatPrice(s.totalRevenue)}</div><div class="stat-label">CA total</div></div>
      </div>
    </div>

    ${alertsHtml}

    <div class="recent-section">
      <div class="section-title">🕒 Dernières ventes</div>
      ${recentHtml}
    </div>
  `);
}

/* ===================================================
   PRODUITS
=================================================== */
async function renderProducts() {
  allProducts = await api('GET', '/api/products') || [];
  _renderProductsView(allProducts);
}

function _renderProductsView(products) {
  const isAdmin = currentUser.role === 'admin';

  const grouped = {};
  products.forEach(p => { (grouped[p.category] = grouped[p.category] || []).push(p); });

  const tableRows = (prods) => prods.map(p => `
    <tr class="${p.stock === 0 ? 'row-out' : p.stock <= p.low_stock_threshold ? 'row-low' : ''}">
      <td><strong>${p.name}</strong></td>
      <td>${p.grammage || '—'}</td>
      <td>${p.size || '—'}</td>
      <td>${p.color || '—'}</td>
      ${isAdmin ? `<td class="price">${formatPrice(p.price)}</td>` : ''}
      <td>
        <span class="badge ${p.stock === 0 ? 'badge-danger' : p.stock <= p.low_stock_threshold ? 'badge-warning' : 'badge-success'}">
          ${p.stock}
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

  const categorySections = Object.entries(CATEGORIES)
    .filter(([k]) => grouped[k])
    .map(([k, label]) => `
      <div class="category-section">
        <div class="category-title">
          ${categoryIcon(k)} ${label}
          <span class="category-count">${grouped[k].length}</span>
        </div>
        <div class="table-container">
          <table class="data-table">
            <thead>
              <tr>
                <th>Nom</th><th>Grammage</th><th>Taille</th><th>Couleur</th>
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
      <div><h2>Produits</h2><div class="view-subtitle">${products.length} référence(s) au total</div></div>
      ${isAdmin ? '<button class="btn btn-primary" onclick="showProductModal()">+ Ajouter un produit</button>' : ''}
    </div>

    <div class="filters-bar">
      <div class="search-input">
        <span class="search-icon">🔍</span>
        <input type="text" placeholder="Rechercher..." oninput="filterProductsView(this.value)" id="prod-search">
      </div>
      <select class="filter-select" onchange="filterProductsView(document.getElementById('prod-search')?.value||'', this.value)" id="prod-cat-filter">
        <option value="">Toutes les catégories</option>
        ${Object.entries(CATEGORIES).map(([k, v]) => `<option value="${k}">${v}</option>`).join('')}
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
    const matchSearch = !search || [p.name, p.grammage, p.size, p.color, categoryLabel(p.category)]
      .some(v => v && v.toLowerCase().includes(search));
    const matchCat = !category || p.category === category;
    return matchSearch && matchCat;
  });
  _renderProductsView(filtered);
  // Restore filter values after re-render
  const si = document.getElementById('prod-search');
  const ci = document.getElementById('prod-cat-filter');
  if (si) si.value = search;
  if (ci) ci.value = category;
  si?.focus();
}

/* ===== MODAL PRODUIT ===== */
function showProductModal(productId = null) {
  const p = productId ? allProducts.find(x => x.id === productId) : null;
  const title = p ? 'Modifier le produit' : 'Ajouter un produit';

  const grammageOptions = GRAMMAGES.map(g => `<option value="${g}" ${p?.grammage === g ? 'selected' : ''}>${g}</option>`).join('');

  const sizeOptionsFor = (cat) => {
    const sizes = getSizesForCategory(cat || '');
    return sizes.map(s => `<option value="${s}" ${p?.size === s ? 'selected' : ''}>${s}</option>`).join('');
  };

  openModal(title, `
    <form id="product-form" onsubmit="saveProduct(event, ${productId || 'null'})">
      <div class="form-row">
        <div class="form-group">
          <label>Nom <span class="required">*</span></label>
          <input class="form-control" name="name" required value="${p?.name || ''}" placeholder="ex: Polo Classic">
        </div>
        <div class="form-group">
          <label>Catégorie <span class="required">*</span></label>
          <select class="form-control" name="category" required onchange="onCategoryChange(this.value)" id="prod-cat-select">
            <option value="">— Choisir —</option>
            ${Object.entries(CATEGORIES).map(([k, v]) => `<option value="${k}" ${p?.category === k ? 'selected' : ''}>${v}</option>`).join('')}
          </select>
        </div>
      </div>

      <div class="form-row">
        <div class="form-group" id="grammage-group" ${!hasGrammage(p?.category) ? 'style="display:none"' : ''}>
          <label>Grammage</label>
          <select class="form-control" name="grammage" id="grammage-select">
            <option value="">— Choisir —</option>
            ${grammageOptions}
          </select>
        </div>
        <div class="form-group" id="size-group">
          <label>Taille</label>
          <select class="form-control" name="size" id="size-select">
            <option value="">— Choisir —</option>
            ${p?.category ? sizeOptionsFor(p.category) : ''}
          </select>
        </div>
      </div>

      <div class="form-group">
        <label>Couleur</label>
        <input class="form-control" name="color" value="${p?.color || ''}" placeholder="ex: Blanc, Noir...">
      </div>

      <div class="form-row">
        <div class="form-group">
          <label>Prix à la douzaine (F CFA) <span class="required">*</span></label>
          <input class="form-control" name="price" type="number" step="1" min="0" required value="${p?.price ?? ''}" placeholder="ex: 12500">
        </div>
        <div class="form-group">
          <label>Prix à l'unité (F CFA)</label>
          <input class="form-control" name="price_unit" type="number" step="1" min="0" value="${p?.price_unit ?? ''}" placeholder="Auto = douzaine ÷ 12">
          <div class="text-muted mt-1">Laissez vide pour calculer automatiquement.</div>
        </div>
      </div>

      <div class="form-row">
        <div class="form-group">
          <label>Stock ${p ? 'actuel' : 'initial'}</label>
          <input class="form-control" name="stock" type="number" min="0" value="${p?.stock ?? 0}">
        </div>
        <div class="form-group">
          <label>Seuil alerte stock</label>
          <input class="form-control" name="low_stock_threshold" type="number" min="0" value="${p?.low_stock_threshold ?? 5}">
        </div>
      </div>

      <div class="form-actions">
        <button type="button" class="btn btn-secondary" onclick="closeModal()">Annuler</button>
        <button type="submit" class="btn btn-primary">💾 Enregistrer</button>
      </div>
    </form>
  `);

  // Init size options if editing
  if (p?.category) onCategoryChange(p.category, true);
}

function onCategoryChange(cat, keepValues = false) {
  const grammageGroup = document.getElementById('grammage-group');
  const sizeSelect    = document.getElementById('size-select');
  const currentSize   = keepValues ? sizeSelect?.value : '';

  if (grammageGroup) grammageGroup.style.display = hasGrammage(cat) ? '' : 'none';

  if (sizeSelect) {
    const sizes = getSizesForCategory(cat);
    sizeSelect.innerHTML = '<option value="">— Choisir —</option>' +
      sizes.map(s => `<option value="${s}" ${s === currentSize ? 'selected' : ''}>${s}</option>`).join('');
  }
}

async function saveProduct(e, productId) {
  e.preventDefault();
  const fd = new FormData(e.target);
  const priceUnit = fd.get('price_unit');
  const data = {
    name: fd.get('name').trim(),
    category: fd.get('category'),
    grammage: fd.get('grammage') || null,
    size: fd.get('size') || null,
    color: fd.get('color')?.trim() || null,
    price: parseFloat(fd.get('price')),
    price_unit: priceUnit ? parseFloat(priceUnit) : null,
    stock: parseInt(fd.get('stock')) || 0,
    low_stock_threshold: parseInt(fd.get('low_stock_threshold')) || 5,
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
      Voulez-vous vraiment supprimer <strong>${p.name}</strong>
      ${p.size ? '(taille ' + p.size + ')' : ''}
      ${p.color ? '· ' + p.color : ''} ?
      <br><br>
      <span class="text-danger">⚠️ Cette action est irréversible. L'historique des ventes associé sera conservé.</span>
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
  } catch (err) {
    toast(err.message, 'error');
  }
}

/* ===================================================
   GESTION DU STOCK
=================================================== */
async function renderStock() {
  allProducts = await api('GET', '/api/products') || [];
  _renderStockView(allProducts);
}

function _renderStockView(products) {
  const sorted = [...products].sort((a, b) => a.stock - b.stock);
  const outCount  = sorted.filter(p => p.stock === 0).length;
  const lowCount  = sorted.filter(p => p.stock > 0 && p.stock <= p.low_stock_threshold).length;
  const okCount   = sorted.filter(p => p.stock > p.low_stock_threshold).length;

  const rows = sorted.map(p => `
    <tr class="${p.stock === 0 ? 'row-out' : p.stock <= p.low_stock_threshold ? 'row-low' : ''}">
      <td>
        <div style="font-weight:600">${p.name}</div>
        <div class="text-muted">${categoryLabel(p.category)}${p.grammage ? ' · ' + p.grammage : ''}${p.size ? ' · ' + p.size : ''}${p.color ? ' · ' + p.color : ''}</div>
      </td>
      <td>
        <span class="badge ${p.stock === 0 ? 'badge-danger' : p.stock <= p.low_stock_threshold ? 'badge-warning' : 'badge-success'}">
          ${p.stock === 0 ? '❌ Rupture' : p.stock + ' unité(s)'}
        </span>
      </td>
      <td>${p.low_stock_threshold}</td>
      <td class="col-actions">
        <button class="btn btn-sm btn-primary" onclick="showStockModal(${p.id})">+ Ajouter stock</button>
        <button class="btn btn-sm btn-secondary" onclick="showSetStockModal(${p.id})">= Définir</button>
      </td>
    </tr>
  `).join('');

  setView(`
    <div class="view-header">
      <div><h2>Gestion du stock</h2><div class="view-subtitle">${products.length} références</div></div>
    </div>

    <div class="stats-grid" style="margin-bottom:1.25rem">
      <div class="stat-card">
        <div class="stat-icon red">❌</div>
        <div class="stat-info"><div class="stat-value">${outCount}</div><div class="stat-label">Ruptures de stock</div></div>
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
      <select class="filter-select" onchange="filterStockView('', this.value)" id="stock-status-filter">
        <option value="">Tous les statuts</option>
        <option value="out">Ruptures</option>
        <option value="low">Stocks bas</option>
        <option value="ok">Stocks OK</option>
      </select>
      <select class="filter-select" onchange="filterStockView('','',this.value)" id="stock-cat-filter">
        <option value="">Toutes les catégories</option>
        ${Object.entries(CATEGORIES).map(([k,v]) => `<option value="${k}">${v}</option>`).join('')}
      </select>
    </div>

    <div class="table-container" id="stock-table-container">
      <table class="data-table">
        <thead><tr><th>Produit</th><th>Stock actuel</th><th>Seuil alerte</th><th>Actions</th></tr></thead>
        <tbody id="stock-tbody">${rows}</tbody>
      </table>
    </div>
  `);
}

function filterStockView(search = '', status = '', cat = '') {
  search = (search || document.getElementById('stock-search')?.value || '').toLowerCase();
  status = status || document.getElementById('stock-status-filter')?.value || '';
  cat    = cat    || document.getElementById('stock-cat-filter')?.value || '';

  const filtered = allProducts.filter(p => {
    const matchSearch = !search || [p.name, categoryLabel(p.category), p.size, p.grammage, p.color]
      .some(v => v && v.toLowerCase().includes(search));
    const matchCat = !cat || p.category === cat;
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
        <div style="font-weight:600">${p.name}</div>
        <div class="text-muted">${categoryLabel(p.category)}${p.grammage ? ' · ' + p.grammage : ''}${p.size ? ' · ' + p.size : ''}${p.color ? ' · ' + p.color : ''}</div>
      </td>
      <td>
        <span class="badge ${p.stock === 0 ? 'badge-danger' : p.stock <= p.low_stock_threshold ? 'badge-warning' : 'badge-success'}">
          ${p.stock === 0 ? '❌ Rupture' : p.stock + ' unité(s)'}
        </span>
      </td>
      <td>${p.low_stock_threshold}</td>
      <td class="col-actions">
        <button class="btn btn-sm btn-primary" onclick="showStockModal(${p.id})">+ Ajouter stock</button>
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
      Produit : <strong>${p.name}</strong>${p.size ? ' · ' + p.size : ''}${p.color ? ' · ' + p.color : ''}<br>
      Stock actuel : <strong>${p.stock} unité(s)</strong>
    </div>
    <form onsubmit="submitStock(event, ${productId}, 'add')">
      <div class="form-group">
        <label>Quantité à ajouter <span class="required">*</span></label>
        <input class="form-control" id="stock-qty" type="number" min="1" required placeholder="ex: 50" autofocus>
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
      Produit : <strong>${p.name}</strong>${p.size ? ' · ' + p.size : ''}${p.color ? ' · ' + p.color : ''}<br>
      Stock actuel : <strong>${p.stock} unité(s)</strong>
    </div>
    <form onsubmit="submitStock(event, ${productId}, 'set')">
      <div class="form-group">
        <label>Nouveau stock <span class="required">*</span></label>
        <input class="form-control" id="stock-qty" type="number" min="0" required value="${p.stock}" autofocus>
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
  const qty = parseInt(document.getElementById('stock-qty').value);
  try {
    await api('PATCH', `/api/products/${productId}/stock`, { quantity: qty, mode });
    toast('Stock mis à jour avec succès', 'success');
    closeModal();
    await renderStock();
  } catch (err) {
    toast(err.message, 'error');
  }
}

/* ===================================================
   VENTE
=================================================== */
async function renderSell() {
  allProducts = await api('GET', '/api/products') || [];
  _renderSellView();
}

function _renderSellView(filterCat = '', filterSearch = '') {
  let filtered = allProducts;
  if (filterCat) filtered = filtered.filter(p => p.category === filterCat);
  if (filterSearch) filtered = filtered.filter(p =>
    [p.name, p.grammage, p.size, p.color, categoryLabel(p.category)]
      .some(v => v && v.toLowerCase().includes(filterSearch.toLowerCase()))
  );

  const cards = filtered.map(p => {
    const inCartDz  = cart.find(c => c.product_id === p.id && c.unit_type === 'douzaine');
    const inCartUnit = cart.find(c => c.product_id === p.id && c.unit_type === 'unite');
    const outOfStock = p.stock === 0;
    const priceUnit  = p.price_unit || Math.round(p.price / 12);
    return `
      <div class="product-card ${outOfStock ? 'out-of-stock-card' : ''}">
        <div class="product-card-cat">${categoryIcon(p.category)} ${categoryLabel(p.category)}</div>
        <div class="product-card-name">${p.name}</div>
        <div class="product-card-details">
          ${[p.grammage, p.size, p.color].filter(Boolean).join(' · ') || '&nbsp;'}
        </div>
        <div class="product-card-prices">
          <span class="price-dz">Dz : ${formatPrice(p.price)}</span>
          <span class="price-unit">Unité : ${formatPrice(priceUnit)}</span>
        </div>
        <div class="product-card-stock">
          <span class="badge ${outOfStock ? 'badge-danger' : p.stock <= p.low_stock_threshold ? 'badge-warning' : 'badge-success'}">
            ${outOfStock ? 'Rupture' : p.stock + ' dispo'}
          </span>
        </div>
        ${!outOfStock ? `
          <div class="product-card-btns">
            <button class="btn-sell-dz ${inCartDz ? 'active' : ''}" onclick="addToCart(${p.id},'douzaine')">
              📦 Douzaine${inCartDz ? ' ×' + inCartDz.quantity : ''}
            </button>
            <button class="btn-sell-unit ${inCartUnit ? 'active' : ''}" onclick="addToCart(${p.id},'unite')">
              1️⃣ Unité${inCartUnit ? ' ×' + inCartUnit.quantity : ''}
            </button>
          </div>
        ` : ''}
      </div>
    `;
  }).join('');

  const cartHtml = cart.length === 0 ? `
    <div class="cart-empty">
      <div class="cart-empty-icon">🛒</div>
      <div>Cliquez sur Douzaine ou Unité<br>pour ajouter un article</div>
    </div>
  ` : cart.map((item, idx) => {
    const p = allProducts.find(x => x.id === item.product_id);
    if (!p) return '';
    const isDz      = item.unit_type !== 'unite';
    const unitPrice = isDz ? p.price : (p.price_unit || Math.round(p.price / 12));
    const sub       = [p.grammage, p.size, p.color].filter(Boolean).join(' · ') || categoryLabel(p.category);
    return `
      <div class="cart-item">
        <div class="cart-item-info">
          <div class="cart-item-name">${p.name}</div>
          <div class="cart-item-sub">
            ${sub}
            <span class="cart-unit-badge ${isDz ? 'badge-dz' : 'badge-unit'}">${isDz ? 'Dz' : 'Unité'}</span>
          </div>
          <div class="cart-item-uprice">${formatPrice(unitPrice)} / ${isDz ? 'dz' : 'unité'}</div>
        </div>
        <div class="cart-qty-controls">
          <button class="qty-btn" onclick="changeCartQty(${idx}, -1)">−</button>
          <span class="qty-val">${item.quantity}</span>
          <button class="qty-btn" onclick="changeCartQty(${idx}, 1)" ${item.quantity >= p.stock ? 'disabled style="opacity:.4"' : ''}>+</button>
        </div>
        <button class="cart-remove" onclick="removeFromCart(${idx})" title="Retirer">×</button>
      </div>
    `;
  }).join('');

  const total = cart.reduce((sum, item) => {
    const p = allProducts.find(x => x.id === item.product_id);
    if (!p) return sum;
    const isDz      = item.unit_type !== 'unite';
    const unitPrice = isDz ? p.price : (p.price_unit || Math.round(p.price / 12));
    return sum + unitPrice * item.quantity;
  }, 0);

  setView(`
    <div class="view-header" style="margin-bottom:1rem">
      <div><h2>🛒 Vente</h2><div class="view-subtitle">Sélectionnez les articles à vendre</div></div>
    </div>
    <div class="sell-layout">
      <div class="products-panel">
        <div class="filters-bar" style="margin-bottom:0.75rem">
          <div class="search-input">
            <span class="search-icon">🔍</span>
            <input type="text" placeholder="Rechercher un article..." id="sell-search"
              oninput="_renderSellView(document.getElementById('sell-cat').value, this.value)" value="${filterSearch}">
          </div>
          <select class="filter-select" id="sell-cat"
            onchange="_renderSellView(this.value, document.getElementById('sell-search')?.value||'')">
            <option value="">Toutes les catégories</option>
            ${Object.entries(CATEGORIES).map(([k,v]) => `<option value="${k}" ${filterCat===k?'selected':''}>${v}</option>`).join('')}
          </select>
        </div>
        <div class="products-grid">
          ${cards || '<p class="empty-msg">Aucun produit trouvé.</p>'}
        </div>
      </div>

      <div class="cart-panel">
        <div class="cart-header">
          <span>🛒 Panier <span class="badge badge-primary" style="font-size:.75rem">${cart.length}</span></span>
          ${cart.length ? '<button class="btn btn-sm btn-secondary" onclick="clearCart()">Vider</button>' : ''}
        </div>

        <div class="cart-items" id="cart-items-container">
          ${cartHtml}
        </div>

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

function addToCart(productId, unitType = 'douzaine') {
  const p = allProducts.find(x => x.id === productId);
  if (!p || p.stock === 0) return;
  const existing = cart.find(c => c.product_id === productId && c.unit_type === unitType);
  if (existing) {
    if (existing.quantity < p.stock) existing.quantity++;
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
  item.quantity = Math.max(1, Math.min(item.quantity + delta, p?.stock || 999));
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
    return sum + (p ? p.price * item.quantity : 0);
  }, 0);

  const lines = cart.map(item => {
    const p = allProducts.find(x => x.id === item.product_id);
    return `<div class="receipt-row">
      <span>${p.name}${p.size ? ' · ' + p.size : ''}${p.color ? ' · ' + p.color : ''} × ${item.quantity}</span>
      <span>${formatPrice(p.price * item.quantity)}</span>
    </div>`;
  }).join('');

  openModal('Confirmer la vente', `
    <p class="confirm-text" style="margin-bottom:1rem">Récapitulatif de la vente :</p>
    <div class="receipt">
      ${lines}
      <div class="receipt-total"><span>Total</span><span>${formatPrice(total)}</span></div>
    </div>
    <div class="form-actions">
      <button class="btn btn-secondary" onclick="closeModal()">Annuler</button>
      <button class="btn btn-success" onclick="confirmSale()">✅ Confirmer la vente</button>
    </div>
  `);
}

async function confirmSale() {
  const items = cart.map(c => ({ product_id: c.product_id, quantity: c.quantity }));
  try {
    const res = await api('POST', '/api/sales', { items });
    if (!res) return;

    const total      = res.results.reduce((s, r) => s + r.total, 0);
    const totalQty   = res.results.reduce((s, r) => s + r.quantity, 0);
    const saleDate   = new Date();

    const receiptLines = items.map((item, i) => {
      const r   = res.results[i];
      const p   = allProducts.find(x => x.id === item.product_id) || {};
      const sub = [p.grammage, p.size, p.color].filter(Boolean).join(' · ');
      const typeLabel = item.unit_type === 'unite' ? 'unité' : 'douzaine';
      return `
        <div class="receipt-row">
          <span>${r.product_name} × ${r.quantity} <em style="font-size:.8em;color:var(--gray-400)">(${typeLabel})</em></span>
          <span>${formatPrice(r.total)}</span>
        </div>
        ${sub ? `<div style="font-size:.75rem;color:var(--gray-400);margin:-4px 0 4px 0">${sub}</div>` : ''}
      `;
    }).join('');

    // Enrichir les résultats avec les données produit pour l'impression
    const enriched = res.results.map((r, i) => ({
      ...r,
      product_id: items[i]?.product_id,
    }));
    window._lastSale = { results: enriched, total, totalQty, date: saleDate, seller: currentUser.username };

    cart = [];
    openModal('Vente enregistrée ✅', `
      <div class="receipt">
        ${receiptLines}
        <div class="receipt-total"><span>Total encaissé</span><span>${formatPrice(total)}</span></div>
      </div>
      <div class="form-actions" style="justify-content:center;gap:.75rem">
        <button class="btn btn-secondary" onclick="printReceipt()">🖨️ Imprimer le reçu</button>
        <button class="btn btn-primary" onclick="closeModal(); renderSell()">Nouvelle vente</button>
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

  const dateStr = sale.date.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  const timeStr = sale.date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });

  const itemRows = sale.results.map(r => {
    const p = allProducts.find(x => x.id === r.product_id) || {};
    const sub = [p.grammage, p.size, p.color].filter(Boolean).join(' · ');
    return `
      <div class="ticket-item">
        <span class="ticket-item-name">${r.product_name}</span>
        <span class="ticket-item-qty">×${r.quantity}</span>
        <span class="ticket-item-price">${formatPrice(r.total)}</span>
      </div>
      ${sub ? `<div class="ticket-item-sub">${sub}</div>` : ''}
    `;
  }).join('');

  document.getElementById('print-area').innerHTML = `
    <div class="ticket">
      <div class="ticket-header">
        <div class="ticket-shop">👕 BOUTIQUE STOCK</div>
        <div class="ticket-date">${dateStr} — ${timeStr}</div>
        <div class="ticket-seller">Vendeur : ${sale.seller}</div>
      </div>

      <div class="ticket-items">
        ${itemRows}
      </div>

      <div class="ticket-items-count">${sale.totalQty} article(s)</div>

      <div class="ticket-total">
        <span>TOTAL</span>
        <span>${formatPrice(sale.total)}</span>
      </div>

      <div class="ticket-footer">
        Merci de votre visite !<br>
        — BoutiqueStock —
      </div>
    </div>
  `;

  window.print();
}

/* ===================================================
   HISTORIQUE
=================================================== */
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

  const rows = sales.length ? sales.map(s => `
    <tr>
      <td>${formatDate(s.created_at)}</td>
      ${isAdmin ? `<td>${s.seller_name}</td>` : ''}
      <td>
        <div style="font-weight:600">${s.product_name}</div>
        <div class="text-muted">${categoryLabel(s.category)}${s.grammage ? ' · ' + s.grammage : ''}${s.size ? ' · ' + s.size : ''}${s.color ? ' · ' + s.color : ''}</div>
      </td>
      <td>
        ${s.quantity}
        <span class="badge ${s.unit_type === 'unite' ? 'badge-gray' : 'badge-primary'}" style="font-size:.7rem;margin-left:4px">
          ${s.unit_type === 'unite' ? 'Unité' : 'Dz'}
        </span>
      </td>
      <td class="price">${formatPrice(s.unit_price)}</td>
      <td class="price"><strong>${formatPrice(s.total_price)}</strong></td>
    </tr>
  `).join('') : '';

  setView(`
    <div class="view-header">
      <div><h2>Historique des ventes</h2><div class="view-subtitle">${sales.length} vente(s) · Total : ${formatPrice(total)}</div></div>
    </div>

    <div class="filters-bar">
      <div class="form-group" style="margin:0;display:flex;align-items:center;gap:.5rem">
        <label style="white-space:nowrap;font-size:.85rem;color:var(--gray-600)">Du</label>
        <input type="date" class="filter-select" id="hist-from">
      </div>
      <div class="form-group" style="margin:0;display:flex;align-items:center;gap:.5rem">
        <label style="white-space:nowrap;font-size:.85rem;color:var(--gray-600)">Au</label>
        <input type="date" class="filter-select" id="hist-to">
      </div>
      ${isAdmin ? `
        <select class="filter-select" id="hist-seller">
          <option value="">Tous les vendeurs</option>
          ${sellers.map(u => `<option value="${u.id}">${u.username} (${u.role})</option>`).join('')}
        </select>
      ` : ''}
      <select class="filter-select" id="hist-cat">
        <option value="">Toutes les catégories</option>
        ${Object.entries(CATEGORIES).map(([k,v]) => `<option value="${k}">${v}</option>`).join('')}
      </select>
      <button class="btn btn-primary" onclick="applyHistoryFilters()">🔍 Filtrer</button>
      <button class="btn btn-secondary" onclick="resetHistoryFilters()">✖ Réinitialiser</button>
    </div>

    <div id="history-table">
      ${sales.length === 0 ? '<p class="empty-msg">Aucune vente enregistrée.</p>' : `
        <div class="table-container">
          <table class="data-table">
            <thead>
              <tr>
                <th>Date & heure</th>
                ${isAdmin ? '<th>Vendeur</th>' : ''}
                <th>Produit</th>
                <th>Qté</th>
                <th>Prix unit.</th>
                <th>Total</th>
              </tr>
            </thead>
            <tbody>${rows}</tbody>
            <tfoot>
              <tr style="background:var(--gray-50)">
                <td colspan="${isAdmin ? 5 : 4}" style="text-align:right;font-weight:600;padding:.75rem 1rem;color:var(--gray-700)">Total :</td>
                <td class="price" style="padding:.75rem 1rem"><strong>${formatPrice(total)}</strong></td>
              </tr>
            </tfoot>
          </table>
        </div>
      `}
    </div>
  `);
}

async function applyHistoryFilters() {
  const isAdmin = currentUser.role === 'admin';
  const from     = document.getElementById('hist-from')?.value || '';
  const to       = document.getElementById('hist-to')?.value || '';
  const sellerId = isAdmin ? (document.getElementById('hist-seller')?.value || '') : '';
  const cat      = document.getElementById('hist-cat')?.value || '';

  const params = new URLSearchParams();
  if (from)     params.set('from', from);
  if (to)       params.set('to', to);
  if (sellerId) params.set('seller_id', sellerId);
  if (cat)      params.set('category', cat);

  try {
    const sales = await api('GET', `/api/sales?${params}`) || [];
    let sellers = [];
    if (isAdmin) sellers = await api('GET', '/api/users') || [];
    _renderHistoryView(sales, sellers);
    // Restore filters
    if (from) document.getElementById('hist-from').value = from;
    if (to)   document.getElementById('hist-to').value   = to;
    if (cat)  document.getElementById('hist-cat').value  = cat;
    if (isAdmin && sellerId) document.getElementById('hist-seller').value = sellerId;
  } catch (err) {
    toast(err.message, 'error');
  }
}

async function resetHistoryFilters() { await renderHistory(); }

/* ===================================================
   VENDEURS
=================================================== */
let _cachedUsers = [];

async function renderSellers() {
  _cachedUsers = await api('GET', '/api/users') || [];
  const admins  = _cachedUsers.filter(u => u.role === 'admin');
  const sellers = _cachedUsers.filter(u => u.role === 'vendeur');

  const sellerCard = (u) => `
    <div class="seller-card">
      <div class="seller-avatar ${u.role === 'admin' ? 'admin-av' : ''}">${initials(u.username)}</div>
      <div class="seller-info">
        <div class="seller-name">${u.username}</div>
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
      <div><h2>Gestion des vendeurs</h2><div class="view-subtitle">${_cachedUsers.length} utilisateur(s)</div></div>
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

function _getUserName(id) {
  const u = _cachedUsers.find(x => x.id === id);
  return u ? u.username : '';
}
function _getUserRole(id) {
  const u = _cachedUsers.find(x => x.id === id);
  return u ? u.role : 'vendeur';
}

function showUserModal(userId = null) {
  const title = userId ? 'Modifier l\'utilisateur' : 'Ajouter un vendeur';
  openModal(title, `
    <form id="user-form" onsubmit="saveUser(event, ${userId || 'null'})">
      <div class="form-group">
        <label>Identifiant <span class="required">*</span></label>
        <input class="form-control" id="u-username" name="username" required placeholder="ex: marie" autofocus
          ${userId ? `value="${_getUserName(userId)}"` : ''}>
      </div>
      <div class="form-group">
        <label>${userId ? 'Nouveau mot de passe' : 'Mot de passe'} ${userId ? '' : '<span class="required">*</span>'}</label>
        <input class="form-control" name="password" type="password" placeholder="${userId ? 'Laisser vide pour ne pas changer' : 'Choisir un mot de passe'}"
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
  const data = {
    username: fd.get('username').trim(),
    password: fd.get('password') || undefined,
    role: fd.get('role'),
  };
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
      Voulez-vous vraiment supprimer le compte <strong>${username}</strong> ?
      <br><br>
      <span class="text-danger">⚠️ Cette action est irréversible.</span>
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
  } catch (err) {
    toast(err.message, 'error');
  }
}

/* ===================================================
   GESTION DES PRIX
=================================================== */
async function renderPrices() {
  allProducts = await api('GET', '/api/products') || [];

  // Grouper par catégorie
  const grouped = {};
  allProducts.forEach(p => { (grouped[p.category] = grouped[p.category] || []).push(p); });

  const sections = Object.entries(CATEGORIES)
    .filter(([k]) => grouped[k])
    .map(([cat, label]) => {
      const rows = grouped[cat].map(p => {
        const priceUnit = p.price_unit || Math.round(p.price / 12);
        return `
          <tr id="price-row-${p.id}">
            <td>
              <div style="font-weight:600">${p.name}</div>
              <div class="text-muted">${[p.grammage, p.size, p.color].filter(Boolean).join(' · ')}</div>
            </td>
            <td>
              <div class="price-input-wrap">
                <input class="price-input" type="number" min="0" step="1"
                  id="pdz-${p.id}" value="${p.price}"
                  onchange="markPriceChanged(${p.id})"
                  onkeydown="if(event.key==='Enter') saveSinglePrice(${p.id})">
                <span class="price-currency">F CFA</span>
              </div>
            </td>
            <td>
              <div class="price-input-wrap">
                <input class="price-input" type="number" min="0" step="1"
                  id="pu-${p.id}" value="${priceUnit}"
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
          <div class="category-title">${categoryIcon(cat)} ${label}
            <span class="category-count">${grouped[cat].length}</span>
          </div>
          <div class="table-container">
            <table class="data-table">
              <thead>
                <tr>
                  <th>Produit</th>
                  <th>💰 Prix douzaine</th>
                  <th>1️⃣ Prix unité</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>${rows}</tbody>
            </table>
          </div>
        </div>
      `;
    }).join('');

  setView(`
    <div class="view-header">
      <div>
        <h2>💰 Gestion des prix</h2>
        <div class="view-subtitle">Modifiez un prix et cliquez 💾 Sauver — ou appuyez sur Entrée</div>
      </div>
      <button class="btn btn-success" onclick="saveAllPrices()">💾 Tout sauvegarder</button>
    </div>

    <div class="info-box" style="margin-bottom:1.25rem">
      💡 <strong>Astuce :</strong> Laissez le prix unité à 0 pour qu'il soit calculé automatiquement (douzaine ÷ 12).
      Appuyez sur <kbd style="background:var(--gray-200);padding:1px 5px;border-radius:4px">Entrée</kbd> après chaque modification pour sauvegarder rapidement.
    </div>

    <div id="prices-msg"></div>
    ${sections}
  `);
}

function markPriceChanged(productId) {
  const btn = document.getElementById(`save-btn-${productId}`);
  if (btn) {
    btn.style.opacity = '1';
    btn.style.pointerEvents = 'auto';
    btn.classList.add('btn-primary');
    btn.classList.remove('btn-secondary');
  }
}

async function saveSinglePrice(productId) {
  const priceDz   = parseFloat(document.getElementById(`pdz-${productId}`)?.value) || 0;
  const priceUnit = parseFloat(document.getElementById(`pu-${productId}`)?.value) || 0;
  const btn       = document.getElementById(`save-btn-${productId}`);

  if (btn) { btn.textContent = '⏳'; btn.disabled = true; }

  try {
    await api('PUT', `/api/products/${productId}`, {
      price:      priceDz,
      price_unit: priceUnit || null,
    });
    if (btn) {
      btn.textContent = '✅ Sauvé';
      btn.classList.remove('btn-primary');
      btn.classList.add('btn-secondary');
      setTimeout(() => {
        btn.textContent = '💾 Sauver';
        btn.style.opacity = '.4';
        btn.style.pointerEvents = 'none';
        btn.disabled = false;
      }, 1500);
    }
    // Mettre à jour le cache local
    const p = allProducts.find(x => x.id === productId);
    if (p) { p.price = priceDz; p.price_unit = priceUnit || Math.round(priceDz / 12); }
    toast(`Prix mis à jour`, 'success');
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
    const id        = parseInt(row.id.replace('price-row-', ''));
    const priceDz   = parseFloat(document.getElementById(`pdz-${id}`)?.value) || 0;
    const priceUnit = parseFloat(document.getElementById(`pu-${id}`)?.value) || 0;
    try {
      await api('PUT', `/api/products/${id}`, {
        price:      priceDz,
        price_unit: priceUnit || null,
      });
      const p = allProducts.find(x => x.id === id);
      if (p) { p.price = priceDz; p.price_unit = priceUnit || Math.round(priceDz / 12); }
      saved++;
    } catch {}
  }

  if (btn) { btn.disabled = false; btn.textContent = '💾 Tout sauvegarder'; }
  toast(`${saved} prix sauvegardés avec succès`, 'success');

  // Réinitialiser tous les boutons
  document.querySelectorAll('[id^="save-btn-"]').forEach(b => {
    b.textContent = '💾 Sauver';
    b.style.opacity = '.4';
    b.style.pointerEvents = 'none';
    b.classList.remove('btn-primary');
    b.classList.add('btn-secondary');
  });
}

/* ===================================================
   PARAMÈTRES EMAIL
=================================================== */
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
      <div><h2>⚙️ Paramètres email</h2>
        <div class="view-subtitle">Notifications automatiques quand un stock passe en alerte</div>
      </div>
    </div>

    <div style="max-width:640px">

      <!-- ACTIVATION -->
      <div class="card" style="margin-bottom:1.25rem">
        <div class="card-header">🔔 Notifications de stock</div>
        <div class="card-body">
          <div class="info-box" style="margin-bottom:1rem">
            Un email est envoyé automatiquement lorsqu'un produit franchit son seuil d'alerte
            (stock qui passe de "OK" à "bas" ou "rupture") suite à une vente ou une modification de stock.
          </div>
          <label style="display:flex;align-items:center;gap:.75rem;cursor:pointer;font-weight:500">
            <input type="checkbox" id="email-enabled" style="width:18px;height:18px;accent-color:var(--primary)"
              ${s.email_enabled === '1' ? 'checked' : ''}>
            Activer les notifications email
          </label>
        </div>
      </div>

      <!-- CONFIG SMTP -->
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

          ${preset === 'gmail' ? `
            <div class="info-box" style="margin-bottom:1rem">
              💡 <strong>Gmail :</strong> Activez la validation en 2 étapes sur votre compte Google,
              puis créez un <a href="https://myaccount.google.com/apppasswords" target="_blank" style="color:var(--primary)">Mot de passe d'application</a>
              et utilisez-le comme mot de passe ci-dessous.
            </div>
          ` : ''}

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
            <label style="display:flex;align-items:center;gap:.5rem;cursor:pointer">
              <input type="checkbox" id="smtp-secure" style="accent-color:var(--primary)"
                ${s.smtp_secure === '1' ? 'checked' : ''}>
              Connexion SSL/TLS (port 465) — décocher pour STARTTLS (port 587)
            </label>
          </div>

          <div class="form-row">
            <div class="form-group">
              <label>Identifiant (adresse email) <span class="required">*</span></label>
              <input class="form-control" id="smtp-user" type="email" value="${s.smtp_user}" placeholder="vous@gmail.com">
            </div>
            <div class="form-group">
              <label>Mot de passe / App Password <span class="required">*</span></label>
              <input class="form-control" id="smtp-pass" type="password" value="${s.smtp_pass}" placeholder="••••••••">
            </div>
          </div>
        </div>
      </div>

      <!-- DESTINATAIRE -->
      <div class="card" style="margin-bottom:1.25rem">
        <div class="card-header">📬 Destinataire des alertes</div>
        <div class="card-body">
          <div class="form-row">
            <div class="form-group">
              <label>Adresse email destinataire <span class="required">*</span></label>
              <input class="form-control" id="alert-email" type="email" value="${s.alert_email}" placeholder="patron@boutique.fr">
            </div>
            <div class="form-group">
              <label>Nom de l'expéditeur</label>
              <input class="form-control" id="from-name" value="${s.from_name || 'BoutiqueStock'}" placeholder="BoutiqueStock">
            </div>
          </div>
        </div>
      </div>

      <!-- BOUTONS -->
      <div style="display:flex;gap:.75rem;flex-wrap:wrap">
        <button class="btn btn-primary" onclick="saveSettings()">💾 Enregistrer la configuration</button>
        <button class="btn btn-secondary" onclick="testEmail()" id="test-btn">📧 Envoyer un email de test</button>
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

  // Refresh the Gmail hint
  const hintArea = document.querySelector('.info-box');
  if (preset === 'gmail') {
    if (hintArea) hintArea.style.display = '';
  } else {
    if (hintArea) hintArea.style.display = 'none';
  }
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
  const data = getSettingsFormData();
  const msgEl = document.getElementById('settings-msg');
  try {
    await api('PUT', '/api/settings', data);
    msgEl.innerHTML = '<div class="info-box" style="background:var(--success-light);border-color:#A7F3D0;color:#065F46">✅ Configuration enregistrée avec succès.</div>';
    toast('Paramètres enregistrés', 'success');
  } catch (err) {
    msgEl.innerHTML = `<div class="error-banner">${err.message}</div>`;
  }
}

async function testEmail() {
  const data = getSettingsFormData();
  const btn = document.getElementById('test-btn');
  const msgEl = document.getElementById('settings-msg');
  btn.disabled = true; btn.textContent = '⏳ Envoi en cours...';
  try {
    // Sauvegarder d'abord
    await api('PUT', '/api/settings', data);
    const res = await api('POST', '/api/settings/test-email', {});
    msgEl.innerHTML = `<div class="info-box" style="background:var(--success-light);border-color:#A7F3D0;color:#065F46">✅ ${res.message}</div>`;
    toast('Email de test envoyé !', 'success');
  } catch (err) {
    msgEl.innerHTML = `<div class="error-banner">❌ ${err.message}</div>`;
    toast(err.message, 'error');
  } finally {
    btn.disabled = false; btn.textContent = '📧 Envoyer un email de test';
  }
}

/* ===== INIT ===== */
window.onload = checkAuth;
