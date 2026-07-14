const express = require('express');
const session = require('express-session');
const bcrypt = require('bcryptjs');
const nodemailer = require('nodemailer');
const path = require('path');
const { db, initDatabase } = require('./database');

const app = express();
const PORT = process.env.PORT || 3000;

initDatabase();

// ===== EMAIL =====

function getSetting(key, fallback = '') {
  const row = db.prepare('SELECT value FROM settings WHERE key = ?').get(key);
  return row ? row.value : fallback;
}

function setSetting(key, value) {
  db.prepare('INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value')
    .run(key, String(value));
}

function getAllSettings() {
  const rows = db.prepare('SELECT key, value FROM settings').all();
  const map = {};
  rows.forEach(r => { map[r.key] = r.value; });
  return {
    email_enabled: map.email_enabled || '0',
    smtp_host:     map.smtp_host     || '',
    smtp_port:     map.smtp_port     || '587',
    smtp_secure:   map.smtp_secure   || '0',
    smtp_user:     map.smtp_user     || '',
    smtp_pass:     map.smtp_pass     || '',
    alert_email:   map.alert_email   || '',
    from_name:     map.from_name     || 'BoutiqueStock',
  };
}

function createTransporter(s) {
  return nodemailer.createTransport({
    host: s.smtp_host,
    port: parseInt(s.smtp_port) || 587,
    secure: s.smtp_secure === '1',
    auth: { user: s.smtp_user, pass: s.smtp_pass },
    tls: { rejectUnauthorized: false },
  });
}

async function sendStockAlertEmail(alertItems) {
  const s = getAllSettings();
  if (s.email_enabled !== '1' || !s.smtp_host || !s.alert_email) return;

  const rows = alertItems.map(p => `
    <tr style="border-bottom:1px solid #eee">
      <td style="padding:10px 14px;font-weight:600">${p.name}</td>
      <td style="padding:10px 14px;color:#64748b">${p.category_label}${p.grammage ? ' · ' + p.grammage : ''}${p.size ? ' · ' + p.size : ''}${p.color ? ' · ' + p.color : ''}</td>
      <td style="padding:10px 14px;text-align:center">
        <span style="background:${p.new_stock === 0 ? '#fee2e2' : '#fef3c7'};color:${p.new_stock === 0 ? '#991b1b' : '#92400e'};padding:3px 10px;border-radius:12px;font-weight:700;font-size:13px">
          ${p.new_stock === 0 ? 'RUPTURE' : formatStockFr(p.new_stock) + ' restant'}
        </span>
      </td>
    </tr>
  `).join('');

  const subject = alertItems.some(p => p.new_stock === 0)
    ? `🚨 Rupture de stock — ${alertItems.filter(p => p.new_stock === 0).length} article(s)`
    : `⚠️ Stock bas — ${alertItems.length} article(s) à réapprovisionner`;

  const html = `
    <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;max-width:600px;margin:0 auto;background:#f8fafc;padding:24px">
      <div style="background:white;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,.1)">
        <div style="background:#4f46e5;padding:24px 32px;color:white">
          <div style="font-size:28px;margin-bottom:4px">👕 BoutiqueStock</div>
          <div style="font-size:18px;font-weight:700">${subject}</div>
        </div>
        <div style="padding:24px 32px">
          <p style="color:#475569;margin:0 0 20px">Les articles suivants nécessitent un réapprovisionnement :</p>
          <table style="width:100%;border-collapse:collapse;background:#f8fafc;border-radius:8px;overflow:hidden">
            <thead>
              <tr style="background:#e2e8f0">
                <th style="padding:10px 14px;text-align:left;font-size:12px;text-transform:uppercase;letter-spacing:.05em;color:#64748b">Article</th>
                <th style="padding:10px 14px;text-align:left;font-size:12px;text-transform:uppercase;letter-spacing:.05em;color:#64748b">Détails</th>
                <th style="padding:10px 14px;text-align:center;font-size:12px;text-transform:uppercase;letter-spacing:.05em;color:#64748b">Stock</th>
              </tr>
            </thead>
            <tbody>${rows}</tbody>
          </table>
          <div style="margin-top:24px;padding:16px;background:#eff6ff;border-radius:8px;border-left:4px solid #4f46e5;color:#1e40af;font-size:14px">
            💡 Connectez-vous à BoutiqueStock pour mettre à jour les stocks.
          </div>
        </div>
        <div style="padding:16px 32px;background:#f1f5f9;color:#94a3b8;font-size:12px;text-align:center">
          Alerte générée automatiquement par BoutiqueStock · ${new Date().toLocaleString('fr-FR')}
        </div>
      </div>
    </div>
  `;

  try {
    const transporter = createTransporter(s);
    await transporter.sendMail({
      from: `"${s.from_name}" <${s.smtp_user}>`,
      to: s.alert_email,
      subject,
      html,
    });
    console.log(`📧 Alerte stock envoyée à ${s.alert_email} (${alertItems.length} article(s))`);
  } catch (err) {
    console.error('❌ Erreur envoi email:', err.message);
  }
}

