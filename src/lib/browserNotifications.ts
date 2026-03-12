export type BrowserPermissionState = NotificationPermission | 'unsupported';

interface BrowserNotificationOptions {
  tag?: string;
  navigateTo?: string;
}

export function getBrowserNotificationPermission(): BrowserPermissionState {
  if (typeof window === 'undefined' || typeof Notification === 'undefined') {
    return 'unsupported';
  }

  return Notification.permission;
}

export async function requestBrowserNotificationPermission(): Promise<BrowserPermissionState> {
  if (typeof window === 'undefined' || typeof Notification === 'undefined') {
    return 'unsupported';
  }

  if (Notification.permission === 'granted') {
    return 'granted';
  }

  try {
    const permission = await Notification.requestPermission();
    return permission;
  } catch {
    return Notification.permission;
  }
}

export function showBrowserNotification(
  title: string,
  body: string,
  options?: BrowserNotificationOptions
): boolean {
  if (typeof window === 'undefined' || typeof Notification === 'undefined') {
    return false;
  }

  if (Notification.permission !== 'granted') {
    return false;
  }

  try {
    const notification = new Notification(title, {
      body,
      tag: options?.tag,
    });

    if (options?.navigateTo) {
      notification.onclick = () => {
        try {
          window.focus();
          window.location.assign(options.navigateTo as string);
        } catch {
          // Ignore click navigation failures.
        }
      };
    }

    return true;
  } catch {
    return false;
  }
}
