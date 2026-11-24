import {
  StaffPermissionKey,
  StaffPermissionsMap,
  StaffRolePreset,
  UserProfile
} from '../types/trading';

export const SUPER_ADMIN_EMAIL = 'moe.albzour@gmail.com';

export interface StaffPermissionDefinition {
  key: StaffPermissionKey;
  labelEn: string;
  labelAr: string;
  descriptionEn: string;
  descriptionAr: string;
  superAdminOnly?: boolean;
}

export const STAFF_PERMISSION_CATALOG: StaffPermissionDefinition[] = [
  {
    key: 'canManageChat',
    labelEn: 'Moderate Chat',
    labelAr: 'إدارة الشات والمحادثات',
    descriptionEn: 'Delete chat messages, pin messages, and mute/ban users in chat.',
    descriptionAr: 'حذف رسائل الشات، تثبيت الرسائل، وكتم أو حظر المستخدمين في الشات.'
  },
  {
    key: 'canPostSignals',
    labelEn: 'Post Trading Signals',
    labelAr: 'نشر التوصيات والصفقات',
    descriptionEn: 'Create, update, and close trading signals and TP/SL updates.',
    descriptionAr: 'إنشاء وتحديث وإغلاق التوصيات وتحديثات الأهداف ووقف الخسارة.'
  },
  {
    key: 'canPostAnalysis',
    labelEn: 'Publish Market Analysis',
    labelAr: 'نشر التحليلات والشارت',
    descriptionEn: 'Publish market analysis posts and MBK Pro Chart setups.',
    descriptionAr: 'نشر التحليلات الفنية وإعدادات شارت MBK الاحترافي.'
  },
  {
    key: 'canAccessInbox',
    labelEn: 'Official Support Inbox',
    labelAr: 'صندوق رسائل خدمة العملاء',
    descriptionEn: 'Access the official @mbktrading customer service inbox and reply as MBK Trading.',
    descriptionAr: 'الدخول لصندوق رسائل الدعم الرسمي @mbktrading والرد باسم MBK Trading.'
  },
  {
    key: 'canManageUsers',
    labelEn: 'Manage Users & CRM',
    labelAr: 'إدارة المستخدمين والاشتراكات',
    descriptionEn: 'View CRM directory, edit subscriptions/expiry dates, and add internal staff notes.',
    descriptionAr: 'عرض سجل العملاء، تعديل الباقات وتواريخ الانتهاء، وإضافة ملاحظات داخلية.'
  },
  {
    key: 'canSendPopups',
    labelEn: 'Popups & Bulk Messaging',
    labelAr: 'النوافذ المنبثقة والرسائل الجماعية',
    descriptionEn: 'Create and manage promotional popups and send bulk direct messages.',
    descriptionAr: 'إنشاء وإدارة الإعلانات المنبثقة وإرسال الرسائل الخاصة الجماعية.'
  },
  {
    key: 'canViewAnalytics',
    labelEn: 'View Analytics & Revenue',
    labelAr: 'عرض الإحصائيات والإيرادات',
    descriptionEn: 'View platform KPIs, subscription metrics, and revenue analytics.',
    descriptionAr: 'عرض مؤشرات الأداء وإحصائيات الاشتراكات والإيرادات.'
  },
  {
    key: 'canManageSystem',
    labelEn: 'System, Backup & RBAC',
    labelAr: 'النظام والنسخ الاحتياطي والصلاحيات',
    descriptionEn: 'Access Backup/Restore, Force Update, Push Test, and Staff Permissions (Super Admin).',
    descriptionAr: 'الوصول للنسخ الاحتياطي، التحديث الإجباري، فحص الإشعارات، وصلاحيات الفريق.'
  }
];

export interface RolePresetDefinition {
  id: StaffRolePreset;
  labelEn: string;
  labelAr: string;
  badgeColor: string;
  legacyRole: string;
  permissions: Record<StaffPermissionKey, boolean>;
}