// Vérifie si le stock vient de franchir le seuil (avant → après une vente ou modif)
function checkAndAlert(oldStock, newStock, threshold) {
  return oldStock > threshold && newStock <= threshold;
}

// Formate un stock en unités sous forme "X douzaine(s) + Y unité(s)"
function formatStockFr(units) {
  units = units || 0;
  const dz = Math.floor(units / 12), u = units % 12;
  if (units === 0) return '0';
  if (dz === 0) return `${u} unité(s)`;
  if (u === 0)  return `${dz} douzaine(s)`;
  return `${dz} douzaine(s) + ${u} unité(s)`;
}

app.set('trust proxy', 1); // Railway est derrière un proxy HTTPS
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));
app.use(session({
  secret: process.env.SESSION_SECRET || 'boutique-secret-2024-xK9m',
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 8 * 60 * 60 * 1000, httpOnly: true, sameSite: 'lax' }
}));

function requireAuth(req, res, next) {
  if (!req.session.user) return res.status(401).json({ error: 'Non authentifié' });
  next();
}

function requireAdmin(req, res, next) {
  if (!req.session.user || req.session.user.role !== 'admin') {
    return res.status(403).json({ error: 'Accès réservé à l\'administrateur' });
  }
  next();
}

// ===== AUTH =====

app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ error: 'Identifiant et mot de passe requis' });

  const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username.trim());
  if (!user || !bcrypt.compareSync(password, user.password)) {
    return res.status(401).json({ error: 'Identifiant ou mot de passe incorrect' });
  }

  req.session.user = { id: user.id, username: user.username, role: user.role };
  res.json({ user: { id: user.id, username: user.username, role: user.role } });
});

app.post('/api/auth/logout', (req, res) => {
  req.session.destroy(() => res.json({ success: true }));
});

app.get('/api/auth/me', (req, res) => {
  if (!req.session.user) return res.status(401).json({ error: 'Non authentifié' });
  res.json({ user: req.session.user });
});

// ===== PRODUITS =====

app.get('/api/products', requireAuth, (req, res) => {
  const products = db.prepare('SELECT * FROM products ORDER BY category, name, grammage, size').all();
  res.json(products);
});

