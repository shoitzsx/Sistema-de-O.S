import React, { useRef, useState } from 'react';
import { Eye, EyeOff, X } from 'lucide-react';

export interface NumericInputProps {
  value: string;
  onChange: (value: string) => void;
  onFocus?: () => void;
  onBlur?: () => void;
  onKeyDown?: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  placeholder?: string;
  maxLength?: number;
  maskInput?: boolean; // Mostrar * ao invés do número (para PIN/senha)
  disabled?: boolean;
  readOnly?: boolean;
  autoFocus?: boolean;
  className?: string;
  showClearButton?: boolean;
  showVisibilityToggle?: boolean;
}

/**
 * Componente de input numérico seguro e controlado
 * 
 * Características:
 * - Aceita apenas números
 * - Bloqueia paste, drag-drop
 * - Sanitização de input
 * - Pré-definido como readOnly em mobile (usa apenas Numpad)
 * - Máscara opcional (PIN)
 * - Botão de limpar
 */
export const NumericInput = React.forwardRef<HTMLInputElement, NumericInputProps>(
  (
    {
      value,
      onChange,
      onFocus,
      onBlur,
      onKeyDown,
      placeholder = 'Digite um número',
      maxLength = 20,
      maskInput = false,
      disabled = false,
      readOnly = false,
      autoFocus = false,
      className = '',
      showClearButton = false,
      showVisibilityToggle = false,
    },
    ref
  ) => {
    const internalRef = useRef<HTMLInputElement>(null);
    const inputRef = ref || internalRef;
    const [isPasswordVisible, setIsPasswordVisible] = useState(false);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      let newValue = e.target.value;

      // Remover caracteres não-numéricos
      newValue = newValue.replace(/\D/g, '');

      // Limitar comprimento
      if (newValue.length > maxLength) {
        newValue = newValue.slice(0, maxLength);
      }

      onChange(newValue);
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
      // Bloquear caracteres não-numéricos em tempo real
      const key = e.key;
      const isNumeric = /^\d$/.test(key);
      const isControlKey =
        key === 'Backspace' ||
        key === 'Delete' ||
        key === 'Tab' ||
        key === 'Enter' ||
        key === 'ArrowLeft' ||
        key === 'ArrowRight';

      if (!isNumeric && !isControlKey) {
        e.preventDefault();
      }

      onKeyDown?.(e);
    };

    const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
      e.preventDefault();
      // Tentar extrair números do clipboard
      const pastedText = e.clipboardData.getData('text');
      const numericOnly = pastedText.replace(/\D/g, '');

      if (numericOnly) {
        let newValue = value + numericOnly;
        if (newValue.length > maxLength) {
          newValue = newValue.slice(0, maxLength);
        }
        onChange(newValue);
      }
    };

    const handleDragOver = (e: React.DragEvent<HTMLInputElement>) => {
      e.preventDefault();
      e.stopPropagation();
    };

    const handleDrop = (e: React.DragEvent<HTMLInputElement>) => {
      e.preventDefault();
      e.stopPropagation();
    };

    const handleClear = () => {
      onChange('');
      if (inputRef && typeof inputRef !== 'function') {
        inputRef.current?.focus();
      }
    };

    const handleToggleVisibility = () => {
      setIsPasswordVisible((current) => !current);
      if (inputRef && typeof inputRef !== 'function') {
        inputRef.current?.focus();
      }
    };

    const displayValue = maskInput && readOnly ? '•'.repeat(value.length) : value;
    const inputType = maskInput && !readOnly && !isPasswordVisible ? 'password' : 'text';
    const hasActionButtons = showClearButton || (showVisibilityToggle && maskInput && !readOnly);

    return (
      <div className="relative w-full">
        <input
          ref={inputRef}
          type={inputType}
          inputMode="numeric"
          value={displayValue}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          onPaste={handlePaste}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          onFocus={onFocus}
          onBlur={onBlur}
          placeholder={placeholder}
          disabled={disabled}
          readOnly={readOnly}
          autoFocus={autoFocus}
          className={`
            w-full px-4 sm:px-5 py-3 sm:py-4 
            text-lg sm:text-xl font-semibold tracking-widest letter-spacing-2
            rounded-xl sm:rounded-2xl border-2 border-slate-200
            shadow-sm hover:shadow-md transition-all duration-200
            focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 focus:shadow-md
            outline-none
            disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed
            ${hasActionButtons ? 'pr-24 sm:pr-28' : ''}
            ${readOnly ? 'bg-slate-50 cursor-default' : 'bg-white'}
            ${className}
          `}
          autoComplete="off"
          spellCheck={false}
          autoCorrect="off"
          autoCapitalize="off"
        />

        {hasActionButtons && (
          <div className="absolute right-3 sm:right-4 top-1/2 -translate-y-1/2 flex items-center gap-1 sm:gap-2">
            {showVisibilityToggle && maskInput && !readOnly && (
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={handleToggleVisibility}
                disabled={disabled}
                className="p-1 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-all"
                aria-label={isPasswordVisible ? 'Ocultar senha' : 'Mostrar senha'}
              >
                {isPasswordVisible ? (
                  <EyeOff size={18} className="sm:w-5 sm:h-5" />
                ) : (
                  <Eye size={18} className="sm:w-5 sm:h-5" />
                )}
              </button>
            )}

            {showClearButton && value && (
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={handleClear}
                disabled={disabled}
                className="p-1 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                aria-label="Limpar input"
              >
                <X size={18} className="sm:w-5 sm:h-5" />
              </button>
            )}
          </div>
        )}
      </div>
    );
  }
);

NumericInput.displayName = 'NumericInput';
