import { useAuth } from '../context/AuthContext';
import { Link } from 'react-router-dom';
import { Wrench, History, BookOpen, CheckSquare, Users } from 'lucide-react';
import Layout from '../components/Layout';
import { motion } from 'motion/react';

export default function Dashboard() {
  const { user } = useAuth();

  const modules = [
    {
      id: 1,
      name: 'Manuais Técnicos',
      description: 'Gerenciar manuais e documentação de equipamentos.',
      icon: BookOpen,
      color: 'bg-blue-500',
      path: '/manuals'
    },
    {
      id: 2,
      name: 'Checklist Mensal',
      description: 'Realizar checklists mensais de equipamentos.',
      icon: CheckSquare,
      color: 'bg-green-500',
      path: '/checklist'
    },
    {
      id: 3,
      name: 'Ordens de Serviço',
      description: 'Criar e gerenciar ordens de serviço e manutenção.',
      icon: Wrench,
      color: 'bg-orange-500',
      path: '/service-orders'
    },
    {
      id: 4,
      name: 'Histórico de O.S',
      description: 'Consulte todas as ordens de serviço criadas.',
      icon: History,
      color: 'bg-indigo-500',
      path: '/history'
    },
    {
      id: 5,
      name: 'Gerenciar Usuários',
      description: 'Criar, editar e remover usuários do sistema.',
      icon: Users,
      color: 'bg-purple-500',
      path: '/users'
    }
  ];

  const allowedModules = modules.filter(m => user?.allowed_modules.includes(m.id));

  return (
    <Layout>
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-slate-900">Painel de Controle</h2>
        <p className="text-slate-500">Selecione um módulo para começar</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {allowedModules.map((module, index) => (
          <Link key={module.id} to={module.path}>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="bg-white rounded-2xl p-6 shadow-sm hover:shadow-md transition-all border border-slate-100 h-full flex flex-col"
            >
              <div className={`${module.color} w-14 h-14 rounded-xl flex items-center justify-center text-white mb-6 shadow-lg shadow-opacity-20`}>
                <module.icon size={28} />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-2">{module.name}</h3>
              <p className="text-slate-500 text-sm leading-relaxed flex-1">{module.description}</p>
              <div className="mt-6 flex items-center text-sm font-medium text-slate-900 group">
                Acessar Módulo
                <span className="ml-2 group-hover:translate-x-1 transition-transform">&rarr;</span>
              </div>
            </motion.div>
          </Link>
        ))}
      </div>
    </Layout>
  );
}
