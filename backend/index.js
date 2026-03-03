const express = require('express');
const cors = require('cors');

const app = express();
const PORT = 3333;

app.use(cors());
app.use(express.json());

// Banco fake em memória
let serviceOrders = [];
let machines = [
  { id: 1, name: 'Escavadeira CAT 320' },
  { id: 2, name: 'Pá Carregadeira' },
  { id: 3, name: 'Trator' },
];
let partTools = [];
let partToolCounter = 1;

// ===== MACHINES =====
app.get('/api/machines', (req, res) => {
  res.json(machines);
});

app.post('/api/machines', (req, res) => {
  const newMachine = {
    id: Date.now(),
    ...req.body,
  };
  machines.push(newMachine);
  res.status(201).json(newMachine);
});

app.delete('/api/machines/:id', (req, res) => {
  const id = parseInt(req.params.id);
  machines = machines.filter(m => m.id !== id);
  res.json({ success: true });
});

// ===== PARTS/TOOLS =====
app.get('/api/parts-tools', (req, res) => {
  res.json(partTools);
});

app.post('/api/parts-tools', (req, res) => {
  const newPartTool = {
    id: partToolCounter++,
    ...req.body,
  };
  partTools.push(newPartTool);
  res.status(201).json(newPartTool);
});

app.delete('/api/parts-tools/:id', (req, res) => {
  const id = parseInt(req.params.id);
  partTools = partTools.filter(pt => pt.id !== id);
  res.json({ success: true });
});

// ===== SERVICE ORDERS =====
// GET - listar ordens
app.get('/api/service-orders', (req, res) => {
  // Retorna todas as ordens (já em formato JSON)
  res.json(serviceOrders);
});

// POST - criar ordem
app.post('/api/service-orders', (req, res) => {
  console.log('🔥 POST RECEBIDO:', req.body);
  
  const newOrder = {
    id: Date.now(),
    status: 'open', // status padrão
    start_time: new Date().toISOString(),
    ...req.body,
  };
  serviceOrders.push(newOrder);
  res.status(201).json(newOrder);
});

// PUT - atualizar ordem (usado para editar relatório, ferramentas, componente)
app.put('/api/service-orders/:id', (req, res) => {
  const id = parseInt(req.params.id);
  const { final_report, used_parts_tools, tools, component } = req.body;
  
  const orderIndex = serviceOrders.findIndex(o => o.id === id);
  if (orderIndex === -1) {
    return res.status(404).json({ error: 'Ordem não encontrada' });
  }

  // Atualiza apenas os campos fornecidos
  if (final_report !== undefined) serviceOrders[orderIndex].final_report = final_report;
  if (used_parts_tools !== undefined) serviceOrders[orderIndex].used_parts_tools = used_parts_tools;
  if (tools !== undefined) serviceOrders[orderIndex].tools = tools;
  if (component !== undefined) serviceOrders[orderIndex].component = component;

  res.json({ success: true });
});

// PUT - finalizar ordem (fechar)
app.put('/api/service-orders/:id/close', (req, res) => {
  const id = parseInt(req.params.id);
  const { end_time, final_report } = req.body;

  const orderIndex = serviceOrders.findIndex(o => o.id === id);
  if (orderIndex === -1) {
    return res.status(404).json({ error: 'Ordem não encontrada' });
  }

  serviceOrders[orderIndex].status = 'closed';
  serviceOrders[orderIndex].end_time = end_time || new Date().toISOString();
  if (final_report !== undefined) {
    serviceOrders[orderIndex].final_report = final_report;
  }

  res.json({ success: true });
});

// ===== RESET (para desenvolvimento) =====
app.delete('/api/reset', (req, res) => {
  serviceOrders = [];
  res.json({ success: true, message: 'Todas as ordens foram deletadas' });
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});