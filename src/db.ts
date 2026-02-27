import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

const dbPath = path.join(process.cwd(), 'database.sqlite');
const db = new Database(dbPath);

// Enable foreign keys
db.pragma('foreign_keys = ON');

export function initDb() {
  // Users table
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      username TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      role TEXT CHECK(role IN ('admin', 'operator')) NOT NULL,
      allowed_modules TEXT NOT NULL -- JSON array of allowed module IDs [1, 2, 3]
    );
  `);

  // Machines table
  db.exec(`
    CREATE TABLE IF NOT EXISTS machines (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      model TEXT NOT NULL,
      image_url TEXT,
      manual_url TEXT,
      description TEXT
    );
  `);

  // Adicionar colunas se não existirem
try {
  db.exec(`ALTER TABLE service_orders ADD COLUMN maintenance_type TEXT DEFAULT 'corretiva'`);
  db.exec(`ALTER TABLE service_orders ADD COLUMN technician_name TEXT`);
  db.exec(`ALTER TABLE service_orders ADD COLUMN tools TEXT`); // JSON array
  db.exec(`ALTER TABLE service_orders ADD COLUMN final_report TEXT`);
} catch (e) {
  // colunas já existem, ignorar
}

  // Adicionar coluna quick_specs se não existir
try {
  db.exec(`ALTER TABLE machines ADD COLUMN quick_specs TEXT DEFAULT '[]'`);
} catch (e) {
  // Coluna já existe, ignorar
  console.log('quick_specs column already exists');
}

  // Checklist Templates table (defines what to check for each machine model)
  db.exec(`
    CREATE TABLE IF NOT EXISTS checklist_templates (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      machine_model TEXT NOT NULL,
      items TEXT NOT NULL -- JSON array of checklist items categories and tasks
    );
  `);

  // Checklists table (actual records)
  db.exec(`
    CREATE TABLE IF NOT EXISTS checklists (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      machine_id INTEGER NOT NULL,
      operator_id INTEGER NOT NULL,
      date TEXT NOT NULL,
      status TEXT CHECK(status IN ('pending', 'completed')) DEFAULT 'pending',
      data TEXT NOT NULL, -- JSON object with results { "item_name": "ok" | "nok" | "na", "observation": "..." }
      FOREIGN KEY (machine_id) REFERENCES machines(id),
      FOREIGN KEY (operator_id) REFERENCES users(id)
    );
  `);

  // Service Orders table
  db.exec(`
    CREATE TABLE IF NOT EXISTS service_orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      machine_id INTEGER NOT NULL,
      operator_id INTEGER NOT NULL,
      description TEXT NOT NULL,
      component TEXT, -- The equipment/part that failed
      start_time TEXT NOT NULL,
      end_time TEXT,
      status TEXT CHECK(status IN ('open', 'closed')) DEFAULT 'open',
      FOREIGN KEY (machine_id) REFERENCES machines(id),
      FOREIGN KEY (operator_id) REFERENCES users(id)
    );
  `);

  console.log('Database initialized');
  seedDb();
}

function seedDb() {
  const userCount = db.prepare('SELECT count(*) as count FROM users').get() as { count: number };
  
  if (userCount.count === 0) {
    console.log('Seeding database...');
    
    // Create Admin
    const insertUser = db.prepare('INSERT INTO users (name, username, password, role, allowed_modules) VALUES (?, ?, ?, ?, ?)');
    insertUser.run('Igor Andrade', 'admin', 'admin123', 'admin', JSON.stringify([1, 2, 3]));
    
    // Create Operators
    insertUser.run('João Silva', 'joao', '1234', 'operator', JSON.stringify([1, 2]));
    insertUser.run('Maria Santos', 'maria', '1234', 'operator', JSON.stringify([1, 3]));
    insertUser.run('Pedro Souza', 'pedro', '1234', 'operator', JSON.stringify([2, 3]));

    // Create Machines
    const insertMachine = db.prepare('INSERT INTO machines (name, model, image_url, description) VALUES (?, ?, ?, ?)');
    insertMachine.run('Caminhão Trator DAF', 'DAF 510 6X2', 'https://picsum.photos/seed/daf/400/300', 'Caminhão para transporte de madeira.');
    insertMachine.run('Harvester John Deere', '1270E 8x8', 'https://picsum.photos/seed/jd1270/400/300', 'Colheitadeira florestal de alta performance.');
    insertMachine.run('Trator Valtra', 'BH180', 'https://picsum.photos/seed/valtra/400/300', 'Trator agrícola adaptado para floresta.');
    insertMachine.run('Escavadeira CAT', '320', 'https://picsum.photos/seed/cat320/400/300', 'Escavadeira hidráulica para movimentação de terra.');

    // Create Checklist Templates
    const insertTemplate = db.prepare('INSERT INTO checklist_templates (machine_model, items) VALUES (?, ?)');
    
    // DAF 510 Template (Simplified from OCR)
    const dafItems = [
      {
        category: "Sistema Hidráulico",
        items: ["Mangueiras", "Vazamentos", "Ruídos"]
      },
      {
        category: "Cabine",
        items: ["Cinto de Segurança", "Limpador de parabrisas", "Buzina", "Espelho retrovisor", "Iluminação interna"]
      },
      {
        category: "Freio",
        items: ["Freio de estacionamento", "Cilindros", "Vazamentos"]
      },
      {
        category: "Motor Diesel",
        items: ["Vazamentos", "Ruídos anormais", "Nível de óleo", "Correias"]
      },
      {
        category: "Pneus",
        items: ["Calibragem", "Desgastes", "Pneu sobressalente"]
      }
    ];
    insertTemplate.run('DAF 510 6X2', JSON.stringify(dafItems));

    // JD 1270E Template (Simplified from OCR)
    const jdItems = [
      {
        category: "Bogie/Transmissão",
        items: ["Vazamentos", "Ruídos anormais", "Nível de óleo"]
      },
      {
        category: "Cabeçote Harvester",
        items: ["Vazamentos", "Mangueiras", "Motor da serra", "Sensores"]
      },
      {
        category: "Cabine",
        items: ["Joysticks", "Ar condicionado", "Painel de instrumentos"]
      },
      {
        category: "Motor Diesel",
        items: ["Nível de óleo", "Radiador", "Vazamentos"]
      }
    ];
    insertTemplate.run('1270E 8x8', JSON.stringify(jdItems));

    console.log('Database seeded');
  }
}

export default db;
