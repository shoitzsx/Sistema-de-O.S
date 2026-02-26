import express from "express";
import { createServer as createViteServer } from "vite";
import { initDb } from "./src/db";
import db from "./src/db";
import multer from "multer";
import path from "path";
import fs from "fs";
import { v4 as uuidv4 } from "uuid";

// Initialize DB
initDb();

// Ensure uploads directory exists
const uploadsDir = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir);
}

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadsDir)
  },
  filename: function (req, file, cb) {
    cb(null, uuidv4() + path.extname(file.originalname))
  }
});

const upload = multer({ storage: storage });

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Serve uploaded files
  app.use('/uploads', express.static(uploadsDir));

  // --- API Routes ---

  // Login
  app.post("/api/login", (req, res) => {
    const { username, password } = req.body;
    const user = db.prepare('SELECT * FROM users WHERE username = ? AND password = ?').get(username, password) as any;
    
    if (user) {
      // In a real app, sign a JWT here. For now, return the user object.
      const { password, ...userWithoutPassword } = user;
      res.json({ user: { ...userWithoutPassword, allowed_modules: JSON.parse(user.allowed_modules) } });
    } else {
      res.status(401).json({ error: "Invalid credentials" });
    }
  });

  // Get Users (for admin selection screen)
  app.get("/api/users", (req, res) => {
    const users = db.prepare('SELECT id, name, username, role, allowed_modules FROM users').all();
    res.json(users.map((u: any) => ({ ...u, allowed_modules: JSON.parse(u.allowed_modules) })));
  });

  app.post("/api/users", (req, res) => {
    const { name, username, password, role, allowed_modules } = req.body;
    try {
      const result = db.prepare('INSERT INTO users (name, username, password, role, allowed_modules) VALUES (?, ?, ?, ?, ?)').run(
        name, username, password, role, JSON.stringify(allowed_modules)
      );
      res.json({ id: result.lastInsertRowid });
    } catch (error: any) {
      if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') {
        res.status(400).json({ error: "Username already exists" });
      } else {
        res.status(500).json({ error: "Failed to create user" });
      }
    }
  });

  app.put("/api/users/:id", (req, res) => {
    const { name, username, password, role, allowed_modules } = req.body;
    try {
      // Build query dynamically based on whether password is provided
      if (password && password.trim() !== '') {
        db.prepare('UPDATE users SET name = ?, username = ?, password = ?, role = ?, allowed_modules = ? WHERE id = ?').run(
          name, username, password, role, JSON.stringify(allowed_modules), req.params.id
        );
      } else {
        db.prepare('UPDATE users SET name = ?, username = ?, role = ?, allowed_modules = ? WHERE id = ?').run(
          name, username, role, JSON.stringify(allowed_modules), req.params.id
        );
      }
      res.json({ success: true });
    } catch (error: any) {
      if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') {
        res.status(400).json({ error: "Username already exists" });
      } else {
        res.status(500).json({ error: "Failed to update user" });
      }
    }
  });

  app.delete("/api/users/:id", (req, res) => {
    try {
      const userId = req.params.id;
      // Delete related records first
      db.prepare('DELETE FROM checklists WHERE operator_id = ?').run(userId);
      db.prepare('DELETE FROM service_orders WHERE operator_id = ?').run(userId);
      db.prepare('DELETE FROM users WHERE id = ?').run(userId);
      res.json({ success: true });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Failed to delete user" });
    }
  });

  // Machines
  app.get("/api/machines", (req, res) => {
    const machines = db.prepare('SELECT * FROM machines').all();
    res.json(machines);
  });

  app.post("/api/machines", (req, res) => {
    const { name, model, image_url, description } = req.body;
    try {
      const result = db.prepare('INSERT INTO machines (name, model, image_url, description) VALUES (?, ?, ?, ?)').run(
        name, model, image_url, description
      );
      res.json({ id: result.lastInsertRowid });
    } catch (error) {
      res.status(500).json({ error: "Failed to create machine" });
    }
  });

  app.delete("/api/machines/:id", (req, res) => {
    try {
      const machineId = req.params.id;
      const machine = db.prepare('SELECT model FROM machines WHERE id = ?').get(machineId) as any;
      
      if (machine) {
        // Delete related records
        db.prepare('DELETE FROM checklists WHERE machine_id = ?').run(machineId);
        db.prepare('DELETE FROM service_orders WHERE machine_id = ?').run(machineId);
        db.prepare('DELETE FROM checklist_templates WHERE machine_model = ?').run(machine.model);
        db.prepare('DELETE FROM machines WHERE id = ?').run(machineId);
      }
      res.json({ success: true });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Failed to delete machine" });
    }
  });

  app.post("/api/machines/:id/manual", upload.single('manual'), (req, res) => {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }
    const manualUrl = `/uploads/${req.file.filename}`;
    db.prepare('UPDATE machines SET manual_url = ? WHERE id = ?').run(manualUrl, req.params.id);
    res.json({ manual_url: manualUrl });
  });

  // Checklists
  app.get("/api/checklist-template/:model", (req, res) => {
    const template = db.prepare('SELECT * FROM checklist_templates WHERE machine_model = ?').get(req.params.model) as any;
    if (template) {
      res.json({ ...template, items: JSON.parse(template.items) });
    } else {
      // Return a default generic template if specific one not found
      res.json({ 
        items: [
          { category: "Geral", items: ["Verificação Visual", "Nível de Óleo", "Vazamentos"] }
        ] 
      });
    }
  });

  app.post("/api/checklist-template", (req, res) => {
    const { machine_model, items } = req.body;
    try {
      const existing = db.prepare('SELECT id FROM checklist_templates WHERE machine_model = ?').get(machine_model);
      if (existing) {
        db.prepare('UPDATE checklist_templates SET items = ? WHERE machine_model = ?').run(JSON.stringify(items), machine_model);
      } else {
        db.prepare('INSERT INTO checklist_templates (machine_model, items) VALUES (?, ?)').run(machine_model, JSON.stringify(items));
      }
      res.json({ success: true });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Failed to save checklist template" });
    }
  });

  app.post("/api/checklists", (req, res) => {
    const { machine_id, operator_id, date, data, status } = req.body;
    const result = db.prepare('INSERT INTO checklists (machine_id, operator_id, date, data, status) VALUES (?, ?, ?, ?, ?)').run(
      machine_id, operator_id, date, JSON.stringify(data), status
    );
    res.json({ id: result.lastInsertRowid });
  });

  app.get("/api/checklists", (req, res) => {
    const checklists = db.prepare(`
      SELECT c.*, m.name as machine_name, u.name as operator_name 
      FROM checklists c
      JOIN machines m ON c.machine_id = m.id
      JOIN users u ON c.operator_id = u.id
      ORDER BY c.date DESC
    `).all();
    res.json(checklists.map((c: any) => ({ ...c, data: JSON.parse(c.data) })));
  });

  // Service Orders
  app.post("/api/service-orders", (req, res) => {
    const { machine_id, operator_id, description, component, start_time } = req.body;
    const result = db.prepare('INSERT INTO service_orders (machine_id, operator_id, description, component, start_time, status) VALUES (?, ?, ?, ?, ?, ?)').run(
      machine_id, operator_id, description, component, start_time, 'open'
    );
    res.json({ id: result.lastInsertRowid });
  });

  app.put("/api/service-orders/:id/close", (req, res) => {
    const { end_time } = req.body;
    db.prepare('UPDATE service_orders SET end_time = ?, status = ? WHERE id = ?').run(end_time, 'closed', parseInt(req.params.id));
    res.json({ success: true });
  });

  app.get("/api/service-orders", (req, res) => {
    const orders = db.prepare(`
      SELECT so.*, m.name as machine_name, u.name as operator_name 
      FROM service_orders so
      JOIN machines m ON so.machine_id = m.id
      JOIN users u ON so.operator_id = u.id
      ORDER BY so.start_time DESC
    `).all();
    res.json(orders);
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