app.post('/api/products', requireAdmin, (req, res) => {
  const { name, category, grammage, size, color, price, price_unit, stock, low_stock_threshold } = req.body;
  if (!name || !category || price === undefined || price === null) {
    return res.status(400).json({ error: 'Nom, catégorie et prix douzaine sont requis' });
  }
  const priceDz   = parseFloat(price);
  const priceUnit = price_unit ? parseFloat(price_unit) : Math.round(priceDz / 12);

  const result = db.prepare(`
    INSERT INTO products (name, category, grammage, size, color, price, price_unit, stock, low_stock_threshold)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    name.trim(), category,
    grammage || null, size || null, color ? color.trim() : null,
    priceDz, priceUnit, parseInt(stock) || 0, parseInt(low_stock_threshold) || 5
  );

  res.json(db.prepare('SELECT * FROM products WHERE id = ?').get(result.lastInsertRowid));
});

app.put('/api/products/:id', requireAdmin, (req, res) => {
  const product = db.prepare('SELECT * FROM products WHERE id = ?').get(req.params.id);
  if (!product) return res.status(404).json({ error: 'Produit introuvable' });

  const { name, category, grammage, size, color, price, price_unit, stock, low_stock_threshold } = req.body;
  const priceDz   = parseFloat(price ?? product.price);
  const priceUnit = price_unit !== undefined ? parseFloat(price_unit) : (product.price_unit || Math.round(priceDz / 12));
  db.prepare(`
    UPDATE products SET name=?, category=?, grammage=?, size=?, color=?, price=?, price_unit=?, stock=?, low_stock_threshold=?, updated_at=CURRENT_TIMESTAMP
    WHERE id=?
  `).run(
    name?.trim() || product.name, category || product.category,
    grammage !== undefined ? (grammage || null) : product.grammage,
    size     !== undefined ? (size     || null) : product.size,
    color    !== undefined ? (color ? color.trim() : null) : product.color,
    priceDz, priceUnit, parseInt(stock ?? product.stock),
    parseInt(low_stock_threshold ?? product.low_stock_threshold), req.params.id
  );

  res.json(db.prepare('SELECT * FROM products WHERE id = ?').get(req.params.id));
});

app.delete('/api/products/:id', requireAdmin, (req, res) => {
  const product = db.prepare('SELECT * FROM products WHERE id = ?').get(req.params.id);
  if (!product) return res.status(404).json({ error: 'Produit introuvable' });
  db.prepare('DELETE FROM products WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

app.patch('/api/products/:id/stock', requireAdmin, (req, res) => {
  const { quantity, dozens, units, mode } = req.body;
  const product = db.prepare('SELECT * FROM products WHERE id = ?').get(req.params.id);
  if (!product) return res.status(404).json({ error: 'Produit introuvable' });

  // Saisie en douzaines + unités (1 douzaine = 12 unités), ou en unités brutes (quantity)
  let qty;
  if (dozens !== undefined || units !== undefined) {
    qty = (parseInt(dozens) || 0) * 12 + (parseInt(units) || 0);
  } else {
    qty = parseInt(quantity);
  }
  if (isNaN(qty)) return res.status(400).json({ error: 'Quantité invalide' });

  let newStock;
  if (mode === 'set') {
    newStock = qty;
  } else {
    newStock = product.stock + qty;
  }

  if (newStock < 0) return res.status(400).json({ error: 'Le stock ne peut pas être négatif' });

  db.prepare('UPDATE products SET stock=?, updated_at=CURRENT_TIMESTAMP WHERE id=?').run(newStock, req.params.id);
  const updated = db.prepare('SELECT * FROM products WHERE id = ?').get(req.params.id);
  res.json(updated);

  // Alerte si réduction manuelle franchit le seuil
  if (newStock < product.stock && checkAndAlert(product.stock, newStock, product.low_stock_threshold)) {
    sendStockAlertEmail([{
      name: product.name,
      category_label: CATEGORY_LABELS[product.category] || product.category,
      grammage: product.grammage,
      size: product.size,
      color: product.color,
      new_stock: newStock,
      threshold: product.low_stock_threshold,
    }]).catch(err => console.error('Alerte email:', err.message));
  }
});

// ===== VENTES =====

app.get('/api/sales', requireAuth, (req, res) => {
  const { from, to, category, seller_id } = req.query;
  let where = [];
  let params = [];

  if (req.session.user.role === 'vendeur') {
    where.push('s.user_id = ?');
    params.push(req.session.user.id);
  } else if (seller_id) {
    where.push('s.user_id = ?');
    params.push(seller_id);
  }

  if (from) { where.push("DATE(s.created_at) >= ?"); params.push(from); }
  if (to)   { where.push("DATE(s.created_at) <= ?"); params.push(to); }
  if (category) { where.push("p.category = ?"); params.push(category); }

  const whereClause = where.length ? 'WHERE ' + where.join(' AND ') : '';

  const sales = db.prepare(`
    SELECT s.*, u.username AS seller_name, p.name AS product_name,
           p.category, p.grammage, p.size, p.color,
           COALESCE(s.unit_type, 'douzaine') AS unit_type
    FROM sales s
    JOIN users u ON s.user_id = u.id
    JOIN products p ON s.product_id = p.id
    ${whereClause}
    ORDER BY s.created_at DESC
  `).all(...params);

  res.json(sales);
});

// Récupérer toutes les lignes d'un reçu (pour réimpression, y compris dates passées)
app.get('/api/sales/receipt/:number', requireAuth, (req, res) => {
  const rows = db.prepare(`
    SELECT s.*, u.username AS seller_name, p.name AS product_name,
           p.category, COALESCE(s.unit_type, 'douzaine') AS unit_type
    FROM sales s
    JOIN users u ON s.user_id = u.id
    JOIN products p ON s.product_id = p.id
    WHERE s.receipt_number = ?
    ORDER BY s.id
  `).all(req.params.number);

  if (!rows.length) return res.status(404).json({ error: 'Reçu introuvable' });
  if (req.session.user.role === 'vendeur' && rows[0].user_id !== req.session.user.id) {
    return res.status(403).json({ error: 'Ce reçu appartient à un autre vendeur' });
  }
  res.json(rows);
});

app.post('/api/sales', requireAuth, (req, res) => {
  const { items } = req.body;
  if (!items || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'Aucun article dans la vente' });
  }

  const results = [];
  const alertItems = [];

  try {
    db.exec('BEGIN');

    // Generate receipt number for this transaction
    const today = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const todayCount = db.prepare(
      "SELECT COUNT(DISTINCT receipt_number) AS c FROM sales WHERE DATE(created_at) = DATE('now') AND receipt_number IS NOT NULL"
    ).get().c;
    const receiptNumber = `BS-${today}-${String(todayCount + 1).padStart(4, '0')}`;

    for (const item of items) {
      const product = db.prepare('SELECT * FROM products WHERE id = ?').get(item.product_id);
      if (!product) throw new Error(`Produit introuvable (id: ${item.product_id})`);
      item.quantity = parseInt(item.quantity);
      if (isNaN(item.quantity) || item.quantity <= 0) {
        throw new Error(`Quantité invalide pour "${product.name}"`);
      }
      const unitType  = item.unit_type || 'gros';
      const isGros    = unitType === 'gros' || unitType === 'douzaine';
      // Gros = vente par douzaine → 12 unités déduites par douzaine vendue
      const unitsSold = isGros ? item.quantity * 12 : item.quantity;
      if (product.stock < unitsSold) {
        throw new Error(`Stock insuffisant pour "${product.name}" (disponible : ${formatStockFr(product.stock)})`);
      }

      const unitPrice = isGros ? product.price : (product.price_unit || Math.round(product.price / 12));
      const newStock  = product.stock - unitsSold;
      const total     = unitPrice * item.quantity;

      const result = db.prepare(`
        INSERT INTO sales (user_id, product_id, quantity, unit_price, total_price, unit_type, receipt_number)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(req.session.user.id, item.product_id, item.quantity, unitPrice, total, unitType, receiptNumber);

      db.prepare('UPDATE products SET stock = stock - ?, updated_at=CURRENT_TIMESTAMP WHERE id=?')
        .run(unitsSold, item.product_id);

      // Détecter le franchissement du seuil d'alerte
      if (checkAndAlert(product.stock, newStock, product.low_stock_threshold)) {
        alertItems.push({
          name: product.name,
          category_label: CATEGORY_LABELS[product.category] || product.category,
          grammage: product.grammage,
          size: product.size,
          color: product.color,
          new_stock: newStock,
          threshold: product.low_stock_threshold,
        });
      }

      results.push({
        sale_id: result.lastInsertRowid,
        product_name: product.name,
        quantity: item.quantity,
        unit_type: unitType,
        unit_price: unitPrice,
        total
      });
    }
    db.exec('COMMIT');
    res.json({ success: true, results, receiptNumber });

    // Envoyer les alertes email après la réponse (non-bloquant)
    if (alertItems.length > 0) {
      sendStockAlertEmail(alertItems).catch(err => console.error('Alerte email:', err.message));
    }
  } catch (err) {
    try { db.exec('ROLLBACK'); } catch {}
    res.status(400).json({ error: err.message });
  }
});

