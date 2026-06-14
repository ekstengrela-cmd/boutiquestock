/**
 * Script de données de démonstration — Prix en F CFA
 * Lance : node seed.js
 */
const { db, initDatabase } = require('./database');
const bcrypt = require('bcryptjs');

initDatabase();

console.log('\n🌱 Initialisation du catalogue BoutiqueStock...\n');

// ===== VENDEURS =====
const vendeurs = [
  { username: 'marie',   password: 'marie123',   role: 'vendeur' },
  { username: 'thomas',  password: 'thomas123',  role: 'vendeur' },
  { username: 'sophie',  password: 'sophie123',  role: 'vendeur' },
];

for (const v of vendeurs) {
  const exists = db.prepare('SELECT id FROM users WHERE username = ?').get(v.username);
  if (!exists) {
    const hash = bcrypt.hashSync(v.password, 10);
    db.prepare('INSERT INTO users (username, password, role) VALUES (?, ?, ?)').run(v.username, hash, v.role);
    console.log(`✅ Vendeur créé : ${v.username} / ${v.password}`);
  } else {
    console.log(`⏭️  Vendeur déjà existant : ${v.username}`);
  }
}

// ===== CATALOGUE PRODUITS =====
// prix = prix douzaine | price_unit = prix unité (auto si null)
const produits = [

  // ─── POLO ADULTE STANDARD ───────────────────────────────
  { name: 'Polo Standard', category: 'polo_adulte', grammage: '180g', size: 'S',    color: 'Blanc',  price: 12500, price_unit: null, stock: 30, low_stock_threshold: 12 },
  { name: 'Polo Standard', category: 'polo_adulte', grammage: '180g', size: 'M',    color: 'Blanc',  price: 12500, price_unit: null, stock: 50, low_stock_threshold: 12 },
  { name: 'Polo Standard', category: 'polo_adulte', grammage: '180g', size: 'L',    color: 'Blanc',  price: 12500, price_unit: null, stock: 50, low_stock_threshold: 12 },
  { name: 'Polo Standard', category: 'polo_adulte', grammage: '180g', size: 'XL',   color: 'Blanc',  price: 12500, price_unit: null, stock: 30, low_stock_threshold: 12 },
  { name: 'Polo Standard', category: 'polo_adulte', grammage: '180g', size: 'XXL',  color: 'Blanc',  price: 12500, price_unit: null, stock: 10, low_stock_threshold: 12 },
  { name: 'Polo Standard', category: 'polo_adulte', grammage: '180g', size: 'M',    color: 'Noir',   price: 12500, price_unit: null, stock: 40, low_stock_threshold: 12 },
  { name: 'Polo Standard', category: 'polo_adulte', grammage: '180g', size: 'L',    color: 'Noir',   price: 12500, price_unit: null, stock: 40, low_stock_threshold: 12 },
  { name: 'Polo Standard', category: 'polo_adulte', grammage: '180g', size: 'M',    color: 'Marine', price: 12500, price_unit: null, stock: 35, low_stock_threshold: 12 },

  // ─── POLO ADULTE PREMIUM ────────────────────────────────
  { name: 'Polo Premium',  category: 'polo_adulte', grammage: '220g', size: 'S',    color: 'Blanc',  price: 18500, price_unit: null, stock: 24, low_stock_threshold: 12 },
  { name: 'Polo Premium',  category: 'polo_adulte', grammage: '220g', size: 'M',    color: 'Blanc',  price: 18500, price_unit: null, stock: 36, low_stock_threshold: 12 },
  { name: 'Polo Premium',  category: 'polo_adulte', grammage: '220g', size: 'L',    color: 'Blanc',  price: 18500, price_unit: null, stock: 48, low_stock_threshold: 12 },
  { name: 'Polo Premium',  category: 'polo_adulte', grammage: '220g', size: 'XL',   color: 'Blanc',  price: 18500, price_unit: null, stock: 24, low_stock_threshold: 12 },
  { name: 'Polo Premium',  category: 'polo_adulte', grammage: '220g', size: 'M',    color: 'Marine', price: 18500, price_unit: null, stock: 24, low_stock_threshold: 12 },
  { name: 'Polo Premium',  category: 'polo_adulte', grammage: '220g', size: 'L',    color: 'Marine', price: 18500, price_unit: null, stock: 24, low_stock_threshold: 12 },

  // ─── POLO ENFANT ────────────────────────────────────────
  { name: 'Polo Enfant',   category: 'polo_enfant', grammage: '180g', size: '4-6 ans',   color: 'Blanc',  price: 11000, price_unit: null, stock: 24, low_stock_threshold: 12 },
  { name: 'Polo Enfant',   category: 'polo_enfant', grammage: '180g', size: '6-8 ans',   color: 'Blanc',  price: 11000, price_unit: null, stock: 24, low_stock_threshold: 12 },
  { name: 'Polo Enfant',   category: 'polo_enfant', grammage: '180g', size: '8-10 ans',  color: 'Blanc',  price: 11000, price_unit: null, stock: 24, low_stock_threshold: 12 },
  { name: 'Polo Enfant',   category: 'polo_enfant', grammage: '180g', size: '10-12 ans', color: 'Blanc',  price: 11000, price_unit: null, stock: 24, low_stock_threshold: 12 },
  { name: 'Polo Enfant',   category: 'polo_enfant', grammage: '180g', size: '6-8 ans',   color: 'Marine', price: 11000, price_unit: null, stock: 24, low_stock_threshold: 12 },

  // ─── T-SHIRT ADULTE 180g ────────────────────────────────
  { name: 'T-Shirt Adulte', category: 'tshirt_adulte', grammage: '180g', size: 'S',   color: 'Blanc',  price: 7000, price_unit: null, stock: 48, low_stock_threshold: 12 },
  { name: 'T-Shirt Adulte', category: 'tshirt_adulte', grammage: '180g', size: 'M',   color: 'Blanc',  price: 7000, price_unit: null, stock: 60, low_stock_threshold: 12 },
  { name: 'T-Shirt Adulte', category: 'tshirt_adulte', grammage: '180g', size: 'L',   color: 'Blanc',  price: 7000, price_unit: null, stock: 60, low_stock_threshold: 12 },
  { name: 'T-Shirt Adulte', category: 'tshirt_adulte', grammage: '180g', size: 'XL',  color: 'Blanc',  price: 7000, price_unit: null, stock: 36, low_stock_threshold: 12 },
  { name: 'T-Shirt Adulte', category: 'tshirt_adulte', grammage: '180g', size: 'XXL', color: 'Blanc',  price: 7000, price_unit: null, stock: 24, low_stock_threshold: 12 },
  { name: 'T-Shirt Adulte', category: 'tshirt_adulte', grammage: '180g', size: 'M',   color: 'Noir',   price: 7000, price_unit: null, stock: 48, low_stock_threshold: 12 },
  { name: 'T-Shirt Adulte', category: 'tshirt_adulte', grammage: '180g', size: 'L',   color: 'Noir',   price: 7000, price_unit: null, stock: 36, low_stock_threshold: 12 },

  // ─── T-SHIRT ADULTE 240g / 260g ─────────────────────────
  { name: 'T-Shirt Adulte', category: 'tshirt_adulte', grammage: '240g', size: 'M',   color: 'Blanc',  price: 7500, price_unit: null, stock: 36, low_stock_threshold: 12 },
  { name: 'T-Shirt Adulte', category: 'tshirt_adulte', grammage: '240g', size: 'L',   color: 'Blanc',  price: 7500, price_unit: null, stock: 36, low_stock_threshold: 12 },
  { name: 'T-Shirt Adulte', category: 'tshirt_adulte', grammage: '240g', size: 'XL',  color: 'Blanc',  price: 7500, price_unit: null, stock: 24, low_stock_threshold: 12 },
  { name: 'T-Shirt Adulte', category: 'tshirt_adulte', grammage: '260g', size: 'M',   color: 'Blanc',  price: 7500, price_unit: null, stock: 24, low_stock_threshold: 12 },
  { name: 'T-Shirt Adulte', category: 'tshirt_adulte', grammage: '260g', size: 'L',   color: 'Blanc',  price: 7500, price_unit: null, stock: 24, low_stock_threshold: 12 },

  // ─── T-SHIRT ADULTE VIP ─────────────────────────────────
  { name: 'T-Shirt Adulte VIP', category: 'tshirt_adulte', grammage: '200g', size: 'M',   color: 'Blanc',  price: 12500, price_unit: null, stock: 24, low_stock_threshold: 12 },
  { name: 'T-Shirt Adulte VIP', category: 'tshirt_adulte', grammage: '200g', size: 'L',   color: 'Blanc',  price: 12500, price_unit: null, stock: 24, low_stock_threshold: 12 },
  { name: 'T-Shirt Adulte VIP', category: 'tshirt_adulte', grammage: '200g', size: 'XL',  color: 'Blanc',  price: 12500, price_unit: null, stock: 12, low_stock_threshold: 12 },
  { name: 'T-Shirt Adulte VIP', category: 'tshirt_adulte', grammage: '200g', size: 'M',   color: 'Noir',   price: 12500, price_unit: null, stock: 24, low_stock_threshold: 12 },

  // ─── T-SHIRT ENFANT ─────────────────────────────────────
  { name: 'T-Shirt Enfant',     category: 'tshirt_enfant', grammage: '150g', size: '4-6 ans',   color: 'Blanc',  price: 6000, price_unit: null, stock: 36, low_stock_threshold: 12 },
  { name: 'T-Shirt Enfant',     category: 'tshirt_enfant', grammage: '150g', size: '6-8 ans',   color: 'Blanc',  price: 6000, price_unit: null, stock: 36, low_stock_threshold: 12 },
  { name: 'T-Shirt Enfant',     category: 'tshirt_enfant', grammage: '150g', size: '8-10 ans',  color: 'Blanc',  price: 6000, price_unit: null, stock: 36, low_stock_threshold: 12 },
  { name: 'T-Shirt Enfant',     category: 'tshirt_enfant', grammage: '150g', size: '10-12 ans', color: 'Blanc',  price: 6000, price_unit: null, stock: 24, low_stock_threshold: 12 },
  { name: 'T-Shirt Enfant',     category: 'tshirt_enfant', grammage: '150g', size: '12-14 ans', color: 'Blanc',  price: 6000, price_unit: null, stock: 5,  low_stock_threshold: 12 },

  // ─── T-SHIRT ENFANT VIP ─────────────────────────────────
  { name: 'T-Shirt Enfant VIP', category: 'tshirt_enfant', grammage: '180g', size: '4-6 ans',   color: 'Blanc',  price: 10000, price_unit: null, stock: 24, low_stock_threshold: 12 },
  { name: 'T-Shirt Enfant VIP', category: 'tshirt_enfant', grammage: '180g', size: '6-8 ans',   color: 'Blanc',  price: 10000, price_unit: null, stock: 24, low_stock_threshold: 12 },
  { name: 'T-Shirt Enfant VIP', category: 'tshirt_enfant', grammage: '180g', size: '8-10 ans',  color: 'Blanc',  price: 10000, price_unit: null, stock: 24, low_stock_threshold: 12 },
  { name: 'T-Shirt Enfant VIP', category: 'tshirt_enfant', grammage: '180g', size: '10-12 ans', color: 'Blanc',  price: 10000, price_unit: null, stock: 12, low_stock_threshold: 12 },

  // ─── CASQUETTES ─────────────────────────────────────────
  { name: 'Casquette Classic',  category: 'casquette', grammage: null, size: 'Unique', color: 'Noir',   price: 5000,  price_unit: 500, stock: 60, low_stock_threshold: 12 },
  { name: 'Casquette Classic',  category: 'casquette', grammage: null, size: 'Unique', color: 'Blanc',  price: 5000,  price_unit: 500, stock: 48, low_stock_threshold: 12 },
  { name: 'Casquette Classic',  category: 'casquette', grammage: null, size: 'Unique', color: 'Marine', price: 5000,  price_unit: 500, stock: 48, low_stock_threshold: 12 },
];

// Calculer price_unit auto si null
const stmt = db.prepare(`
  INSERT INTO products (name, category, grammage, size, color, price, price_unit, stock, low_stock_threshold)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
`);

let added = 0;
for (const p of produits) {
  const pu = p.price_unit !== null ? p.price_unit : Math.round(p.price / 12);
  stmt.run(p.name, p.category, p.grammage, p.size, p.color, p.price, pu, p.stock, p.low_stock_threshold);
  added++;
}

console.log(`✅ ${added} produits ajoutés (prix en F CFA)`);
console.log('\n📋 Comptes disponibles :');
console.log('  admin   / admin123  (Administrateur)');
console.log('  marie   / marie123  (Vendeur)');
console.log('  thomas  / thomas123 (Vendeur)');
console.log('  sophie  / sophie123 (Vendeur)\n');