export const EMPTY_PERMISSIONS: Record<StaffPermissionKey, boolean> = {
  canManageChat: false,
  canPostSignals: false,
  canPostAnalysis: false,
  canAccessInbox: false,
  canManageUsers: false,
  canSendPopups: false,
  canViewAnalytics: false,
  canManageSystem: false
};

export const ALL_PERMISSIONS: Record<StaffPermissionKey, boolean> = {
  canManageChat: true,
  canPostSignals: true,
  canPostAnalysis: true,
  canAccessInbox: true,
  canManageUsers: true,
  canSendPopups: true,
  canViewAnalytics: true,
  canManageSystem: true
};

export const ROLE_PRESET_DEFINITIONS: RolePresetDefinition[] = [
  {
    id: 'none',
    labelEn: 'Regular Client (No Staff Access)',
    labelAr: 'عميل عادي (بدون صلاحيات إدارة)',
    badgeColor: '#64748B',
    legacyRole: 'free',
    permissions: { ...EMPTY_PERMISSIONS }
  },
  {
    id: 'chat_moderator',
    labelEn: 'Chat Moderator',
    labelAr: 'مشرف الشات (Chat Moderator)',
    badgeColor: '#3B82F6',
    legacyRole: 'moderator',
    permissions: {
      ...EMPTY_PERMISSIONS,
      canManageChat: true
    }
  },
  {
    id: 'market_analyst',
    labelEn: 'Market Analyst',
    labelAr: 'محلل الأسواق (Market Analyst)',
    badgeColor: '#26A69A',
    legacyRole: 'analyser',
    permissions: {
      ...EMPTY_PERMISSIONS,
      canPostSignals: true,
      canPostAnalysis: true
    }
  },
  {
    id: 'customer_service',
    labelEn: 'Customer Service',
    labelAr: 'خدمة العملاء وبريد الدعم (Customer Service)',
    badgeColor: '#F0B90B',
    legacyRole: 'sales',
    permissions: {
      ...EMPTY_PERMISSIONS,
      canAccessInbox: true
    }
  },
  {
    id: 'operations_manager',
    labelEn: 'Operations Manager',
    labelAr: 'مدير العمليات (Operations Manager)',
    badgeColor: '#00BCD4',
    legacyRole: 'moderator',
    permissions: {
      canManageChat: false,
      canPostSignals: false,
      canPostAnalysis: false,
      canAccessInbox: true,
      canManageUsers: true,
      canSendPopups: true,
      canViewAnalytics: true,
      canManageSystem: false
    }
  },
  {
    id: 'super_admin',
    labelEn: 'Super Admin',
    labelAr: 'المدير العام (Super Admin)',
    badgeColor: '#EF5350',
    legacyRole: 'admin',
    permissions: { ...ALL_PERMISSIONS }
  }
];

export function isSuperAdminUser(user?: Partial<UserProfile> | null): boolean {
  if (!user) return false;
  const email = (user.email || '').toLowerCase().trim();
  if (email === SUPER_ADMIN_EMAIL) return true;
  const role = (user.role || '').toString().toUpperCase();
  const staffRole = (user.staffRole || '').toString().toLowerCase();
  return Boolean(
    user.isAdmin ||
      role === 'ADMIN' ||
      staffRole === 'super_admin' ||
      user.permissions?.canManageSystem === true
  );
}

/**
 * Resolves the complete 8-flag permission map for a user profile, combining:
 * 1. Super Admin status (all true)
 * 2. Explicit `user.permissions` boolean flags stored in Firestore
 * 3. Fallback preset from `user.staffRole` or legacy `user.role` ('moderator' | 'analyser' | 'sales' | 'admin')
 */
