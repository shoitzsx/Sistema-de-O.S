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
      className={`numpad-container p-4 bg-gradient-to-b from-slate-50 to-slate-100 rounded-2xl ${className}`}
      onKeyDown={handleKeyDown}
      role="region"
      aria-label="Teclado numérico"
    >
      {/* Grid de números */}
      <div className="grid gap-2 mb-3">
        {numberButtons.map((row, rowIdx) => (
          <div key={rowIdx} className="grid gap-2" style={{ gridTemplateColumns: `repeat(3, 1fr)` }}>
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
                  py-4 px-2 text-2xl font-bold rounded-xl transition-all
                  ${
                    pressedKey === num.toString()
                      ? 'bg-emerald-600 text-white shadow-lg'
                      : 'bg-white text-slate-900 shadow-md hover:shadow-lg'
                  }
                  disabled:opacity-50 disabled:cursor-not-allowed
                  border border-slate-200 hover:border-emerald-500
                  active:shadow-inner
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
      <div className="grid grid-cols-3 gap-2">
        {/* Botão Apagar */}
        <motion.button
          type="button"
          variants={buttonVariants}
          whileTap="tap"
          whileHover="hover"
          onClick={handleBackspace}
          disabled={disabled || value.length === 0}
          className={`
            py-3 rounded-xl font-semibold transition-all flex items-center justify-center gap-2
            ${
              pressedKey === 'Backspace'
                ? 'bg-orange-500 text-white shadow-lg'
                : 'bg-white text-slate-700 shadow-md hover:shadow-lg'
            }
            disabled:opacity-50 disabled:cursor-not-allowed
            border border-slate-200 hover:border-orange-500
            active:shadow-inner
          `}
          aria-label="Apagar último dígito"
        >
          <Delete size={18} />
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
              py-3 rounded-xl font-semibold transition-all flex items-center justify-center gap-2
              ${
                pressedKey === 'Clear'
                  ? 'bg-red-500 text-white shadow-lg'
                  : 'bg-white text-slate-700 shadow-md hover:shadow-lg'
              }
              disabled:opacity-50 disabled:cursor-not-allowed
              border border-slate-200 hover:border-red-500
              active:shadow-inner
            `}
            aria-label="Limpar todos os dígitos"
          >
            <RotateCcw size={18} />
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
              py-3 rounded-xl font-semibold transition-all col-span-${showClearAll ? '1' : '2'}
              ${
                pressedKey === 'Enter'
                  ? 'bg-emerald-700 text-white shadow-lg'
                  : 'bg-emerald-600 text-white shadow-md hover:shadow-lg hover:bg-emerald-700'
              }
              disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-slate-300
              border border-emerald-700 
              active:shadow-inner
            `}
            aria-label={submitButtonLabel}
          >
            {submitButtonLabel}
          </motion.button>
        )}
      </div>

      {/* Indicador visual do input */}
      <div className="mt-4 p-3 bg-white rounded-lg border border-slate-200">
        <div className="text-xs text-slate-500 mb-1 font-medium">Entrada:</div>
        <div className="text-2xl font-bold text-slate-900 tracking-widest letter-spacing-2">
          {'•'.repeat(value.length) || <span className="text-slate-400">-</span>}
        </div>
        <div className="text-xs text-slate-400 mt-1">
          {value.length} / {maxLength}
        </div>
      </div>
    </div>
  );
};

export default Numpad;
