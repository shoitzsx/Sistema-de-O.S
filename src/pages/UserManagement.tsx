import React, { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import { useAuth } from '../context/AuthContext';
import { Trash2, UserPlus, Shield, CheckSquare, Square, Edit, Eye, EyeOff, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'react-toastify';
import { getUsers, createUser, updateUser, deleteUser, verifyUserCredentials } from '../lib/supabaseApi';

interface User {
  id: number;
  name: string;
  username: string;
  role: 'admin' | 'operator';
  allowed_modules: number[];
}

const MODULES = [
  { id: 1, name: 'Manuais Técnicos', icon: '📚' },
  { id: 2, name: 'Checklist Mensal', icon: '✅' },
  { id: 3, name: 'Ordens de Serviço', icon: '🔧' },
  { id: 4, name: 'Histórico de O.S', icon: '📋' },
  { id: 6, name: 'Histórico de Inspeção', icon: '🧾' },
  { id: 8, name: 'Painel de Controle', icon: '📊' },
  { id: 5, name: 'Gerenciar Usuários', icon: '👥' },
  { id: 7, name: 'Auditoria de Ações', icon: '🛡️' }
];

export default function UserManagement() {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [newUser, setNewUser] = useState({
    name: '',
    username: '',
    password: '',
    role: 'operator' as 'admin' | 'operator',
    allowed_modules: [] as number[]
  });
  const [passwordChange, setPasswordChange] = useState({
    currentPassword: '',
    newPassword: ''
  });

  const [editingId, setEditingId] = useState<number | null>(null);
  const [editingUsername, setEditingUsername] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    const data = await getUsers();
    setUsers(data);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (isSaving) return;
    
    if (!newUser.name.trim() || !newUser.username.trim()) {
      toast.error('Preencha todos os campos obrigatórios');
      return;
    }

    if (!editingId && !newUser.password.trim()) {
      toast.error('Preencha todos os campos obrigatórios');
      return;
    }

    try {
      setIsSaving(true);
      let result;
      
      if (editingId) {
        const wantsToChangePassword = !!passwordChange.currentPassword.trim() || !!passwordChange.newPassword.trim();

        if (wantsToChangePassword) {
          if (!passwordChange.currentPassword.trim() || !passwordChange.newPassword.trim()) {
            toast.error('Para alterar a senha, informe a senha atual e a nova senha.');
            return;
          }

          const usernameToValidate = editingUsername || newUser.username;
          const passwordOk = await verifyUserCredentials(usernameToValidate, passwordChange.currentPassword);

          if (!passwordOk) {
            toast.error('Senha atual incorreta para este usuário.');
            return;
          }
        }

        const updatePayload: any = {
          name: newUser.name,
          username: newUser.username,
          role: newUser.role,
          allowed_modules: newUser.allowed_modules,
          ...(wantsToChangePassword ? { password: passwordChange.newPassword } : {})
        };

        result = await updateUser(editingId, updatePayload);
      } else {
        result = await createUser(newUser as any);
      }

      if (result) {
        loadUsers();
        resetForm();
        setIsModalOpen(false);
        toast.success(editingId ? 'Usuário atualizado com sucesso!' : 'Usuário criado com sucesso!');
      } else {
        toast.error('Erro ao salvar usuário');
      }
    } catch (err) {
      console.error(err);
      const apiError = err as { status?: number; code?: string; message?: string };

      if (apiError?.status === 401 || apiError?.code === '42501') {
        toast.error('Sem permissão para salvar usuário (RLS no Supabase). Execute a policy de INSERT/UPDATE na tabela users.');
      } else if (apiError?.message) {
        toast.error(`Erro ao salvar usuário: ${apiError.message}`);
      } else {
        toast.error('Erro ao salvar usuário');
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleEdit = (user: User) => {
    setEditingId(user.id);
    setEditingUsername(user.username);
    setNewUser({
      name: user.name,
      username: user.username,
      password: '',
      role: user.role,
      allowed_modules: user.allowed_modules
    });
    setPasswordChange({
      currentPassword: '',
      newPassword: ''
    });
    setShowPassword(false);
    setShowCurrentPassword(false);
    setShowNewPassword(false);
    setIsModalOpen(true);
  };

  const resetForm = () => {
    setEditingId(null);
    setEditingUsername('');
    setNewUser({
      name: '',
      username: '',
      password: '',
      role: 'operator',
      allowed_modules: []
    });
    setPasswordChange({
      currentPassword: '',
      newPassword: ''
    });
    setShowPassword(false);
    setShowCurrentPassword(false);
    setShowNewPassword(false);
  };

  const handleDeleteUser = async (id: number) => {
    if (!confirm('⚠️ Tem certeza que deseja REMOVER este usuário? Esta ação é irreversível.')) {
      return;
    }
    
    try {
      const success = await deleteUser(id);
      if (success) {
        loadUsers();
        toast.success('Usuário removido com sucesso!');
      } else {
        toast.error('Erro ao excluir usuário. Verifique se existem registros associados.');
      }
    } catch (err) {
      console.error(err);
      toast.error('Erro ao excluir usuário.');
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
      <div className="max-w-7xl mx-auto">
        <div className="mb-8 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
          <div>
            <h2 className="text-3xl font-bold text-slate-900">Gestão de Usuários</h2>
            <p className="text-slate-500 mt-1">Crie e gerencie usuários do sistema</p>
          </div>
          <button
            onClick={() => {
              resetForm();
              setIsModalOpen(true);
            }}
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-medium py-2.5 px-6 rounded-xl shadow-lg shadow-emerald-600/20 flex items-center justify-center gap-2 transition-all w-full sm:w-auto"
          >
            <UserPlus size={20} /> Novo Usuário
          </button>
        </div>

        {/* Users List */}
        <div className="grid gap-4">
          {users.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-2xl border border-slate-100">
              <Shield size={48} className="mx-auto text-slate-300 mb-4" />
              <p className="text-slate-500">Nenhum usuário cadastrado</p>
            </div>
          ) : (
            users.map((u) => (
              <motion.div
                key={u.id}
                layout
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="bg-white p-5 rounded-xl border border-slate-100 hover:shadow-md transition-all"
              >
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <div className={`px-3 py-1 text-xs font-semibold rounded-full ${
                        u.role === 'admin' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'
                      }`}>
                        {u.role === 'admin' ? '🔐 Admin' : '👤 Operador'}
                      </div>
                      <h3 className="text-lg font-bold text-slate-900">{u.name}</h3>
                    </div>
                    <p className="text-sm text-slate-500 mb-3">@{u.username}</p>
                    
                    <div className="flex flex-wrap gap-2">
                      {u.allowed_modules.length === 0 ? (
                        <span className="text-xs text-slate-400">Nenhum módulo permitido</span>
                      ) : (
                        u.allowed_modules.map(moduleId => {
                          const mod = MODULES.find(m => m.id === moduleId);
                          return mod ? (
                            <span key={moduleId} className="text-xs bg-slate-100 text-slate-700 px-2.5 py-1 rounded-full">
                              {mod.icon} {mod.name}
                            </span>
                          ) : null;
                        })
                      )}
                    </div>
                  </div>
                  
                  <div className="flex gap-2 sm:ml-4 self-end sm:self-auto">
                    <button
                      onClick={() => handleEdit(u)}
                      className="p-2.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      title="Editar usuário"
                    >
                      <Edit size={20} />
                    </button>
                    <button
                      onClick={() => handleDeleteUser(u.id)}
                      className="p-2.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title="Deletar usuário"
                    >
                      <Trash2 size={20} />
                    </button>
                  </div>
                </div>
              </motion.div>
            ))
          )}
        </div>

        {/* Modal Form */}
        <AnimatePresence>
          {isModalOpen && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => {
                setIsModalOpen(false);
                resetForm();
              }}
              className="fixed inset-0 bg-slate-950/35 backdrop-blur-sm flex items-center justify-center p-4 z-50"
            >
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                onClick={e => e.stopPropagation()}
                className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-4 sm:p-6 max-h-[calc(100dvh-2rem)] overflow-y-auto"
              >
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-2xl font-bold text-slate-900">
                    {editingId ? 'Editar Usuário' : 'Novo Usuário'}
                  </h3>
                  <button
                    onClick={() => {
                      setIsModalOpen(false);
                      resetForm();
                    }}
                    className="p-1 hover:bg-slate-100 rounded-lg transition-colors"
                  >
                    <X size={24} />
                  </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">Nome Completo *</label>
                    <input
                      type="text"
                      required
                      value={newUser.name}
                      onChange={e => setNewUser({ ...newUser, name: e.target.value })}
                      className="w-full p-3 rounded-lg border border-slate-200 focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition"
                      placeholder="João Silva"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">Usuário (Login) *</label>
                    <input
                      type="text"
                      required
                      value={newUser.username}
                      onChange={e => setNewUser({ ...newUser, username: e.target.value })}
                      className="w-full p-3 rounded-lg border border-slate-200 focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition"
                      placeholder="joao"
                    />
                  </div>

                  {!editingId ? (
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-2">Senha *</label>
                      <div className="relative">
                        <input
                          type={showPassword ? 'text' : 'password'}
                          required
                          value={newUser.password}
                          onChange={e => setNewUser({ ...newUser, password: e.target.value })}
                          className="w-full p-3 rounded-lg border border-slate-200 focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition pr-10"
                          placeholder="••••••••"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-3 text-slate-500 hover:text-slate-700"
                        >
                          {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-3 rounded-lg bg-slate-50 border border-slate-200 p-3">
                      <p className="text-sm font-semibold text-slate-700">Alterar Senha (opcional)</p>

                      <div>
                        <label className="block text-xs font-semibold text-slate-600 mb-2">Senha Atual</label>
                        <div className="relative">
                          <input
                            type={showCurrentPassword ? 'text' : 'password'}
                            value={passwordChange.currentPassword}
                            onChange={e => setPasswordChange({ ...passwordChange, currentPassword: e.target.value })}
                            className="w-full p-3 rounded-lg border border-slate-200 focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition pr-10 bg-white"
                            placeholder="Digite a senha atual"
                          />
                          <button
                            type="button"
                            onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                            className="absolute right-3 top-3 text-slate-500 hover:text-slate-700"
                          >
                            {showCurrentPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                          </button>
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-600 mb-2">Nova Senha</label>
                        <div className="relative">
                          <input
                            type={showNewPassword ? 'text' : 'password'}
                            value={passwordChange.newPassword}
                            onChange={e => setPasswordChange({ ...passwordChange, newPassword: e.target.value })}
                            className="w-full p-3 rounded-lg border border-slate-200 focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition pr-10 bg-white"
                            placeholder="Digite a nova senha"
                          />
                          <button
                            type="button"
                            onClick={() => setShowNewPassword(!showNewPassword)}
                            className="absolute right-3 top-3 text-slate-500 hover:text-slate-700"
                          >
                            {showNewPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                          </button>
                        </div>
                      </div>

                      <p className="text-xs text-slate-500">
                        Para trocar a senha, informe a senha atual e a nova senha antes de salvar.
                      </p>
                    </div>
                  )}

                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">Função *</label>
                    <select
                      value={newUser.role}
                      onChange={e => setNewUser({ ...newUser, role: e.target.value as 'admin' | 'operator' })}
                      className="w-full p-3 rounded-lg border border-slate-200 focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition bg-white"
                    >
                      <option value="operator">👤 Operador</option>
                      <option value="admin">🔐 Administrador</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-3">Módulos Permitidos</label>
                    <div className="space-y-2 bg-slate-50 p-4 rounded-lg max-h-64 overflow-y-auto">
                      {MODULES.map(module => (
                        <button
                          key={module.id}
                          type="button"
                          onClick={() => toggleModule(module.id)}
                          className="flex items-center gap-3 w-full p-3 rounded-lg hover:bg-white transition-colors text-left"
                        >
                          {newUser.allowed_modules.includes(module.id) ? (
                            <CheckSquare size={20} className="text-emerald-600 flex-shrink-0" />
                          ) : (
                            <Square size={20} className="text-slate-300 flex-shrink-0" />
                          )}
                          <span className="text-sm text-slate-700">{module.icon} {module.name}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-3 pt-4">
                    <button
                      type="button"
                      onClick={() => {
                        setIsModalOpen(false);
                        resetForm();
                      }}
                      className="flex-1 px-4 py-3 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50 font-medium transition"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      disabled={isSaving}
                      className="flex-1 px-4 py-3 rounded-lg bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 disabled:cursor-not-allowed text-white font-medium transition shadow-lg shadow-emerald-600/20"
                    >
                      {isSaving ? 'Salvando...' : editingId ? 'Atualizar' : 'Criar'}
                    </button>
                  </div>
                </form>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </Layout>
  );
}