export function resolveStaffPermissions(
  user?: Partial<UserProfile> | null
): Record<StaffPermissionKey, boolean> {
  if (!user || user.isBanned) {
    return { ...EMPTY_PERMISSIONS };
  }

  if (isSuperAdminUser(user)) {
    return { ...ALL_PERMISSIONS };
  }

  const base: Record<StaffPermissionKey, boolean> = { ...EMPTY_PERMISSIONS };

  const staffRole = (user.staffRole || '').toString().toLowerCase();
  const legacyRole = (user.role || '').toString().toLowerCase();

  const matchedPreset = ROLE_PRESET_DEFINITIONS.find((p) => p.id === staffRole);
  if (matchedPreset && matchedPreset.id !== 'none') {
    Object.assign(base, matchedPreset.permissions);
  } else if (legacyRole === 'moderator') {
    base.canManageChat = true;
  } else if (legacyRole === 'analyser' || legacyRole === 'analyst') {
    base.canPostSignals = true;
    base.canPostAnalysis = true;
  } else if (legacyRole === 'sales') {
    base.canAccessInbox = true;
  }

  if (user.permissions && typeof user.permissions === 'object') {
    const keys = Object.keys(EMPTY_PERMISSIONS) as StaffPermissionKey[];
    for (const k of keys) {
      if (typeof user.permissions[k] === 'boolean') {
        base[k] = Boolean(user.permissions[k]);
      }
    }
  }

  return base;
}

export function hasStaffPermission(
  user: Partial<UserProfile> | null | undefined,
  permission: StaffPermissionKey
): boolean {
  const perms = resolveStaffPermissions(user);
  return Boolean(perms[permission]);
}

export function hasAnyStaffPermission(user?: Partial<UserProfile> | null): boolean {
  if (!user || user.isBanned) return false;
  if (isSuperAdminUser(user)) return true;
  const perms = resolveStaffPermissions(user);
  return Object.values(perms).some(Boolean);
}

/**
 * Returns true ONLY if the staff member has at least one permission that unlocks a tab inside the Admin Panel.
 * Staff with ONLY `canAccessInbox` (Support Inbox in Messenger) or ONLY `canManageChat` (Chat moderation in Trading Chat)
 * do not need the Admin Panel and never mount CRM/Analytics/System queries.
 */
export function hasAdminPanelPermission(user?: Partial<UserProfile> | null): boolean {
  if (!user || user.isBanned) return false;
  if (isSuperAdminUser(user)) return true;
  const perms = resolveStaffPermissions(user);
  return Boolean(
    perms.canViewAnalytics ||
      perms.canManageUsers ||
      perms.canSendPopups ||
      perms.canPostSignals ||
      perms.canPostAnalysis ||
      perms.canManageSystem
  );
}

export function detectRolePresetFromPermissions(
  perms: StaffPermissionsMap | undefined,
  isSuper?: boolean
): StaffRolePreset {
  if (isSuper) return 'super_admin';
  const normalized: Record<StaffPermissionKey, boolean> = {
    ...EMPTY_PERMISSIONS,
    ...(perms || {})
  };
  for (const preset of ROLE_PRESET_DEFINITIONS) {
    const allMatch = (Object.keys(EMPTY_PERMISSIONS) as StaffPermissionKey[]).every(
      (k) => Boolean(normalized[k]) === Boolean(preset.permissions[k])
    );
    if (allMatch) return preset.id;
  }
  const hasAny = Object.values(normalized).some(Boolean);
  return hasAny ? 'custom' : 'none';
}

export function getStaffRoleLabel(user: Partial<UserProfile> | null | undefined, isAr: boolean): string {
  if (!user) return isAr ? 'عميل' : 'Client';
  if (isSuperAdminUser(user)) return isAr ? 'المدير العام (Super Admin)' : 'Super Admin';

  const perms = resolveStaffPermissions(user);
  const presetId =
    (user.staffRole as StaffRolePreset | undefined) &&
    ROLE_PRESET_DEFINITIONS.some((p) => p.id === user.staffRole)
      ? (user.staffRole as StaffRolePreset)
      : detectRolePresetFromPermissions(perms, false);

  const preset = ROLE_PRESET_DEFINITIONS.find((p) => p.id === presetId);
  if (preset && preset.id !== 'none') {
    return isAr ? preset.labelAr : preset.labelEn;
  }
  if (presetId === 'custom' || Object.values(perms).some(Boolean)) {
    return isAr ? 'طاقم مخصص (Custom Staff)' : 'Custom Staff';
  }
  return isAr ? 'عميل' : 'Client';
}
