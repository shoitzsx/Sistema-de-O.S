import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { User as UserIcon, Lock, ArrowRight } from 'lucide-react';
import { motion } from 'motion/react';

interface UserSummary {
  id: number;
  name: string;
  username: string;
  role: string;
}

export default function Login() {
  const [users, setUsers] = useState<UserSummary[]>([]);
  const [selectedUser, setSelectedUser] = useState<UserSummary | null>(null);
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const { login } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    fetch('/api/users')
      .then(res => res.json())
      .then(data => setUsers(data))
      .catch(err => console.error('Failed to fetch users', err));
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;

    try {
      const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: selectedUser.username, password }),
      });

      if (res.ok) {
        const data = await res.json();
        login(data.user);
        navigate('/');
      } else {
        setError('Senha incorreta');
      }
    } catch (err) {
      setError('Erro ao conectar');
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Aguia Florestal</h1>
          <p className="text-slate-400">Selecione seu perfil para continuar</p>
        </div>

        {!selectedUser ? (
          <div className="grid gap-3">
            {users.map((user) => (
              <motion.button
                key={user.id}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setSelectedUser(user)}
                className="bg-white p-4 rounded-xl shadow-sm flex items-center justify-between hover:shadow-md transition-all text-left group"
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-emerald-100 text-emerald-700 rounded-full flex items-center justify-center font-bold text-lg">
                    {user.name.charAt(0)}
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-900">{user.name}</h3>
                    <p className="text-xs text-slate-500 uppercase tracking-wider">{user.role}</p>
                  </div>
                </div>
                <ArrowRight className="text-slate-300 group-hover:text-emerald-600 transition-colors" size={20} />
              </motion.button>
            ))}
          </div>
        ) : (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-2xl shadow-xl p-8"
          >
            <div className="flex items-center gap-3 mb-6 pb-6 border-b border-slate-100">
              <button 
                onClick={() => { setSelectedUser(null); setPassword(''); setError(''); }}
                className="text-sm text-slate-500 hover:text-slate-800"
              >
                &larr; Voltar
              </button>
              <div className="flex-1 text-right font-medium text-slate-900">
                {selectedUser.name}
              </div>
            </div>

            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Senha de Acesso</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 rounded-lg border border-slate-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 outline-none transition-all"
                    placeholder="Digite sua senha"
                    autoFocus
                  />
                </div>
              </div>

              {error && <p className="text-red-500 text-sm">{error}</p>}

              <button
                type="submit"
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-medium py-3 rounded-lg transition-colors shadow-lg shadow-emerald-600/20"
              >
                Entrar
              </button>
            </form>
          </motion.div>
        )}
      </div>
    </div>
  );
}
