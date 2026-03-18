import { useEffect, useState } from 'react';

/**
 * Tipo para detecção de dispositivo
 */
export interface DeviceInfo {
  isMobile: boolean;
  isTablet: boolean;
  isIOS: boolean;
  isAndroid: boolean;
  deviceType: 'mobile' | 'tablet' | 'desktop';
  screenWidth: number;
  screenHeight: number;
  hasTouch: boolean;
}

/**
 * Hook para detecção confiável de dispositivo/mobile
 * 
 * Utiliza múltiplas estratégias para máxima compatibilidade:
 * 1. navigator.userAgentData (API moderna, testes de layout)
 * 2. navigator.userAgent (fallback tradicional)
 * 3. Detecção de toque (ontouchstart, matchMedia)
 * 4. Dimensões de tela (mobile-first)
 * 
 * @returns DeviceInfo com informações do dispositivo
 */
export function useDeviceDetection(): DeviceInfo {
  const [deviceInfo, setDeviceInfo] = useState<DeviceInfo>(() => {
    if (typeof window === 'undefined') {
      // SSR fallback
      return {
        isMobile: false,
        isTablet: false,
        isIOS: false,
        isAndroid: false,
        deviceType: 'desktop',
        screenWidth: 1024,
        screenHeight: 768,
        hasTouch: false,
      };
    }

    return detectDevice();
  });

  useEffect(() => {
    // Detectar mudanças de orientação ou redimensionamento
    const handleResize = () => {
      setDeviceInfo(detectDevice());
    };

    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleResize);
    };
  }, []);

  return deviceInfo;
}

/**
 * Função auxiliar para detectar informações do dispositivo
 */
function detectDevice(): DeviceInfo {
  const screenWidth = window.innerWidth;
  const screenHeight = window.innerHeight;
  const userAgent = navigator.userAgent.toLowerCase();

  // Detectar iOS
  const isIOS =
    /iphone|ipad|ipod/.test(userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

  // Detectar Android
  const isAndroid = /android/.test(userAgent);

  // Detectar suporte a toque
  const hasTouch = () => {
    if (typeof window === 'undefined') return false;

    // Método 1: navigator.maxTouchPoints (mais confiável)
    if ('maxTouchPoints' in navigator && navigator.maxTouchPoints > 0) {
      return true;
    }

    // Método 2: ontouchstart
    if ('ontouchstart' in window) {
      return true;
    }

    // Método 3: Media Query
    if (window.matchMedia('(hover: none) and (pointer: coarse)').matches) {
      return true;
    }

    return false;
  };

  const touchSupport = hasTouch();

  // Detectar se é tablet ou mobile
  // iPad Pro: 1024x1366, iPad Air: 820x1180, iPad Mini: 768x1024
  // Tablets Android: geralmente > 600px
  const isTabletDimension = screenWidth >= 600 && screenWidth <= 1024;
  const isTabletUA = /ipad|android/.test(userAgent) && !/mobile|phone/.test(userAgent);

  const isTablet = (isTabletDimension || isTabletUA) && touchSupport;

  // Mobile: toque + width < 900px
  const isMobile = touchSupport && screenWidth < 900 && !isTablet;

  // Classificar tipo de dispositivo
  let deviceType: 'mobile' | 'tablet' | 'desktop' = 'desktop';
  if (isMobile) deviceType = 'mobile';
  else if (isTablet) deviceType = 'tablet';

  return {
    isMobile,
    isTablet,
    isIOS,
    isAndroid,
    deviceType,
    screenWidth,
    screenHeight,
    hasTouch: touchSupport,
  };
}

/**
 * Função auxiliar para detectar se deve usar numpad
 * Útil para expressar a lógica de negócio de forma clara
 */
export function shouldUseNumpad(deviceInfo: DeviceInfo): boolean {
  return deviceInfo.isMobile || deviceInfo.isTablet;
}
