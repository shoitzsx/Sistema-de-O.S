require("dotenv").config();
const { gerarCadastro } = require("./groqService");
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
// Mock users para preencher operator_name
let users = [
  { id: 1, name: 'João Silva' },
  { id: 2, name: 'Maria Santos' },
  { id: 3, name: 'Pedro Costa' }
];

// In-memory checklist templates keyed by machine model
let checklistTemplates = {};
// Stored checklists from users (for future use)
let checklists = [];


// ===== MACHINES =====
app.get('/api/machines', (req, res) => {
  res.json(machines);
});

app.post("/auto-register", async (req, res) => {
  try {
    const { prompt } = req.body;

    const resposta = await gerarCadastro(prompt);

    const dados = JSON.parse(resposta);

    // AQUI você salva no SQLite
    // Exemplo simples:
    db.run(
      `INSERT INTO machines (categoria, modelo, tipo, total_tarefas, descricao_manual)
       VALUES (?, ?, ?, ?, ?)`,
      [
        dados.categoria,
        dados.modelo,
        dados.tipo,
        dados.total_tarefas,
        dados.descricao_manual
      ]
    );

    res.json(dados);

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erro ao gerar cadastro com IA" });
  }
});

const gerarComIA = async () => {
  await fetch("http://localhost:3000/auto-register", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      prompt: `
Gere cadastro para:
Modelo: NEW HOLLAND TM 135
Categoria: Trator Agrícola
Total tarefas: 66
...
`
    }),
  });
};

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
  try {
    // Validação básica
    if (!req.body.machine_id) {
      return res.status(400).json({ error: 'machine_id é obrigatório' });
    }

    // Garantir que machine_id é número
    const machineId = parseInt(req.body.machine_id);
    if (isNaN(machineId)) {
      return res.status(400).json({ error: 'machine_id deve ser um número válido' });
    }

    // Busca o nome do operador e da máquina
    const operator = users.find(u => u.id === req.body.operator_id);
    const machine = machines.find(m => m.id === machineId);
    
    const newOrder = {
      id: Date.now(),
      status: 'open', // status padrão
      start_time: new Date().toISOString(),
      machine_id: machineId,
      operator_id: req.body.operator_id,
      operator_name: operator?.name || `Operador ${req.body.operator_id}`,
      machine_name: machine?.name || `Máquina ${machineId}`,
      maintenance_type: req.body.maintenance_type || 'corretiva',
      technician_name: req.body.technician_name || '',
      component: req.body.component || '',
      description: req.body.description || '',
      tools: req.body.tools || [],
      used_parts_tools: req.body.used_parts_tools || [],
    };

    console.log('📝 Nova O.S criada:', newOrder);
    serviceOrders.push(newOrder);
    res.status(201).json(newOrder);
  } catch (err) {
    console.error('❌ Erro ao criar ordem:', err);
    res.status(500).json({ error: 'Erro interno ao criar ordem de serviço' });
  }
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

// ===== CHECKLIST TEMPLATES =====
app.get('/api/checklist-template/:model', (req, res) => {
  const model = req.params.model;
  const template = checklistTemplates[model];
  if (template) {
    res.json({ items: template });
  } else {
    // default generic template
    res.json({
      items: [
        { category: 'Geral', items: ['Verificação Visual', 'Nível de Óleo', 'Vazamentos'] }
      ]
    });
  }
});

app.post('/api/checklist-template', (req, res) => {
  const { machine_model, items } = req.body;
  checklistTemplates[machine_model] = items;
  res.json({ success: true });
});

// ===== CHECKLISTS =====
app.post('/api/checklists', (req, res) => {
  const { machine_id, operator_id, date, data, status } = req.body;
  const id = Date.now();
  checklists.push({ id, machine_id, operator_id, date, data, status });
  res.json({ id });
});

app.get('/api/checklists', (req, res) => {
  res.json(checklists);
});

// ===== RESET (para desenvolvimento) =====
app.delete('/api/reset', (req, res) => {
  serviceOrders = [];
  res.json({ success: true, message: 'Todas as ordens foram deletadas' });
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});