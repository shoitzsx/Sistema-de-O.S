import React, { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import { useAuth } from '../context/AuthContext';
import { Trash2, UserPlus, Shield, CheckSquare, Square } from 'lucide-react';
import { motion } from 'motion/react';

interface User {
  id: number;
  name: string;
  username: string;
  role: 'admin' | 'operator';
  allowed_modules: number[];
}

const MODULES = [
  { id: 1, name: 'Manuais Técnicos' },
  { id: 2, name: 'Checklist Mensal' },
  { id: 3, name: 'Manutenção Corretiva' }
];

export default function UserManagement() {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [newUser, setNewUser] = useState({
    name: '',
    username: '',
    password: '',
    role: 'operator',
    allowed_modules: [] as number[]
  });

  const [editingId, setEditingId] = useState<number | null>(null);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = () => {
    fetch('/api/users')
      .then(res => res.json())
      .then(data => setUsers(data));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const url = editingId ? `/api/users/${editingId}` : '/api/users';
      const method = editingId ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newUser),
      });

      if (res.ok) {
        fetchUsers();
        resetForm();
        alert(editingId ? 'Usuário atualizado!' : 'Usuário criado!');
      } else {
        const err = await res.json();
        alert(err.error || 'Erro ao salvar usuário');
      }
    } catch (err) {
      console.error(err);
      alert('Erro ao salvar usuário');
    }
  };

  const handleEdit = (user: User) => {
    setEditingId(user.id);
    setNewUser({
      name: user.name,
      username: user.username,
      password: '', // Don't fill password
      role: user.role,
      allowed_modules: user.allowed_modules
    });
  };

  const resetForm = () => {
    setEditingId(null);
    setNewUser({
      name: '',
      username: '',
      password: '',
      role: 'operator',
      allowed_modules: []
    });
  };

  const handleDeleteUser = async (id: number) => {
    if (!confirm('Tem certeza que deseja excluir este usuário?')) return;
    
    try {
      const res = await fetch(`/api/users/${id}`, { method: 'DELETE' });
      if (res.ok) {
        fetchUsers();
      } else {
        alert('Erro ao excluir usuário. Verifique se existem registros associados.');
      }
    } catch (err) {
      console.error(err);
      alert('Erro ao excluir usuário.');
    }
  };

  const toggleModule = (moduleId: number) => {
    setNewUser(prev => {
      const modules = prev.allowed_modules.includes(moduleId)
        ? prev.allowed_modules.filter(id => id !== moduleId)
        : [...prev.allowed_modules, moduleId];
      return { ...prev, allowed_modules: modules };
    });
  };

  if (currentUser?.role !== 'admin') {
    return (
      <Layout>
        <div className="text-center py-12">
          <h2 className="text-xl font-bold text-red-600">Acesso Negado</h2>
          <p className="text-slate-500">Apenas administradores podem acessar esta página.</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-slate-900">Gestão de Usuários</h2>
          <p className="text-slate-500">Crie perfis e defina permissões de acesso</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Form Section */}
          <div className="lg:col-span-1">
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 sticky top-8">
              <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
                <UserPlus size={20} className="text-emerald-600" />
                {editingId ? 'Editar Usuário' : 'Novo Usuário'}
              </h3>
              
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Nome Completo</label>
                  <input
                    type="text"
                    required
                    value={newUser.name}
                    onChange={e => setNewUser({ ...newUser, name: e.target.value })}
                    className="w-full p-2.5 rounded-lg border border-slate-200 focus:ring-2 focus:ring-emerald-200 outline-none"
                    placeholder="Ex: João Silva"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Usuário (Login)</label>
                  <input
                    type="text"
                    required
                    value={newUser.username}
                    onChange={e => setNewUser({ ...newUser, username: e.target.value })}
                    className="w-full p-2.5 rounded-lg border border-slate-200 focus:ring-2 focus:ring-emerald-200 outline-none"
                    placeholder="Ex: joao"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Senha</label>
                  <input
                    type="password"
                    required
                    value={newUser.password}
                    onChange={e => setNewUser({ ...newUser, password: e.target.value })}
                    className="w-full p-2.5 rounded-lg border border-slate-200 focus:ring-2 focus:ring-emerald-200 outline-none"
                    placeholder="******"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Função</label>
                  <select
                    value={newUser.role}
                    onChange={e => setNewUser({ ...newUser, role: e.target.value as 'admin' | 'operator' })}
                    className="w-full p-2.5 rounded-lg border border-slate-200 focus:ring-2 focus:ring-emerald-200 outline-none bg-white"
                  >
                    <option value="operator">Operador</option>
                    <option value="admin">Administrador (PCM)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Módulos Permitidos</label>
                  <div className="space-y-2">
                    {MODULES.map(module => (
                      <button
                        key={module.id}
                        type="button"
                        onClick={() => toggleModule(module.id)}
                        className="flex items-center gap-3 w-full p-2 rounded-lg hover:bg-slate-50 transition-colors text-left"
                      >
                        {newUser.allowed_modules.includes(module.id) ? (
                          <CheckSquare size={20} className="text-emerald-600" />
                        ) : (
                          <Square size={20} className="text-slate-300" />
                        )}
                        <span className="text-sm text-slate-700">{module.name}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-medium py-3 rounded-xl shadow-lg shadow-emerald-600/20 transition-all mt-4"
                >
                  Criar Perfil
                </button>
              </form>
            </div>
          </div>

          {/* List Section */}
          <div className="lg:col-span-2">
            <div className="grid gap-4">
              {users.map((u) => (
                <motion.div
                  key={u.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 flex items-center justify-between"
                >
                  <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold ${u.role === 'admin' ? 'bg-purple-100 text-purple-700' : 'bg-slate-100 text-slate-700'}`}>
                      {u.name.charAt(0)}
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-900 flex items-center gap-2">
                        {u.name}
                        {u.role === 'admin' && <Shield size={14} className="text-purple-600" />}
                      </h3>
                      <p className="text-sm text-slate-500">@{u.username}</p>
                      <div className="flex gap-2 mt-2">
                        {u.allowed_modules.map(mid => {
                          const m = MODULES.find(mod => mod.id === mid);
                          return m ? (
                            <span key={mid} className="text-xs bg-slate-100 text-slate-600 px-2 py-1 rounded-md">
                              {m.name}
                            </span>
                          ) : null;
                        })}
                      </div>
                    </div>
                  </div>

                  {u.username !== 'admin' && (
                    <button
                      onClick={() => handleDeleteUser(u.id)}
                      className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                      title="Excluir Usuário"
                    >
                      <Trash2 size={20} />
                    </button>
                  )}
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