// ===== UTILISATEURS =====

app.get('/api/users', requireAdmin, (req, res) => {
  const users = db.prepare('SELECT id, username, role, created_at FROM users ORDER BY role DESC, username').all();
  res.json(users);
});

app.post('/api/users', requireAdmin, (req, res) => {
  const { username, password, role } = req.body;
  if (!username || !password) return res.status(400).json({ error: 'Identifiant et mot de passe requis' });

  const exists = db.prepare('SELECT id FROM users WHERE username = ?').get(username.trim());
  if (exists) return res.status(400).json({ error: 'Cet identifiant est déjà utilisé' });

  const hash = bcrypt.hashSync(password, 10);
  const result = db.prepare('INSERT INTO users (username, password, role) VALUES (?, ?, ?)').run(
    username.trim(), hash, role === 'admin' ? 'admin' : 'vendeur'
  );
  res.json({ id: result.lastInsertRowid, username: username.trim(), role: role || 'vendeur' });
});

app.put('/api/users/:id', requireAdmin, (req, res) => {
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.params.id);
  if (!user) return res.status(404).json({ error: 'Utilisateur introuvable' });

  const { username, password, role } = req.body;

  if (user.role === 'admin' && role === 'vendeur') {
    const adminCount = db.prepare("SELECT COUNT(*) AS count FROM users WHERE role='admin'").get().count;
    if (adminCount <= 1) return res.status(400).json({ error: 'Impossible de retirer le dernier administrateur' });
  }

  if (password && password.trim()) {
    const hash = bcrypt.hashSync(password, 10);
    db.prepare('UPDATE users SET username=?, password=?, role=? WHERE id=?')
      .run(username?.trim() || user.username, hash, role || user.role, req.params.id);
  } else {
    db.prepare('UPDATE users SET username=?, role=? WHERE id=?')
      .run(username?.trim() || user.username, role || user.role, req.params.id);
  }

  res.json({ success: true });
});

