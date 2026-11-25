import express from 'express';
import { DatabaseSync } from 'node:sqlite';
import { randomBytes, scryptSync, timingSafeEqual, createHash } from 'node:crypto';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const app = express();
const port = process.env.API_PORT === undefined ? 8787 : Number(process.env.API_PORT);
const here = path.dirname(fileURLToPath(import.meta.url));
const dbPath = process.env.DB_FILE || path.join(here, 'data', 'adelfaqih.sqlite');
fs.mkdirSync(path.dirname(dbPath), { recursive: true });
const db = new DatabaseSync(dbPath);
db.exec('PRAGMA journal_mode = WAL');
db.exec('PRAGMA foreign_keys = ON');

db.exec(`
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT, username TEXT NOT NULL UNIQUE, name TEXT NOT NULL,
  password_hash TEXT NOT NULL, role TEXT NOT NULL DEFAULT 'staff', active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS sessions (token_hash TEXT PRIMARY KEY, user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE, expires_at INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS products (
  id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, category TEXT NOT NULL DEFAULT '', sku TEXT NOT NULL DEFAULT '',
  cost REAL NOT NULL DEFAULT 0, price REAL NOT NULL DEFAULT 0, stock INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS sales (
  id INTEGER PRIMARY KEY AUTOINCREMENT, receipt_no TEXT NOT NULL UNIQUE, customer TEXT NOT NULL DEFAULT 'عميل نقدي',
  total REAL NOT NULL, payment_method TEXT NOT NULL DEFAULT 'نقداً', user_id INTEGER REFERENCES users(id),
  signed_by TEXT NOT NULL DEFAULT '', created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS sale_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT, sale_id INTEGER NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
  product_id INTEGER REFERENCES products(id) ON DELETE SET NULL, product_name TEXT NOT NULL,
  quantity INTEGER NOT NULL, unit_price REAL NOT NULL, unit_cost REAL NOT NULL DEFAULT 0, line_total REAL NOT NULL
);
CREATE TABLE IF NOT EXISTS stocktakes (
  id INTEGER PRIMARY KEY AUTOINCREMENT, reference_no TEXT NOT NULL UNIQUE,
  period_type TEXT NOT NULL CHECK(period_type IN ('daily','monthly','yearly')),
  notes TEXT NOT NULL DEFAULT '', user_id INTEGER REFERENCES users(id), created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS stocktake_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT, stocktake_id INTEGER NOT NULL REFERENCES stocktakes(id) ON DELETE CASCADE,
  product_id INTEGER REFERENCES products(id) ON DELETE SET NULL, product_name TEXT NOT NULL,
  system_quantity INTEGER NOT NULL, counted_quantity INTEGER NOT NULL, variance INTEGER NOT NULL
);
`);
const saleItemColumns = db.prepare('PRAGMA table_info(sale_items)').all() as any[];
if (!saleItemColumns.some(column => column.name === 'unit_cost')) db.exec('ALTER TABLE sale_items ADD COLUMN unit_cost REAL NOT NULL DEFAULT 0');
const saleColumns = db.prepare('PRAGMA table_info(sales)').all() as any[];
if (!saleColumns.some(column => column.name === 'signed_by')) db.exec("ALTER TABLE sales ADD COLUMN signed_by TEXT NOT NULL DEFAULT ''");

app.use(express.json({ limit: '1mb' }));
const hashPassword = (password: string) => {
  const salt = randomBytes(16).toString('hex');
  return `${salt}:${scryptSync(password, salt, 64).toString('hex')}`;
};
const verifyPassword = (password: string, stored: string) => {
  const [salt, hash] = stored.split(':');
  if (!salt || !hash) return false;
  const candidate = scryptSync(password, salt, 64);
  const expected = Buffer.from(hash, 'hex');
  return candidate.length === expected.length && timingSafeEqual(candidate, expected);
};
const tokenHash = (token: string) => createHash('sha256').update(token).digest('hex');
const userView = (row: any) => ({ id: row.id, username: row.username, name: row.name, role: row.role, active: Boolean(row.active) });

