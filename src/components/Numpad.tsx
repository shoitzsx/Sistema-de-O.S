import React, { useState } from 'react';
import { Delete, RotateCcw } from 'lucide-react';
import { motion } from 'motion/react';

export interface NumpadProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit?: () => void;
  maxLength?: number;
  disabled?: boolean;
  className?: string;
  showClearAll?: boolean;
  submitButtonLabel?: string;
}

/**
 * Componente Numpad (teclado numérico customizado)
 * 
 * Grid 3x4 com:
 * - Números 0-9
 * - Botão Apagar (⌫)
 * - Botão Limpar Tudo (C)
 * - Botão Enviar (Enter) - opcional
 * 
 * Características:
 * - Feedback visual ao clicar
 * - Responsivo (mobile-first)
 * - Acessibilidade com labels
 * - Animações suaves (Framer Motion)
 */
export const Numpad: React.FC<NumpadProps> = ({
  value,
  onChange,
  onSubmit,
  maxLength = 20,
  disabled = false,
  className = '',
  showClearAll = true,
  submitButtonLabel = 'Enviar',
}) => {
  const [pressedKey, setPressedKey] = useState<string | null>(null);

  const handleNumberClick = (num: number) => {
    if (value.length < maxLength && !disabled) {
      onChange(value + num.toString());
    }
  };

  const handleBackspace = () => {
    if (!disabled) {
      onChange(value.slice(0, -1));
    }
  };

  const handleClearAll = () => {
    if (!disabled) {
      onChange('');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    const key = e.key;

    if (/^\d$/.test(key)) {
      const num = parseInt(key);
      if (value.length < maxLength && !disabled) {
        onChange(value + num.toString());
        setPressedKey(key);
        setTimeout(() => setPressedKey(null), 100);
      }
    } else if (key === 'Backspace') {
      e.preventDefault();
      handleBackspace();
      setPressedKey('Backspace');
      setTimeout(() => setPressedKey(null), 100);
    } else if (key === 'Enter' && onSubmit) {
      e.preventDefault();
      onSubmit();
    }
  };

  // Números organizados em grid 3 colunas x 4 linhas
  const numberButtons = [
    [1, 2, 3],
    [4, 5, 6],
    [7, 8, 9],
    [0], // 0 fica sozinho na última linha
  ];

  const buttonVariants = {
    tap: { scale: 0.85 },
    hover: { scale: 1.05 },
  };

  return (
    <div
      className={`numpad-container p-3 sm:p-4 bg-gradient-to-b from-emerald-50 via-white to-slate-50 rounded-2xl sm:rounded-3xl border border-emerald-100 shadow-lg ${className}`}
      onKeyDown={handleKeyDown}
      role="region"
      aria-label="Teclado numérico"
    >
      {/* Grid de números - Responsivo */}
      <div className="grid gap-2 sm:gap-3 mb-3 sm:mb-4">
        {numberButtons.map((row, rowIdx) => (
          <div key={rowIdx} className="grid gap-2 sm:gap-3" style={{ gridTemplateColumns: `repeat(3, 1fr)` }}>
            {row.map((num) => (
              <motion.button
                key={num}
                type="button"
                variants={buttonVariants}
                whileTap="tap"
                whileHover="hover"
                onClick={() => handleNumberClick(num)}
                disabled={disabled}
                className={`
                  py-3 sm:py-5 px-2 sm:px-3 text-xl sm:text-3xl font-bold 
                  rounded-lg sm:rounded-2xl transition-all duration-200
                  ${
                    pressedKey === num.toString()
                      ? 'bg-emerald-600 text-white shadow-lg scale-95'
                      : 'bg-white text-slate-900 shadow-md hover:shadow-xl'
                  }
                  disabled:opacity-50 disabled:cursor-not-allowed
                  border-2 border-slate-200 hover:border-emerald-500
                  active:shadow-inner active:scale-95
                `}
                aria-label={`Número ${num}`}
              >
                {num}
              </motion.button>
            ))}
          </div>
        ))}
      </div>

      {/* Botões de ação: Apagar, Limpar Tudo, Enviar */}
      <div className="grid grid-cols-3 gap-2 sm:gap-3">
        {/* Botão Apagar */}
        <motion.button
          type="button"
          variants={buttonVariants}
          whileTap="tap"
          whileHover="hover"
          onClick={handleBackspace}
          disabled={disabled || value.length === 0}
          className={`
            py-3 sm:py-4 rounded-lg sm:rounded-xl font-semibold transition-all duration-200
            flex items-center justify-center gap-1 sm:gap-2 text-sm sm:text-base
            ${
              pressedKey === 'Backspace'
                ? 'bg-orange-500 text-white shadow-lg scale-95'
                : 'bg-orange-50 text-orange-700 shadow-md hover:shadow-xl border-2 border-orange-200'
            }
            disabled:opacity-50 disabled:cursor-not-allowed
            active:shadow-inner active:scale-95
          `}
          aria-label="Apagar último dígito"
        >
          <Delete size={18} className="sm:w-5 sm:h-5" />
          <span className="hidden sm:inline">Apagar</span>
        </motion.button>

        {/* Botão Limpar Tudo (condicional) */}
        {showClearAll && (
          <motion.button
            type="button"
            variants={buttonVariants}
            whileTap="tap"
            whileHover="hover"
            onClick={handleClearAll}
            disabled={disabled || value.length === 0}
            className={`
              py-3 sm:py-4 rounded-lg sm:rounded-xl font-semibold transition-all duration-200
              flex items-center justify-center gap-1 sm:gap-2 text-sm sm:text-base
              ${
                pressedKey === 'Clear'
                  ? 'bg-red-500 text-white shadow-lg scale-95'
                  : 'bg-red-50 text-red-700 shadow-md hover:shadow-xl border-2 border-red-200'
              }
              disabled:opacity-50 disabled:cursor-not-allowed
              active:shadow-inner active:scale-95
            `}
            aria-label="Limpar todos os dígitos"
          >
            <RotateCcw size={18} className="sm:w-5 sm:h-5" />
            <span className="hidden sm:inline">Limpar</span>
          </motion.button>
        )}

        {/* Botão Enviar (condicional) */}
        {onSubmit && (
          <motion.button
            type="button"
            variants={buttonVariants}
            whileTap="tap"
            whileHover="hover"
            onClick={onSubmit}
            disabled={disabled || value.length === 0}
            className={`
              py-3 sm:py-4 rounded-lg sm:rounded-xl font-semibold transition-all duration-200
              text-sm sm:text-base ${showClearAll ? 'col-span-1' : 'col-span-2'}
              ${
                pressedKey === 'Enter'
                  ? 'bg-emerald-700 text-white shadow-lg scale-95'
                  : 'bg-emerald-600 text-white shadow-md hover:shadow-xl hover:bg-emerald-700 border-2 border-emerald-700'
              }
              disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:border-slate-300
              active:shadow-inner active:scale-95
            `}
            aria-label={submitButtonLabel}
          >
            {submitButtonLabel}
          </motion.button>
        )}
      </div>

      {/* Indicador visual do input */}
      <div className="mt-3 sm:mt-4 p-3 sm:p-4 bg-emerald-50 rounded-lg sm:rounded-xl border-2 border-emerald-200 shadow-sm">
        <div className="text-xs text-emerald-700 mb-2 font-semibold uppercase tracking-wide">Entrada:</div>
        <div className="text-2xl sm:text-3xl font-bold text-emerald-900 tracking-widest letter-spacing-2 min-h-8">
          {'•'.repeat(value.length) || <span className="text-emerald-400">-</span>}
        </div>
        <div className="text-xs text-emerald-600 mt-2 font-medium">
          {value.length} / {maxLength} caractere{value.length !== 1 ? 's' : ''}
        </div>
      </div>
    </div>
  );
};

export default Numpad;
