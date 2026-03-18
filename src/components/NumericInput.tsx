import React, { useState, useRef, useEffect } from 'react';
import { X } from 'lucide-react';

export interface NumericInputProps {
  value: string;
  onChange: (value: string) => void;
  onFocus?: () => void;
  onBlur?: () => void;
  placeholder?: string;
  maxLength?: number;
  maskInput?: boolean; // Mostrar * ao invés do número (para PIN/senha)
  disabled?: boolean;
  readOnly?: boolean;
  autoFocus?: boolean;
  className?: string;
  showClearButton?: boolean;
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
      placeholder = 'Digite um número',
      maxLength = 20,
      maskInput = false,
      disabled = false,
      readOnly = false,
      autoFocus = false,
      className = '',
      showClearButton = false,
    },
    ref
  ) => {
    const internalRef = useRef<HTMLInputElement>(null);
    const inputRef = ref || internalRef;

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

    const displayValue = maskInput ? '•'.repeat(value.length) : value;

    return (
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
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
            w-full px-4 py-3 rounded-lg border border-slate-200
            focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200
            outline-none transition-all
            disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed
            ${readOnly ? 'bg-slate-50 cursor-default' : 'bg-white'}
            text-lg font-semibold tracking-widest letter-spacing-2
            ${className}
          `}
          autoComplete="off"
          spellCheck={false}
          // Desabilitar autocorrect no iOS
          autoCorrect="off"
          autoCapitalize="off"
        />

        {showClearButton && value && (
          <button
            type="button"
            onClick={handleClear}
            disabled={disabled}
            className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-red-500 transition-colors"
            aria-label="Limpar input"
          >
            <X size={18} />
          </button>
        )}
      </div>
    );
  }
);

NumericInput.displayName = 'NumericInput';