app.get('/api/status', (_req, res) => res.json({ initialized: (db.prepare('SELECT COUNT(*) AS n FROM users').get() as any).n > 0 }));
app.post('/api/auth/setup', (req, res) => {
  const { name, username, password } = req.body || {};
  if ((db.prepare('SELECT COUNT(*) AS n FROM users').get() as any).n > 0) return res.status(409).json({ error: 'تم إعداد النظام مسبقاً، سجل الدخول.' });
  if (!name?.trim() || !username?.trim() || !password || password.length < 6) return res.status(400).json({ error: 'أدخل الاسم واسم المستخدم وكلمة مرور من 6 أحرف على الأقل.' });
  try {
    const result = db.prepare("INSERT INTO users (name, username, password_hash, role) VALUES (?, ?, ?, 'admin')").run(name.trim(), username.trim().toLowerCase(), hashPassword(password));
    issueSession(Number(result.lastInsertRowid), res);
  } catch { res.status(409).json({ error: 'اسم المستخدم مستخدم بالفعل.' }); }
});
function issueSession(userId: number, res: express.Response) {
  const token = randomBytes(32).toString('hex');
  db.prepare('INSERT INTO sessions (token_hash, user_id, expires_at) VALUES (?, ?, ?)').run(tokenHash(token), userId, Date.now() + 1000 * 60 * 60 * 24 * 14);
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId) as any;
  res.json({ token, user: userView(user) });
}
app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body || {};
  const user = db.prepare('SELECT * FROM users WHERE username = ? AND active = 1').get(String(username || '').trim().toLowerCase()) as any;
  if (!user || !password || !verifyPassword(password, user.password_hash)) return res.status(401).json({ error: 'اسم المستخدم أو كلمة المرور غير صحيحة.' });
  issueSession(user.id, res);
});
const authenticate: express.RequestHandler = (req: any, res, next) => {
  const token = String(req.headers.authorization || '').replace(/^Bearer\s+/i, '');
  if (!token) return res.status(401).json({ error: 'يرجى تسجيل الدخول.' });
  const session = db.prepare('SELECT users.* FROM sessions JOIN users ON users.id=sessions.user_id WHERE token_hash=? AND expires_at>? AND active=1').get(tokenHash(token), Date.now()) as any;
  if (!session) return res.status(401).json({ error: 'انتهت الجلسة، سجل الدخول مجدداً.' });
  req.user = session;
  next();
};
app.post('/api/auth/logout', authenticate, (req: any, res) => {
  db.prepare('DELETE FROM sessions WHERE token_hash=?').run(tokenHash(String(req.headers.authorization).replace(/^Bearer\s+/i, '')));
  res.json({ ok: true });
});
app.use('/api', (req, res, next) => req.path.startsWith('/auth/') || req.path === '/status' ? next() : authenticate(req, res, next));
app.get('/api/me', (req: any, res) => res.json(userView(req.user)));
app.get('/api/products', (_req, res) => res.json(db.prepare('SELECT * FROM products ORDER BY id DESC').all()));
app.post('/api/products', (req: any, res) => {
  const { name, category = '', sku = '', cost = 0, price, stock = 0 } = req.body || {};
  if (!String(name || '').trim() || !Number.isFinite(Number(price)) || Number(price) < 0 || Number(stock) < 0) return res.status(400).json({ error: 'تحقق من اسم الصنف والسعر والكمية.' });
  const result = db.prepare('INSERT INTO products (name, category, sku, cost, price, stock) VALUES (?, ?, ?, ?, ?, ?)').run(String(name).trim(), String(category).trim(), String(sku).trim(), Number(cost) || 0, Number(price), Math.floor(Number(stock)));
  res.status(201).json(db.prepare('SELECT * FROM products WHERE id=?').get(result.lastInsertRowid));
});
app.put('/api/products/:id', (req, res) => {
  const { name, category = '', sku = '', cost = 0, price, stock = 0 } = req.body || {};
  if (!String(name || '').trim() || !Number.isFinite(Number(price)) || Number(stock) < 0) return res.status(400).json({ error: 'تحقق من بيانات الصنف.' });
  const result = db.prepare('UPDATE products SET name=?, category=?, sku=?, cost=?, price=?, stock=? WHERE id=?').run(String(name).trim(), String(category).trim(), String(sku).trim(), Number(cost) || 0, Number(price), Math.floor(Number(stock)), req.params.id);
  if (!result.changes) return res.status(404).json({ error: 'الصنف غير موجود.' });
  res.json(db.prepare('SELECT * FROM products WHERE id=?').get(req.params.id));
});
app.delete('/api/products/:id', (req, res) => { db.prepare('DELETE FROM products WHERE id=?').run(req.params.id); res.json({ ok: true }); });
app.get('/api/sales', (_req, res) => {
  const sales = db.prepare('SELECT sales.*, users.name AS seller FROM sales LEFT JOIN users ON users.id=sales.user_id ORDER BY sales.id DESC').all() as any[];
  res.json(sales.map(s => ({ ...s, items: db.prepare('SELECT * FROM sale_items WHERE sale_id=? ORDER BY id').all(s.id) })));
});
app.get('/api/sales/:id', (req, res) => {
  const sale = db.prepare('SELECT sales.*, users.name AS seller FROM sales LEFT JOIN users ON users.id=sales.user_id WHERE sales.id=?').get(req.params.id) as any;
  if (!sale) return res.status(404).json({ error: 'الفاتورة غير موجودة.' });
  sale.items = db.prepare('SELECT * FROM sale_items WHERE sale_id=? ORDER BY id').all(sale.id);
  res.json(sale);
});
app.post('/api/sales', (req: any, res) => {
  const { items, customer = 'عميل نقدي', payment_method = 'نقداً' } = req.body || {};
  if (!Array.isArray(items) || !items.length) return res.status(400).json({ error: 'أضف صنفاً واحداً على الأقل إلى الفاتورة.' });
  const transaction = () => {
    db.exec('BEGIN IMMEDIATE');
    try {
    let total = 0;
    const quantities = new Map<number, number>();
    for (const item of items) {
      const id = Number(item.product_id);
      const quantity = Math.floor(Number(item.quantity));
      if (!Number.isInteger(id) || id < 1 || quantity < 1) throw new Error('تعذر العثور على أحد الأصناف أو أن الكمية غير صحيحة.');
      quantities.set(id, (quantities.get(id) || 0) + quantity);
    }
    const prepared = Array.from(quantities, ([productId, qty]) => {
      const product = db.prepare('SELECT * FROM products WHERE id=?').get(productId) as any;
      if (!product) throw new Error('تعذر العثور على أحد الأصناف أو أن الكمية غير صحيحة.');
      if (product.stock < qty) throw new Error(`الكمية المتاحة من ${product.name} غير كافية.`);
      total += product.price * qty;
      return { product, qty };
    });
    const receipt = `INV-${Date.now().toString().slice(-8)}-${randomBytes(2).toString('hex').toUpperCase()}`;
    const saleId = Number(db.prepare('INSERT INTO sales (receipt_no, customer, total, payment_method, user_id, signed_by) VALUES (?, ?, ?, ?, ?, ?)').run(receipt, String(customer || 'عميل نقدي').trim(), total, String(payment_method), req.user.id, req.user.name).lastInsertRowid);
    for (const { product, qty } of prepared) {
      db.prepare('INSERT INTO sale_items (sale_id, product_id, product_name, quantity, unit_price, unit_cost, line_total) VALUES (?, ?, ?, ?, ?, ?, ?)').run(saleId, product.id, product.name, qty, product.price, product.cost, qty * product.price);
      db.prepare('UPDATE products SET stock=stock-? WHERE id=?').run(qty, product.id);
    }
    const created = db.prepare('SELECT * FROM sales WHERE id=?').get(saleId) as any;
    created.items = db.prepare('SELECT * FROM sale_items WHERE sale_id=? ORDER BY id').all(saleId);
    created.seller = req.user.name;
    db.exec('COMMIT');
    return created;
    } catch (error) {
      db.exec('ROLLBACK');
      throw error;
    }
  };
  try { res.status(201).json(transaction()); } catch (e: any) { res.status(400).json({ error: e.message || 'تعذر إتمام البيع.' }); }
});
app.get('/api/stocktakes', (_req, res) => {
  const rows = db.prepare(`SELECT t.*, u.name AS creator, COUNT(i.id) AS item_count,
    SUM(CASE WHEN i.variance <> 0 THEN 1 ELSE 0 END) AS changed_items,
    COALESCE(SUM(ABS(i.variance)),0) AS adjustment_units
    FROM stocktakes t LEFT JOIN users u ON u.id=t.user_id
    LEFT JOIN stocktake_items i ON i.stocktake_id=t.id
    GROUP BY t.id ORDER BY t.id DESC LIMIT 200`).all();
  res.json(rows);
});
app.get('/api/stocktakes/:id', (req, res) => {
  const count = db.prepare('SELECT t.*, u.name AS creator FROM stocktakes t LEFT JOIN users u ON u.id=t.user_id WHERE t.id=?').get(req.params.id) as any;
  if (!count) return res.status(404).json({ error: 'محضر الجرد غير موجود.' });
  count.items = db.prepare('SELECT * FROM stocktake_items WHERE stocktake_id=? ORDER BY product_name').all(count.id);
  res.json(count);
});
app.post('/api/stocktakes', (req: any, res) => {
  const { period_type, counts, notes = '' } = req.body || {};
  if (!['daily', 'monthly', 'yearly'].includes(period_type)) return res.status(400).json({ error: 'اختر نوع الجرد اليومي أو الشهري أو السنوي.' });
  const products = db.prepare('SELECT id, name, stock FROM products ORDER BY name').all() as any[];
  if (!products.length) return res.status(400).json({ error: 'أضف أصنافاً إلى المخزون قبل بدء الجرد.' });
  if (!Array.isArray(counts) || counts.length !== products.length) return res.status(400).json({ error: 'أدخل الكمية الفعلية لكل صنف في القائمة.' });
  const countMap = new Map<number, number>();
  for (const entry of counts) {
    const productId = Number(entry.product_id);
    const quantity = Number(entry.counted_quantity);
    if (!Number.isInteger(productId) || !Number.isInteger(quantity) || quantity < 0 || countMap.has(productId)) return res.status(400).json({ error: 'تحقق من الكميات الفعلية لكل صنف.' });
    countMap.set(productId, quantity);
  }
  if (products.some(product => !countMap.has(product.id))) return res.status(400).json({ error: 'لم يتم إدخال الكمية الفعلية لجميع الأصناف.' });
  try {
    db.exec('BEGIN IMMEDIATE');
    const reference = `STK-${Date.now().toString().slice(-8)}-${randomBytes(2).toString('hex').toUpperCase()}`;
    const countId = Number(db.prepare('INSERT INTO stocktakes (reference_no, period_type, notes, user_id) VALUES (?, ?, ?, ?)').run(reference, period_type, String(notes).trim().slice(0, 500), req.user.id).lastInsertRowid);
    for (const product of products) {
      const actual = countMap.get(product.id)!;
      db.prepare('INSERT INTO stocktake_items (stocktake_id, product_id, product_name, system_quantity, counted_quantity, variance) VALUES (?, ?, ?, ?, ?, ?)').run(countId, product.id, product.name, product.stock, actual, actual - product.stock);
      if (actual !== product.stock) db.prepare('UPDATE products SET stock=? WHERE id=?').run(actual, product.id);
    }
    const created = db.prepare('SELECT * FROM stocktakes WHERE id=?').get(countId) as any;
    created.items = db.prepare('SELECT * FROM stocktake_items WHERE stocktake_id=? ORDER BY product_name').all(countId);
    db.exec('COMMIT');
    res.status(201).json(created);
  } catch (error: any) {
    db.exec('ROLLBACK');
    res.status(400).json({ error: error.message || 'تعذر حفظ الجرد.' });
  }
});
app.get('/api/dashboard', (_req, res) => {
  const product = db.prepare('SELECT COUNT(*) AS count, COALESCE(SUM(stock),0) AS units, COALESCE(SUM(stock*cost),0) AS inventory_cost FROM products').get() as any;
  const today = db.prepare("SELECT COUNT(s.id) AS count, COALESCE(SUM(s.total),0) AS revenue, COALESCE(SUM(c.cost),0) AS cost FROM sales s LEFT JOIN (SELECT sale_id, SUM(quantity*unit_cost) AS cost FROM sale_items GROUP BY sale_id) c ON c.sale_id=s.id WHERE date(s.created_at)=date('now','localtime')").get() as any;
  const month = db.prepare("SELECT COALESCE(SUM(s.total),0) AS revenue, COALESCE(SUM(c.cost),0) AS cost FROM sales s LEFT JOIN (SELECT sale_id, SUM(quantity*unit_cost) AS cost FROM sale_items GROUP BY sale_id) c ON c.sale_id=s.id WHERE strftime('%Y-%m',s.created_at)=strftime('%Y-%m','now','localtime')").get() as any;
  const recent = db.prepare('SELECT sales.*, users.name AS seller FROM sales LEFT JOIN users ON users.id=sales.user_id ORDER BY id DESC LIMIT 5').all();
  res.json({ products: product.count, units: product.units, inventory_cost: product.inventory_cost, today_sales: today.count, today_revenue: today.revenue, today_profit: today.revenue - today.cost, month_revenue: month.revenue, month_profit: month.revenue - month.cost, low_stock: (db.prepare('SELECT COUNT(*) AS n FROM products WHERE stock <= 5').get() as any).n, recent });
});
app.get('/api/users', (req: any, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'هذه العملية متاحة لمدير النظام فقط.' });
  res.json(db.prepare('SELECT id, username, name, role, active, created_at FROM users ORDER BY id').all());
});
app.post('/api/users', (req: any, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'هذه العملية متاحة لمدير النظام فقط.' });
  const { name, username, password, role = 'staff' } = req.body || {};
  if (!name?.trim() || !username?.trim() || !password || password.length < 6) return res.status(400).json({ error: 'أدخل الاسم واسم المستخدم وكلمة مرور من 6 أحرف على الأقل.' });
  try {
    const result = db.prepare('INSERT INTO users (name, username, password_hash, role) VALUES (?, ?, ?, ?)').run(name.trim(), username.trim().toLowerCase(), hashPassword(password), role === 'admin' ? 'admin' : 'staff');
    res.status(201).json(userView(db.prepare('SELECT * FROM users WHERE id=?').get(result.lastInsertRowid)));
  } catch { res.status(409).json({ error: 'اسم المستخدم مستخدم بالفعل.' }); }
});
app.put('/api/users/:id/password', (req: any, res) => {
  const id = Number(req.params.id);
  const { current_password, password } = req.body || {};
  if (id !== req.user.id && req.user.role !== 'admin') return res.status(403).json({ error: 'غير مسموح.' });
  if (!password || password.length < 6) return res.status(400).json({ error: 'يجب أن تتكون كلمة المرور الجديدة من 6 أحرف على الأقل.' });
  const user = db.prepare('SELECT * FROM users WHERE id=?').get(id) as any;
  if (!user) return res.status(404).json({ error: 'المستخدم غير موجود.' });
  if (id === req.user.id && !verifyPassword(String(current_password || ''), user.password_hash)) return res.status(400).json({ error: 'كلمة المرور الحالية غير صحيحة.' });
  db.prepare('UPDATE users SET password_hash=? WHERE id=?').run(hashPassword(password), id);
  res.json({ ok: true });
});
app.put('/api/users/:id/active', (req: any, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'هذه العملية متاحة لمدير النظام فقط.' });
  if (Number(req.params.id) === req.user.id) return res.status(400).json({ error: 'لا يمكنك إيقاف حسابك الحالي.' });
  db.prepare('UPDATE users SET active=? WHERE id=?').run(req.body.active ? 1 : 0, req.params.id);
  res.json({ ok: true });
});

if (process.env.NODE_ENV === 'production') app.use(express.static(process.env.APP_DIST || path.join(here, 'dist')));
export const httpServer = app.listen(port, process.env.API_HOST || '127.0.0.1');
httpServer.on('listening', () => {
  const address = httpServer.address();
  console.log(`Adel Alfaqih API listening on ${address && typeof address !== 'string' ? address.port : port}`);
});
httpServer.on('close', () => db.close());
