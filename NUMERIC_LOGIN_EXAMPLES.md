# Exemplos de Uso | Sistema de Login Numérico

## 📌 Sumário de Exemplos

1. [Login com Validação Customizada](#exemplo-1-login-com-validação-customizada)
2. [Input Numérico Independente](#exemplo-2-input-numérico-independente)
3. [Numpad para Kiosk/Menu](#exemplo-3-numpad-para-kioskmenu)
4. [Entrada de PIN (OTP)](#exemplo-4-entrada-de-pin-otp)
5. [Login com Biometria](#exemplo-5-login-com-biometria--fallback)
6. [Debugger de Dispositivo](#exemplo-6-debugger-de-dispositivo)

---

## Exemplo 1: Login com Validação Customizada

Usar `LoginNumeric` com validação avançada e rate limiting:

```typescript
import { LoginNumeric } from '../components/LoginNumeric';
import { useState } from 'react';

export function LoginWithValidation() {
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [password, setPassword] = useState('');
  const [validationError, setValidationError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [attemptCount, setAttemptCount] = useState(0);
  const MAX_ATTEMPTS = 5;

  const handleSubmit = async (passwordValue: string) => {
    // Rate limiting: bloquear após 5 tentativas
    if (attemptCount >= MAX_ATTEMPTS) {
      setValidationError('Muitas tentativas. Tente novamente em 5 minutos.');
      return;
    }

    // Validação: mínimo 4 caracteres
    if (passwordValue.length < 4) {
      setValidationError('Senha deve ter no mínimo 4 dígitos');
      return;
    }

    setValidationError('');
    setIsLoading(true);
    setAttemptCount((prev) => prev + 1);

    try {
      const response = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: selectedUser.username,
          password: passwordValue,
        }),
      });

      if (!response.ok) {
        setValidationError('Senha incorreta');
        setIsLoading(false);
        return;
      }

      const data = await response.json();
      console.log('Login sucesso:', data);
      // Navegar para dashboard
    } catch (error) {
      setValidationError('Erro ao conectar. Tente novamente.');
      setIsLoading(false);
    }
  };

  if (!selectedUser) {
    return <div>Selecionar usuário...</div>;
  }

  return (
    <LoginNumeric
      userName={selectedUser.name}
      userInitial={selectedUser.name.charAt(0)}
      onBack={() => setSelectedUser(null)}
      onSubmit={handleSubmit}
      isLoading={isLoading}
      error={validationError}
    />
  );
}
```

---

## Exemplo 2: Input Numérico Independente

Usar `NumericInput` para outros campos (CPF, CNPJ, Telefone, etc):

```typescript
import { NumericInput } from '../components/NumericInput';
import { useState } from 'react';

export function MaskedInputExamples() {
  const [cpf, setCpf] = useState('');
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');

  // Formatar CPF: 000.000.000-00
  const formatCPF = (value: string) => {
    let formatted = value.replace(/\D/g, '');
    if (formatted.length > 11) formatted = formatted.slice(0, 11);
    formatted = formatted.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
    return formatted;
  };

  // Formatar Telefone: (00) 00000-0000
  const formatPhone = (value: string) => {
    let formatted = value.replace(/\D/g, '');
    if (formatted.length > 11) formatted = formatted.slice(0, 11);
    formatted = formatted.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
    return formatted;
  };

  return (
    <div className="space-y-6 p-4">
      <div>
        <label className="block text-sm font-medium mb-2">CPF</label>
        <NumericInput
          value={cpf}
          onChange={setCpf}
          placeholder="000.000.000-00"
          maxLength={14}
          maskInput={false}
          className="font-mono"
        />
        <div className="text-xs text-slate-500 mt-1">
          Formatado: {formatCPF(cpf) || 'N/A'}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium mb-2">Telefone</label>
        <NumericInput
          value={phone}
          onChange={setPhone}
          placeholder="(00) 00000-0000"
          maxLength={15}
          maskInput={false}
          className="font-mono"
        />
        <div className="text-xs text-slate-500 mt-1">
          Formatado: {formatPhone(phone) || 'N/A'}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium mb-2">Código (Com Máscara)</label>
        <NumericInput
          value={code}
          onChange={setCode}
          placeholder="••••••"
          maxLength={6}
          maskInput={true}
          showClearButton={true}
        />
      </div>
    </div>
  );
}
```

---

## Exemplo 3: Numpad para Kiosk/Menu

Usar `Numpad` como menu de navegação numérica:

```typescript
import { Numpad } from '../components/Numpad';
import { useState } from 'react';

export function KioskNumericMenu() {
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [inputValue, setInputValue] = useState('');

  const handleNumpadSubmit = () => {
    if (inputValue) {
      const option = parseInt(inputValue);
      setSelectedOption(option);
      console.log('Opção selecionada:', option);

      // Simular ação
      setTimeout(() => {
        setInputValue('');
        setSelectedOption(null);
      }, 2000);
    }
  };

  const menuOptions: Record<number, string> = {
    1: '📋 Checklist',
    2: '🛠️ Maintenance',
    3: '📊 Dashboard',
    4: '👥 Users',
    5: '📱 Mobile',
  };

  return (
    <div className="space-y-6 p-4 max-w-md mx-auto">
      <div className="text-center">
        <h2 className="text-2xl font-bold mb-2">Menu Numérico</h2>
        <p className="text-slate-600">Selecione uma opção (1-5):</p>
      </div>

      {/* Menu de opções */}
      <div className="grid gap-2">
        {Object.entries(menuOptions).map(([key, label]) => (
          <div
            key={key}
            className={`p-3 rounded-lg border-2 transition-all ${
              selectedOption?.toString() === key
                ? 'border-emerald-600 bg-emerald-50'
                : 'border-slate-200 bg-white'
            }`}
          >
            <strong>{key}</strong> - {label}
          </div>
        ))}
      </div>

      {/* Numpad */}
      <Numpad
        value={inputValue}
        onChange={setInputValue}
        onSubmit={handleNumpadSubmit}
        maxLength={1}
        submitButtonLabel="Confirmar"
      />

      {/* Feedback */}
      {selectedOption && (
        <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
          <p className="text-green-700">✅ Você selecionou: {menuOptions[selectedOption]}</p>
        </div>
      )}
    </div>
  );
}
```

---

## Exemplo 4: Entrada de PIN (OTP)

Estilo PIN com 6 dígitos em boxes separados:

```typescript
import { Numpad } from '../components/Numpad';
import { useState } from 'react';

export function PINInput() {
  const [pin, setPin] = useState('');
  const MAX_PIN = 6;

  const handleSubmit = async () => {
    if (pin.length === MAX_PIN) {
      console.log('PIN enviado:', pin);
      // Validar PIN no backend
    }
  };

  return (
    <div className="space-y-6 p-4 max-w-md mx-auto">
      <div>
        <h2 className="text-2xl font-bold mb-2">Código de Verificação</h2>
        <p className="text-slate-600 text-sm">Insira o código de 6 dígitos</p>
      </div>

      {/* Exibição em boxes */}
      <div className="flex justify-center gap-2 mb-6">
        {Array.from({ length: MAX_PIN }).map((_, idx) => (
          <div
            key={idx}
            className={`
              w-12 h-12 rounded-lg border-2 flex items-center justify-center
              text-2xl font-bold transition-all
              ${
                idx < pin.length
                  ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                  : 'border-slate-300 bg-white text-slate-400'
              }
            `}
          >
            {idx < pin.length ? '•' : '-'}
          </div>
        ))}
      </div>

      {/* Numpad */}
      <Numpad
        value={pin}
        onChange={setPin}
        onSubmit={handleSubmit}
        maxLength={MAX_PIN}
        showClearAll={true}
        submitButtonLabel={pin.length === MAX_PIN ? 'Verificar' : 'Aguardando...'}
      />

      {/* Status */}
      {pin.length === MAX_PIN && (
        <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
          <p className="text-green-700 text-sm">✅ PIN completo. Clique em "Verificar"</p>
        </div>
      )}
    </div>
  );
}
```

---

## Exemplo 5: Login com Biometria + Fallback

Detectar suporte a biometria e oferecer fallback para numpad:

```typescript
import { useDeviceDetection, shouldUseNumpad } from '../hooks/useDeviceDetection';
import { Numpad } from '../components/Numpad';
import { NumericInput } from '../components/NumericInput';
import { useState, useEffect } from 'react';

export function BiometricLoginWithFallback() {
  const [useBiometric, setUseBiometric] = useState(false);
  const [password, setPassword] = useState('');
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const deviceInfo = useDeviceDetection();

  // Detectar suporte a biometria (Web Authentication API)
  useEffect(() => {
    if (window.PublicKeyCredential) {
      PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable().then(
        (isAvailable) => {
          setBiometricAvailable(isAvailable);
        }
      );
    }
  }, []);

  const handleBiometricLogin = async () => {
    setIsLoading(true);
    try {
      // Implementar chamada para WebAuthn aqui
      console.log('Biometria autenticando...');
    } catch (error) {
      console.error('Erro na biometria:', error);
      setIsLoading(false);
    }
  };

  const showUseNumpad = shouldUseNumpad(deviceInfo);

  if (useBiometric && biometricAvailable) {
    return (
      <div className="space-y-4 p-4 max-w-md mx-auto">
        <button
          onClick={handleBiometricLogin}
          disabled={isLoading}
          className="w-full p-4 bg-emerald-500 text-white rounded-lg font-semibold"
        >
          {isLoading ? 'Autenticando...' : '🔒 Usar Biometria'}
        </button>
        <button
          onClick={() => setUseBiometric(false)}
          className="w-full p-2 bg-slate-200 text-slate-700 rounded-lg text-sm"
        >
          Usar Numpad ao invés
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4 p-4 max-w-2xl mx-auto">
      {biometricAvailable && !useBiometric && (
        <button
          onClick={() => setUseBiometric(true)}
          className="w-full p-4 bg-blue-500 text-white rounded-lg font-semibold mb-4"
        >
          👆 Usar Biometria
        </button>
      )}

      <div>
        <h2 className="text-xl font-bold mb-4">Login com Numpad</h2>
        {showUseNumpad ? (
          <Numpad
            value={password}
            onChange={setPassword}
            onSubmit={() => console.log('Login com:', password)}
          />
        ) : (
          <NumericInput
            value={password}
            onChange={setPassword}
            placeholder="Digite sua senha"
            maskInput={true}
            showClearButton={true}
          />
        )}
      </div>
    </div>
  );
}
```

---

## Exemplo 6: Debugger de Dispositivo

Útil para testar detecção de dispositivo:

```typescript
import { useDeviceDetection } from '../hooks/useDeviceDetection';

export function DeviceDetectionDebugger() {
  const deviceInfo = useDeviceDetection();

  return (
    <div className="space-y-4 p-4 max-w-md mx-auto bg-slate-50 rounded-lg border border-slate-200">
      <h3 className="font-bold text-lg">🔍 Device Detection Debug</h3>

      <div className="grid gap-2 text-sm font-mono">
        <div className="flex justify-between">
          <span>deviceType:</span>
          <span className="font-bold text-emerald-600">{deviceInfo.deviceType}</span>
        </div>
        <div className="flex justify-between">
          <span>isMobile:</span>
          <span className={deviceInfo.isMobile ? 'text-green-600' : 'text-red-600'}>
            {String(deviceInfo.isMobile)}
          </span>
        </div>
        <div className="flex justify-between">
          <span>isTablet:</span>
          <span className={deviceInfo.isTablet ? 'text-green-600' : 'text-red-600'}>
            {String(deviceInfo.isTablet)}
          </span>
        </div>
        <div className="flex justify-between">
          <span>isIOS:</span>
          <span className={deviceInfo.isIOS ? 'text-green-600' : 'text-red-600'}>
            {String(deviceInfo.isIOS)}
          </span>
        </div>
        <div className="flex justify-between">
          <span>isAndroid:</span>
          <span className={deviceInfo.isAndroid ? 'text-green-600' : 'text-red-600'}>
            {String(deviceInfo.isAndroid)}
          </span>
        </div>
        <div className="flex justify-between">
          <span>hasTouch:</span>
          <span className={deviceInfo.hasTouch ? 'text-green-600' : 'text-red-600'}>
            {String(deviceInfo.hasTouch)}
          </span>
        </div>
        <div className="border-t pt-2 mt-2">
          <div className="flex justify-between">
            <span>screenWidth:</span>
            <span>{deviceInfo.screenWidth}px</span>
          </div>
          <div className="flex justify-between">
            <span>screenHeight:</span>
            <span>{deviceInfo.screenHeight}px</span>
          </div>
        </div>
      </div>

      {/* Indicador visual */}
      <div className="mt-4 p-3 rounded bg-white border-2 border-emerald-500">
        {deviceInfo.isMobile && 'Mostrar: NUMPAD'}
        {deviceInfo.isTablet && 'Mostrar: NUMPAD (Tablet)'}
        {deviceInfo.deviceType === 'desktop' && 'Mostrar: INPUT + BOTÃO'}
      </div>
    </div>
  );
}
```

---

## 🚀 Como Usar Estes Exemplos

1. **Copie o código** de qualquer exemplo acima
2. **Cole em seu componente** (crie novo arquivo em `src/pages/` ou `src/components/`)
3. **Ajuste imports** conforme necessário
4. **Teste em navegador** ou dispositivo real
5. **Customize** cores, labels, comportamentos

---

## 📚 Próximas Ideias

- ✅ 2FA (Two-Factor Auth) com OTP
- ✅ Login com QR Code
- ✅ Recuperação de conta
- ✅ Autenticação biométrica (WebAuthn)
- ✅ Histórico de logins
- ✅ Session management

---

**Última atualização**: Março 2026  
**Status**: Pronto para usar ✅
