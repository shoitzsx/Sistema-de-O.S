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

  // Update service order (final report, used parts, etc.)
app.put("/api/service-orders/:id", (req, res) => {
  const { final_report, used_parts_tools } = req.body;
  try {
    // Build query dynamically based on provided fields
    if (final_report !== undefined && used_parts_tools !== undefined) {
      db.prepare('UPDATE service_orders SET final_report = ?, used_parts_tools = ? WHERE id = ?').run(
        final_report, JSON.stringify(used_parts_tools), req.params.id
      );
    } else if (final_report !== undefined) {
      db.prepare('UPDATE service_orders SET final_report = ? WHERE id = ?').run(final_report, req.params.id);
    } else if (used_parts_tools !== undefined) {
      db.prepare('UPDATE service_orders SET used_parts_tools = ? WHERE id = ?').run(JSON.stringify(used_parts_tools), req.params.id);
    }
    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to update service order" });
  }
});

  app.put("/api/service-orders/:id", (req, res) => {
    const { final_report } = req.body;
    db.prepare('UPDATE service_orders SET final_report = ? WHERE id = ?').run(
      final_report, parseInt(req.params.id)
    );
    res.json({ success: true });
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
    res.json(machines.map((m: any) => ({
      ...m,
      quick_specs: JSON.parse(m.quick_specs || '[]')
    })));
  });

  app.post("/api/machines", upload.single('image'), (req, res) => {
    const { name, model, description, quick_specs } = req.body;
    let image_url = null;
    if (req.file) {
      image_url = `/uploads/${req.file.filename}`;
    }
    // quick_specs vem como string JSON do frontend
    const quickSpecsStr = quick_specs || '[]';
    try {
      const result = db.prepare('INSERT INTO machines (name, model, image_url, description, quick_specs) VALUES (?, ?, ?, ?, ?)').run(
        name, model, image_url, description, quickSpecsStr
      );
      res.json({ id: result.lastInsertRowid, image_url });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Falha ao criar equipamento" });
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
    const { machine_id, operator_id, maintenance_type, technician_name, description, tools, component, start_time } = req.body;
    // tools é um array, salvar como JSON string
    const toolsStr = tools ? JSON.stringify(tools) : '[]';
    const result = db.prepare(`
    INSERT INTO service_orders 
    (machine_id, operator_id, maintenance_type, technician_name, description, tools, component, start_time, status) 
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
      machine_id, operator_id, maintenance_type, technician_name, description, toolsStr, component, start_time, 'open'
    );
    res.json({ id: result.lastInsertRowid });
  });

  app.post("/api/service-orders", (req, res) => {
  const { machine_id, operator_id, maintenance_type, technician_name, component, description, used_parts_tools, start_time } = req.body;
  // used_parts_tools é um array de IDs, vamos salvar como JSON string
  const usedPartsToolsStr = JSON.stringify(used_parts_tools || []);
  const result = db.prepare(`
    INSERT INTO service_orders 
    (machine_id, operator_id, maintenance_type, technician_name, component, description, used_parts_tools, start_time, status) 
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    machine_id, operator_id, maintenance_type, technician_name, component, description, usedPartsToolsStr, start_time, 'open'
  );
  res.json({ id: result.lastInsertRowid });
});

  // ===== Parts/Tools routes =====
  // GET all parts/tools
  app.get("/api/parts-tools", (req, res) => {
    try {
      const items = db.prepare('SELECT * FROM parts_tools ORDER BY category, name').all();
      res.json(items);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Failed to fetch parts/tools" });
    }
  });

  // POST new part/tool (admin only)
  app.post("/api/parts-tools", (req, res) => {
    const { name, description, category } = req.body;
    if (!name || !category) {
      return res.status(400).json({ error: "Name and category are required" });
    }
    try {
      const result = db.prepare('INSERT INTO parts_tools (name, description, category) VALUES (?, ?, ?)').run(
        name, description || null, category
      );
      res.json({ id: result.lastInsertRowid });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Failed to create part/tool" });
    }
  });

  // DELETE part/tool (admin only)
  app.delete("/api/parts-tools/:id", (req, res) => {
    try {
      db.prepare('DELETE FROM parts_tools WHERE id = ?').run(req.params.id);
      res.json({ success: true });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Failed to delete part/tool" });
    }
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
