/**
 * Script de données de démonstration
 * Lance : node seed.js
 */
const { db, initDatabase } = require('./database');
const bcrypt = require('bcryptjs');

initDatabase();

console.log('\n🌱 Ajout des données de démonstration...\n');

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

// ===== PRODUITS =====
const produits = [
  // Polos Adulte
  { name: 'Polo Premium',   category: 'polo_adulte',   grammage: '220g', size: 'S',    color: 'Blanc',  price: 18.00, stock: 30, low_stock_threshold: 5 },
  { name: 'Polo Premium',   category: 'polo_adulte',   grammage: '220g', size: 'M',    color: 'Blanc',  price: 18.00, stock: 45, low_stock_threshold: 5 },
  { name: 'Polo Premium',   category: 'polo_adulte',   grammage: '220g', size: 'L',    color: 'Blanc',  price: 18.00, stock: 40, low_stock_threshold: 5 },
  { name: 'Polo Premium',   category: 'polo_adulte',   grammage: '220g', size: 'XL',   color: 'Blanc',  price: 18.00, stock: 25, low_stock_threshold: 5 },
  { name: 'Polo Premium',   category: 'polo_adulte',   grammage: '220g', size: 'XXL',  color: 'Blanc',  price: 18.00, stock: 3,  low_stock_threshold: 5 },
  { name: 'Polo Premium',   category: 'polo_adulte',   grammage: '220g', size: 'M',    color: 'Marine', price: 18.00, stock: 35, low_stock_threshold: 5 },
  { name: 'Polo Premium',   category: 'polo_adulte',   grammage: '220g', size: 'L',    color: 'Marine', price: 18.00, stock: 30, low_stock_threshold: 5 },
  { name: 'Polo Classic',   category: 'polo_adulte',   grammage: '180g', size: 'S',    color: 'Noir',   price: 14.50, stock: 20, low_stock_threshold: 5 },
  { name: 'Polo Classic',   category: 'polo_adulte',   grammage: '180g', size: 'M',    color: 'Noir',   price: 14.50, stock: 50, low_stock_threshold: 5 },
  { name: 'Polo Classic',   category: 'polo_adulte',   grammage: '180g', size: 'L',    color: 'Noir',   price: 14.50, stock: 60, low_stock_threshold: 5 },
  { name: 'Polo Classic',   category: 'polo_adulte',   grammage: '180g', size: 'XL',   color: 'Noir',   price: 14.50, stock: 0,  low_stock_threshold: 5 },
  { name: 'Polo Classic',   category: 'polo_adulte',   grammage: '180g', size: 'M',    color: 'Rouge',  price: 14.50, stock: 15, low_stock_threshold: 5 },

  // Polos Enfant
  { name: 'Polo Enfant',    category: 'polo_enfant',   grammage: '180g', size: '4-6 ans',   color: 'Blanc',  price: 12.00, stock: 20, low_stock_threshold: 5 },
  { name: 'Polo Enfant',    category: 'polo_enfant',   grammage: '180g', size: '6-8 ans',   color: 'Blanc',  price: 12.00, stock: 25, low_stock_threshold: 5 },
  { name: 'Polo Enfant',    category: 'polo_enfant',   grammage: '180g', size: '8-10 ans',  color: 'Blanc',  price: 12.00, stock: 18, low_stock_threshold: 5 },
  { name: 'Polo Enfant',    category: 'polo_enfant',   grammage: '180g', size: '10-12 ans', color: 'Blanc',  price: 12.00, stock: 4,  low_stock_threshold: 5 },
  { name: 'Polo Enfant',    category: 'polo_enfant',   grammage: '180g', size: '6-8 ans',   color: 'Marine', price: 12.00, stock: 15, low_stock_threshold: 5 },
  { name: 'Polo Enfant',    category: 'polo_enfant',   grammage: '180g', size: '8-10 ans',  color: 'Marine', price: 12.00, stock: 12, low_stock_threshold: 5 },

  // T-Shirts Adulte
  { name: 'T-Shirt Basic',  category: 'tshirt_adulte', grammage: '160g', size: 'XS',   color: 'Blanc',  price: 10.00, stock: 40, low_stock_threshold: 10 },
  { name: 'T-Shirt Basic',  category: 'tshirt_adulte', grammage: '160g', size: 'S',    color: 'Blanc',  price: 10.00, stock: 60, low_stock_threshold: 10 },
  { name: 'T-Shirt Basic',  category: 'tshirt_adulte', grammage: '160g', size: 'M',    color: 'Blanc',  price: 10.00, stock: 80, low_stock_threshold: 10 },
  { name: 'T-Shirt Basic',  category: 'tshirt_adulte', grammage: '160g', size: 'L',    color: 'Blanc',  price: 10.00, stock: 70, low_stock_threshold: 10 },
  { name: 'T-Shirt Basic',  category: 'tshirt_adulte', grammage: '160g', size: 'XL',   color: 'Blanc',  price: 10.00, stock: 30, low_stock_threshold: 10 },
  { name: 'T-Shirt Basic',  category: 'tshirt_adulte', grammage: '160g', size: 'XXL',  color: 'Blanc',  price: 10.00, stock: 8,  low_stock_threshold: 10 },
  { name: 'T-Shirt Basic',  category: 'tshirt_adulte', grammage: '160g', size: 'M',    color: 'Noir',   price: 10.00, stock: 55, low_stock_threshold: 10 },
  { name: 'T-Shirt Basic',  category: 'tshirt_adulte', grammage: '160g', size: 'L',    color: 'Noir',   price: 10.00, stock: 45, low_stock_threshold: 10 },
  { name: 'T-Shirt Basic',  category: 'tshirt_adulte', grammage: '160g', size: 'M',    color: 'Gris',   price: 10.00, stock: 35, low_stock_threshold: 10 },
  { name: 'T-Shirt Heavy',  category: 'tshirt_adulte', grammage: '200g', size: 'M',    color: 'Blanc',  price: 13.50, stock: 25, low_stock_threshold: 5 },
  { name: 'T-Shirt Heavy',  category: 'tshirt_adulte', grammage: '200g', size: 'L',    color: 'Blanc',  price: 13.50, stock: 30, low_stock_threshold: 5 },
  { name: 'T-Shirt Heavy',  category: 'tshirt_adulte', grammage: '200g', size: 'XL',   color: 'Blanc',  price: 13.50, stock: 2,  low_stock_threshold: 5 },
  { name: 'T-Shirt Heavy',  category: 'tshirt_adulte', grammage: '200g', size: 'M',    color: 'Marine', price: 13.50, stock: 20, low_stock_threshold: 5 },

  // T-Shirts Enfant
  { name: 'T-Shirt Enfant', category: 'tshirt_enfant', grammage: '150g', size: '4-6 ans',   color: 'Blanc',  price: 8.00, stock: 30, low_stock_threshold: 8 },
  { name: 'T-Shirt Enfant', category: 'tshirt_enfant', grammage: '150g', size: '6-8 ans',   color: 'Blanc',  price: 8.00, stock: 35, low_stock_threshold: 8 },
  { name: 'T-Shirt Enfant', category: 'tshirt_enfant', grammage: '150g', size: '8-10 ans',  color: 'Blanc',  price: 8.00, stock: 25, low_stock_threshold: 8 },
  { name: 'T-Shirt Enfant', category: 'tshirt_enfant', grammage: '150g', size: '10-12 ans', color: 'Blanc',  price: 8.00, stock: 20, low_stock_threshold: 8 },
  { name: 'T-Shirt Enfant', category: 'tshirt_enfant', grammage: '150g', size: '12-14 ans', color: 'Blanc',  price: 8.00, stock: 3,  low_stock_threshold: 8 },
  { name: 'T-Shirt Enfant', category: 'tshirt_enfant', grammage: '150g', size: '6-8 ans',   color: 'Noir',   price: 8.00, stock: 18, low_stock_threshold: 8 },
  { name: 'T-Shirt Enfant', category: 'tshirt_enfant', grammage: '150g', size: '8-10 ans',  color: 'Noir',   price: 8.00, stock: 15, low_stock_threshold: 8 },

  // Casquettes
  { name: 'Casquette Classic', category: 'casquette', grammage: null, size: 'Unique', color: 'Noir',   price: 9.90, stock: 50, low_stock_threshold: 10 },
  { name: 'Casquette Classic', category: 'casquette', grammage: null, size: 'Unique', color: 'Blanc',  price: 9.90, stock: 35, low_stock_threshold: 10 },
  { name: 'Casquette Classic', category: 'casquette', grammage: null, size: 'Unique', color: 'Marine', price: 9.90, stock: 40, low_stock_threshold: 10 },
  { name: 'Casquette Classic', category: 'casquette', grammage: null, size: 'Unique', color: 'Rouge',  price: 9.90, stock: 4,  low_stock_threshold: 10 },
  { name: 'Casquette Snapback', category: 'casquette', grammage: null, size: 'S/M',   color: 'Noir',   price: 12.00, stock: 20, low_stock_threshold: 5 },
  { name: 'Casquette Snapback', category: 'casquette', grammage: null, size: 'L/XL',  color: 'Noir',   price: 12.00, stock: 15, low_stock_threshold: 5 },
];

// Ne pas supprimer les produits existants (des ventes peuvent y être liées)

let added = 0;
for (const p of produits) {
  db.prepare(`
    INSERT INTO products (name, category, grammage, size, color, price, stock, low_stock_threshold)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(p.name, p.category, p.grammage, p.size, p.color, p.price, p.stock, p.low_stock_threshold);
  added++;
}

console.log(`✅ ${added} produits ajoutés`);
console.log('\n📋 Comptes disponibles :');
console.log('  admin   / admin123  (Administrateur)');
console.log('  marie   / marie123  (Vendeur)');
console.log('  thomas  / thomas123 (Vendeur)');
console.log('  sophie  / sophie123 (Vendeur)');
console.log('\n🚀 Lancez l\'application avec : npm start');
console.log('   Puis ouvrez : http://localhost:3000\n');
