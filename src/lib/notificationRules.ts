export interface NotificationRules {
  enableOpenAlerts: boolean;
  enableOverdueAlerts: boolean;
  enableBrowserNotifications: boolean;
  overdueHours: number;
  remindEveryMinutes: number;
}

const DEFAULT_RULES: NotificationRules = {
  enableOpenAlerts: true,
  enableOverdueAlerts: true,
  enableBrowserNotifications: false,
  overdueHours: 24,
  remindEveryMinutes: 15,
};

const GLOBAL_RULES_KEY = 'notification-rules:global';

function normalizeRules(input: Partial<NotificationRules> | null | undefined): NotificationRules {
  return {
    enableOpenAlerts: input?.enableOpenAlerts ?? DEFAULT_RULES.enableOpenAlerts,
    enableOverdueAlerts: input?.enableOverdueAlerts ?? DEFAULT_RULES.enableOverdueAlerts,
    enableBrowserNotifications: input?.enableBrowserNotifications ?? DEFAULT_RULES.enableBrowserNotifications,
    overdueHours: Math.min(168, Math.max(1, Number(input?.overdueHours ?? DEFAULT_RULES.overdueHours))),
    remindEveryMinutes: Math.min(180, Math.max(5, Number(input?.remindEveryMinutes ?? DEFAULT_RULES.remindEveryMinutes))),
  };
}

export function getDefaultNotificationRules(): NotificationRules {
  return { ...DEFAULT_RULES };
}

export function getNotificationRules(userId: number): NotificationRules {
  if (typeof window === 'undefined') return getDefaultNotificationRules();

  const raw = localStorage.getItem(`notification-rules:${userId}`);
  if (!raw) return getDefaultNotificationRules();

  try {
    const parsed = JSON.parse(raw) as Partial<NotificationRules>;
    return normalizeRules(parsed);
  } catch {
    return getDefaultNotificationRules();
  }
}

export function saveNotificationRules(userId: number, rules: NotificationRules) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(`notification-rules:${userId}`, JSON.stringify(normalizeRules(rules)));
}

export function getGlobalNotificationRules(): NotificationRules | null {
  if (typeof window === 'undefined') return null;

  const raw = localStorage.getItem(GLOBAL_RULES_KEY);
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as Partial<NotificationRules>;
    return normalizeRules(parsed);
  } catch {
    return null;
  }
}

export function saveGlobalNotificationRules(rules: NotificationRules) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(GLOBAL_RULES_KEY, JSON.stringify(normalizeRules(rules)));
}

export function getOperationalNotificationRules(userId: number, isAdmin: boolean): NotificationRules {
  if (isAdmin) {
    return getNotificationRules(userId);
  }

  const global = getGlobalNotificationRules();
  if (global) return global;

  return getNotificationRules(userId);
}