app.delete('/api/users/:id', requireAdmin, (req, res) => {
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.params.id);
  if (!user) return res.status(404).json({ error: 'Utilisateur introuvable' });

  if (user.id === req.session.user.id) {
    return res.status(400).json({ error: 'Vous ne pouvez pas supprimer votre propre compte' });
  }

  if (user.role === 'admin') {
    const adminCount = db.prepare("SELECT COUNT(*) AS count FROM users WHERE role='admin'").get().count;
    if (adminCount <= 1) return res.status(400).json({ error: 'Impossible de supprimer le dernier administrateur' });
  }

  db.prepare('DELETE FROM users WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

// ===== PARAMÈTRES EMAIL =====

const CATEGORY_LABELS = {
  tshirt: 'T-Shirt', polo: 'Polo', polo_vip: 'Polo VIP',
  tshirt_enfant: 'T-Shirt Enfant', polo_enfant: 'Polo Enfant', casquette: 'Casquette',
  tshirt_adulte: 'T-Shirt', polo_adulte: 'Polo',
};

app.get('/api/settings', requireAdmin, (req, res) => {
  const s = getAllSettings();
  // Ne jamais renvoyer le mot de passe en clair — on indique juste si configuré
  res.json({ ...s, smtp_pass: s.smtp_pass ? '••••••••' : '' });
});

app.put('/api/settings', requireAdmin, (req, res) => {
  const allowed = ['email_enabled', 'smtp_host', 'smtp_port', 'smtp_secure', 'smtp_user', 'alert_email', 'from_name'];
  for (const key of allowed) {
    if (req.body[key] !== undefined) setSetting(key, req.body[key]);
  }
  // Mot de passe uniquement si non vide (évite d'écraser avec les bullets)
  if (req.body.smtp_pass && req.body.smtp_pass !== '••••••••') {
    setSetting('smtp_pass', req.body.smtp_pass);
  }
  res.json({ success: true });
});

app.post('/api/settings/test-email', requireAdmin, async (req, res) => {
  const s = getAllSettings();
  if (!s.smtp_host || !s.smtp_user || !s.alert_email) {
    return res.status(400).json({ error: 'Configuration SMTP incomplète. Renseignez le serveur, l\'identifiant et l\'adresse destinataire.' });
  }
  try {
    const transporter = createTransporter(s);
    await transporter.verify();
    await transporter.sendMail({
      from: `"${s.from_name}" <${s.smtp_user}>`,
      to: s.alert_email,
      subject: '✅ Test BoutiqueStock — Configuration email OK',
      html: `
        <div style="font-family:sans-serif;max-width:500px;margin:0 auto;padding:24px">
          <h2 style="color:#4f46e5">✅ Configuration email vérifiée</h2>
          <p>Votre configuration SMTP fonctionne correctement.</p>
          <p>Les alertes de stock bas seront envoyées à <strong>${s.alert_email}</strong>.</p>
          <hr style="border:none;border-top:1px solid #eee;margin:20px 0">
          <p style="color:#94a3b8;font-size:13px">BoutiqueStock · ${new Date().toLocaleString('fr-FR')}</p>
        </div>
      `,
    });
    res.json({ success: true, message: `Email de test envoyé à ${s.alert_email}` });
  } catch (err) {
    res.status(400).json({ error: `Échec : ${err.message}` });
  }
});

// ===== TABLEAU DE BORD =====

app.get('/api/dashboard/stats', requireAdmin, (req, res) => {
  const totalProducts    = db.prepare('SELECT COUNT(*) AS c FROM products').get().c;
  const lowStockItems    = db.prepare('SELECT COUNT(*) AS c FROM products WHERE stock > 0 AND stock <= low_stock_threshold').get().c;
  const outOfStock       = db.prepare('SELECT COUNT(*) AS c FROM products WHERE stock = 0').get().c;
  const totalSalesToday  = db.prepare("SELECT COALESCE(SUM(total_price),0) AS t FROM sales WHERE DATE(created_at)=DATE('now')").get().t;
  const countToday       = db.prepare("SELECT COUNT(*) AS c FROM sales WHERE DATE(created_at)=DATE('now')").get().c;
  const totalRevenue     = db.prepare('SELECT COALESCE(SUM(total_price),0) AS t FROM sales').get().t;
  const totalSalesMonth  = db.prepare("SELECT COALESCE(SUM(total_price),0) AS t FROM sales WHERE strftime('%Y-%m', created_at)=strftime('%Y-%m','now')").get().t;
  // Stock en unités, prix = prix de la douzaine → valeur = (stock / 12) × prix douzaine
  const stockValue       = db.prepare('SELECT COALESCE(SUM((stock / 12.0) * price), 0) AS v FROM products').get().v;
  const sellerCount      = db.prepare("SELECT COUNT(*) AS c FROM users WHERE role='vendeur'").get().c;

  const recentSales = db.prepare(`
    SELECT s.*, u.username AS seller_name, p.name AS product_name, p.category
    FROM sales s JOIN users u ON s.user_id=u.id JOIN products p ON s.product_id=p.id
    ORDER BY s.created_at DESC LIMIT 10
  `).all();

  const lowStockList = db.prepare(`
    SELECT * FROM products WHERE stock <= low_stock_threshold ORDER BY stock ASC LIMIT 15
  `).all();

  const salesByDay = db.prepare(`
    SELECT DATE(created_at) AS day, SUM(total_price) AS total, COUNT(*) AS count
    FROM sales WHERE created_at >= DATE('now', '-30 days')
    GROUP BY DATE(created_at) ORDER BY day
  `).all();

  const topProducts = db.prepare(`
    SELECT p.name, p.category, SUM(s.quantity) AS qty, SUM(s.total_price) AS revenue
    FROM sales s JOIN products p ON s.product_id=p.id
    WHERE s.created_at >= DATE('now', '-30 days')
    GROUP BY s.product_id ORDER BY revenue DESC LIMIT 5
  `).all();

  res.json({ totalProducts, lowStockItems, outOfStock, totalSalesToday, countToday, totalRevenue,
    totalSalesMonth, stockValue, sellerCount, recentSales, lowStockList, salesByDay, topProducts });
});

// ===== RAPPORTS =====

app.get('/api/reports', requireAdmin, (req, res) => {
  const { period, from, to, seller_id } = req.query;
  const where = [];
  const params = [];

  if (from && to) {
    where.push('DATE(s.created_at) BETWEEN ? AND ?');
    params.push(from, to);
  } else {
    const periodMap = {
      today:  "DATE(s.created_at) = DATE('now')",
      week:   "s.created_at >= DATE('now', '-6 days')",
      month:  "strftime('%Y-%m', s.created_at) = strftime('%Y-%m', 'now')",
      year:   "strftime('%Y', s.created_at) = strftime('%Y', 'now')",
    };
    if (periodMap[period]) where.push(periodMap[period]);
  }

  if (seller_id) { where.push('s.user_id = ?'); params.push(seller_id); }

  const w = where.length ? 'WHERE ' + where.join(' AND ') : '';

  const totals = db.prepare(`SELECT COALESCE(SUM(s.total_price),0) AS revenue, COUNT(*) AS count FROM sales s ${w}`).get(...params);

  const byDay = db.prepare(`
    SELECT DATE(s.created_at) AS day, SUM(s.total_price) AS total, COUNT(*) AS count
    FROM sales s ${w} GROUP BY DATE(s.created_at) ORDER BY day
  `).all(...params);

  const topProducts = db.prepare(`
    SELECT p.name, p.category, SUM(s.quantity) AS qty, SUM(s.total_price) AS revenue
    FROM sales s JOIN products p ON s.product_id=p.id ${w}
    GROUP BY s.product_id ORDER BY revenue DESC LIMIT 10
  `).all(...params);

  const bySeller = db.prepare(`
    SELECT u.username, SUM(s.total_price) AS revenue, COUNT(*) AS count
    FROM sales s JOIN users u ON s.user_id=u.id ${w}
    GROUP BY s.user_id ORDER BY revenue DESC
  `).all(...params);

  const byCategory = db.prepare(`
    SELECT p.category, SUM(s.total_price) AS revenue, SUM(s.quantity) AS qty
    FROM sales s JOIN products p ON s.product_id=p.id ${w}
    GROUP BY p.category ORDER BY revenue DESC
  `).all(...params);

  res.json({ ...totals, byDay, topProducts, bySeller, byCategory });
});

// Endpoint de santé (monitoring Railway).
app.get('/api/health', (req, res) => res.json({ status: 'ok', uptime: process.uptime() }));

app.listen(PORT, () => {
  console.log(`\n🚀 Serveur démarré sur http://localhost:${PORT}`);
  console.log('📋 Connexion admin par défaut: admin / admin123\n');
});
