import React, { useState, useRef } from 'react';
import { Lock, ChevronLeft } from 'lucide-react';
import { motion } from 'motion/react';
import { useDeviceDetection, shouldUseNumpad } from '../hooks/useDeviceDetection';
import { NumericInput } from './NumericInput';
import { Numpad } from './Numpad';

export interface LoginNumericProps {
  userName: string;
  userInitial: string;
  onBack: () => void;
  onSubmit: (password: string) => Promise<void>;
  isLoading?: boolean;
  error?: string;
}

/**
 * Componente integrado de login numérico
 * 
 * Lógica:
 * - Mobile/Tablet: Mostra input readonly + Numpad customizado
 * - Desktop: Input normal com teclado físico + botão Enviar
 * 
 * Segurança:
 * - Input sempre controlado
 * - Numpad em mobile evita teclado nativo
 * - Máscara visual (•) para senha
 * - Limite de caracteres
 */
export const LoginNumeric: React.FC<LoginNumericProps> = ({
  userName,
  userInitial,
  onBack,
  onSubmit,
  isLoading = false,
  error = '',
}) => {
  const [password, setPassword] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const deviceInfo = useDeviceDetection();
  const useNumpad = shouldUseNumpad(deviceInfo);

  const handleNumpadChange = (value: string) => {
    // Limite de segurança: máx 50 caracteres
    if (value.length <= 50) {
      setPassword(value);
    }
  };

  const handleInputChange = (value: string) => {
    // Limite de segurança
    if (value.length <= 50) {
      setPassword(value);
    }
  };

  const handleSubmit = async () => {
    if (password.length === 0) return;
    await onSubmit(password);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-md"
    >
      {/* Header com botão voltar e nome do usuário */}
      <div className="flex items-center gap-3 mb-6 pb-6 border-b border-slate-100">
        <button
          onClick={onBack}
          disabled={isLoading}
          className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          aria-label="Voltar para seleção de usuário"
        >
          <ChevronLeft size={18} />
          Voltar
        </button>
        <div className="flex-1 text-right font-medium text-slate-900 flex items-center justify-end gap-3">
          <div className="w-8 h-8 bg-emerald-100 text-emerald-700 rounded-full flex items-center justify-center font-bold text-sm">
            {userInitial}
          </div>
          <span>{userName}</span>
        </div>
      </div>

      {/* Container responsivo: mobile usa coluna única, desktop usa layout lado a lado */}
      <div className={`space-y-6 ${useNumpad ? 'flex flex-col' : ''}`}>
        {/* Seção de input */}
        <div className="space-y-3">
          <label className="block text-sm font-semibold text-slate-700">
            {useNumpad ? 'Insira sua senha' : 'Senha de Acesso'}
          </label>

          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={18} />
            <NumericInput
              ref={inputRef}
              value={password}
              onChange={useNumpad ? handleNumpadChange : handleInputChange}
              placeholder={useNumpad ? '••••••••' : 'Digite sua senha'}
              maxLength={50}
              maskInput={true}
              readOnly={useNumpad}
              autoFocus={!useNumpad}
              showClearButton={!useNumpad && password.length > 0}
              className="pl-10"
              onKeyDown={!useNumpad ? handleKeyDown : undefined}
            />
          </div>

          {/* Status de caracteres (principalmente útil em mobile) */}
          {useNumpad && password.length > 0 && (
            <div className="text-xs text-slate-500">
              {password.length} caractere{password.length !== 1 ? 's' : ''} inserido{password.length !== 1 ? 's' : ''}
            </div>
          )}

          {/* Mensagem de erro */}
          {error && <p className="text-red-500 text-sm font-medium">{error}</p>}
        </div>

        {/* Numpad ou Botão Enviar */}
        {useNumpad ? (
          // Mobile/Tablet: Mostrar Numpad
          <Numpad
            value={password}
            onChange={handleNumpadChange}
            onSubmit={handleSubmit}
            maxLength={50}
            disabled={isLoading}
            showClearAll={true}
            submitButtonLabel={isLoading ? 'Entrando...' : 'Entrar'}
          />
        ) : (
          // Desktop: Botão normal
          <button
            onClick={handleSubmit}
            disabled={isLoading || password.length === 0}
            className={`
              w-full font-semibold py-3 rounded-lg transition-all
              ${
                isLoading
                  ? 'bg-slate-300 text-slate-600 cursor-not-allowed'
                  : password.length === 0
                    ? 'bg-slate-300 text-slate-600 cursor-not-allowed'
                    : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-600/20'
              }
            `}
            aria-label="Entrar"
          >
            {isLoading ? 'Entrando...' : 'Entrar'}
          </button>
        )}
      </div>

      {/* Dica de segurança (ajustada por dispositivo) */}
      <div className="mt-6 p-3 bg-blue-50 rounded-lg border border-blue-200">
        <p className="text-xs text-blue-700">
          🔒 {useNumpad ? 'Use o teclado acima' : 'Use o teclado físico'} para sua segurança.{' '}
          {useNumpad && 'Pressione números ou toque nos botões.'}
        </p>
      </div>
    </motion.div>
  );
};

export default LoginNumeric;
