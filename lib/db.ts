import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

const DB_PATH = path.join(process.cwd(), 'gado_gaucho.db');

// Ensure the database directory exists (though it's usually the root)
const db = new Database(DB_PATH);

// Initialize tables
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    phone TEXT,
    city TEXT,
    password TEXT,
    is_admin INTEGER DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS listings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    category TEXT NOT NULL,
    title TEXT NOT NULL,
    price REAL NOT NULL,
    priceKg REAL NOT NULL,
    avgWeight REAL NOT NULL,
    quantity INTEGER NOT NULL,
    location TEXT NOT NULL,
    lat REAL,
    lng REAL,
    seller TEXT NOT NULL,
    userId INTEGER,
    sellerRating REAL DEFAULT 5.0,
    verified INTEGER DEFAULT 0,
    sold INTEGER DEFAULT 0,
    verification_requested INTEGER DEFAULT 0,
    image TEXT,
    description TEXT,
    images TEXT, -- JSON string array
    videos TEXT,  -- JSON string array
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (userId) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    listing_id INTEGER NOT NULL,
    sender_name TEXT NOT NULL,
    sender_email TEXT NOT NULL,
    sender_phone TEXT NOT NULL,
    message TEXT NOT NULL,
    is_read INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (listing_id) REFERENCES listings(id)
  );
`);

// Seed initial data if empty
const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get() as { count: number };
if (userCount.count === 0) {
  db.prepare('INSERT INTO users (name, email, city, phone, password, is_admin) VALUES (?, ?, ?, ?, ?, ?)')
    .run('Administrador', 'adriano.prog@gmail.com', 'Porto Alegre', '(51) 99999-9999', 'admin123', 1);
}

export default db;
