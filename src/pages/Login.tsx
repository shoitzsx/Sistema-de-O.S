import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { motion } from 'motion/react';
import { getUsers, loginUser } from '../lib/supabaseApi';
import { LoginNumeric } from '../components/LoginNumeric';
import brandLogo from '../assets/logo-ui.png';

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
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      const data = await getUsers();
      setUsers((data || []).map((user) => ({
        id: user.id,
        name: user.name,
        username: user.username,
        role: user.role,
      })));
    } catch (err) {
      console.error('Erro ao carregar usuários:', err);
      setError('Não foi possível carregar usuários.');
    }
  };

  const handleLogin = async (passwordValue: string) => {
    if (!selectedUser) return;

    setError('');
    setIsLoading(true);

    try {
      const data = await loginUser(selectedUser.username, passwordValue);

      if (!data) {
        setError('Senha incorreta');
        setIsLoading(false);
        return;
      }

      login({
        id: data.id,
        name: data.name,
        username: data.username,
        role: data.role,
        allowed_modules: data.allowed_modules || []
      });
      navigate('/');
    } catch (err) {
      setError('Erro ao conectar');
      console.error(err);
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center mb-5 px-3">
            <img
              src={brandLogo}
              alt="Águia Florestal"
              className="h-20 sm:h-24 md:h-28 w-auto max-w-[240px] object-contain drop-shadow-[0_10px_30px_rgba(0,0,0,0.35)]"
            />
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">Águia Florestal</h1>
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
          <LoginNumeric
            userName={selectedUser.name}
            userInitial={selectedUser.name.charAt(0).toUpperCase()}
            onBack={() => {
              setSelectedUser(null);
              setPassword('');
              setError('');
              setIsLoading(false);
            }}
            onSubmit={handleLogin}
            isLoading={isLoading}
            error={error}
          />
        )}
      </div>
    </div>
  );
}
