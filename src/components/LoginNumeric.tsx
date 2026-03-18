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
      className="bg-white rounded-2xl sm:rounded-3xl shadow-2xl p-6 sm:p-8 w-full max-w-md sm:max-w-lg"
    >
      {/* Header com botão voltar e nome do usuário */}
      <div className="flex items-center gap-2 sm:gap-3 mb-6 sm:mb-8 pb-4 sm:pb-6 border-b-2 border-emerald-100">
        <button
          onClick={onBack}
          disabled={isLoading}
          className="inline-flex items-center gap-1 text-sm font-medium text-slate-600 hover:text-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          aria-label="Voltar para seleção de usuário"
        >
          <ChevronLeft size={20} className="sm:w-5 sm:h-5" />
          <span className="hidden sm:inline">Voltar</span>
        </button>
        <div className="flex-1 text-right font-semibold text-slate-900 flex items-center justify-end gap-2 sm:gap-3">
          <div className="w-8 sm:w-10 h-8 sm:h-10 bg-emerald-100 text-emerald-700 rounded-full flex items-center justify-center font-bold text-sm sm:text-base">
            {userInitial}
          </div>
          <span className="text-sm sm:text-base">{userName}</span>
        </div>
      </div>

      {/* Container responsivo: mobile coluna única, desktop otimizado */}
      <div className={`space-y-4 sm:space-y-6`}>
        {/* Seção de input */}
        <div className="space-y-2 sm:space-y-3">
          <label className="block text-sm sm:text-base font-semibold text-slate-700">
            {useNumpad ? 'Insira sua Senha' : 'Senha de Acesso'}
          </label>

          <div className="relative">
            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none w-5 h-5 sm:w-6 sm:h-6" size={20} />
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
              className="pl-12 sm:pl-14"
              onKeyDown={!useNumpad ? handleKeyDown : undefined}
            />
          </div>

          {/* Status de caracteres */}
          {useNumpad && password.length > 0 && (
            <div className="text-xs sm:text-sm text-emerald-600 font-medium">
              ✓ {password.length} caractere{password.length !== 1 ? 's' : ''} inserido{password.length !== 1 ? 's' : ''}
            </div>
          )}

          {/* Mensagem de erro */}
          {error && (
            <div className="p-3 sm:p-4 bg-red-50 rounded-lg border-2 border-red-200">
              <p className="text-red-700 text-sm sm:text-base font-medium">⚠️ {error}</p>
            </div>
          )}
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
              w-full font-semibold py-3 sm:py-4 rounded-xl sm:rounded-2xl transition-all duration-200
              text-base sm:text-lg
              ${
                isLoading || password.length === 0
                  ? 'bg-slate-300 text-slate-600 cursor-not-allowed'
                  : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-600/30 hover:shadow-xl active:scale-95'
              }
            `}
            aria-label="Entrar"
          >
            {isLoading ? 'Entrando...' : 'Entrar'}
          </button>
        )}
      </div>

      {/* Dica de segurança */}
      <div className="mt-6 sm:mt-8 p-3 sm:p-4 bg-emerald-50 rounded-lg sm:rounded-xl border-2 border-emerald-200">
        <p className="text-xs sm:text-sm text-emerald-700 font-medium">
          🔒 {useNumpad ? 'Use os botões acima para sua segurança.' : 'Use o teclado físico de forma segura.'}
        </p>
      </div>
    </motion.div>
  );
};

export default LoginNumeric;
