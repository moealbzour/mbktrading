import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  updateProfile,
  updatePassword,
  EmailAuthProvider,
  reauthenticateWithCredential,
  onAuthStateChanged,
  sendEmailVerification,
  sendPasswordResetEmail,
  User as FirebaseUser
} from 'firebase/auth';
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  onSnapshot,
  serverTimestamp
} from 'firebase/firestore';
import { auth, googleProvider, db } from '../lib/firebase';
import { UserProfile } from '../types/trading';
import { redeemActivationKey } from '../utils/activationKeyService';

const SUPER_ADMIN_EMAIL = 'moe.albzour@gmail.com';

const pendingRegistrationUids = new Set<string>();
let inFlightGoogleSignIn: Promise<UserCredentialResult> | null = null;

interface UserCredentialResult {
  userProfile: UserProfile;
  isNewUser: boolean;
  uid: string;
}

/**
 * Arabic/English Firebase Auth & Firestore Error Message Translation
 */
export function getFirebaseAuthErrorMessage(error: any): string {
  const code = error?.code || '';
  const rawMessage = String(error?.message || '');
  const currentHost = typeof window !== 'undefined' ? window.location.hostname : '';

  switch (code) {
    case 'auth/email-already-in-use':
      return 'البريد الإلكتروني مسجل مسبقاً. يرجى استخدام صفحة تسجيل الدخول.';
    case 'auth/invalid-email':
      return 'صيغة البريد الإلكتروني غير صحيحة.';
    case 'auth/weak-password':
      return 'كلمة المرور ضعيفة جداً. يجب أن تتكون من 6 أحرف أو أرقام على الأقل.';
    case 'auth/user-not-found':
      return 'لا يوجد حساب مسجل بهذا البريد الإلكتروني.';
    case 'auth/wrong-password':
    case 'auth/invalid-credential':
      return 'اسم المستخدم أو كلمة المرور غير صحيحة. يرجى التحقق من البيانات.';
    case 'auth/popup-closed-by-user':
      return 'تم إغلاق نافذة الدخول عبر Google قبل إتمام العملية.';
    case 'auth/cancelled-popup-request':
      return 'تم إلغاء الطلب السابق. يرجى الضغط مرة واحدة فقط على زر Google.';
    case 'auth/popup-blocked':
      return 'المتصفح قام بحظر نافذة الدخول عبر Google. يرجى السماح بالنوافذ المنبثقة (Pop-ups) لهذا الموقع ثم المحاولة مجدداً.';
    case 'auth/unauthorized-domain':
      return `النطاق الحالي (${currentHost || 'preview domain'}) غير مضاف في قائمة Authorized Domains داخل إعدادات Firebase Authentication.`;
    case 'auth/operation-not-allowed':
      return 'مزود تسجيل الدخول عبر Google غير مفعّل في لوحة تحكم Firebase Authentication.';
    case 'auth/account-exists-with-different-credential':
      return 'هذا البريد الإلكتروني مسجل مسبقاً بكلمة مرور. يرجى تسجيل الدخول بالبريد وكلمة المرور.';
    case 'auth/user-disabled':
      return 'تم تعطيل هذا الحساب في نظام المصادقة. يرجى التواصل مع الدعم.';
    case 'auth/network-request-failed':
      return 'تعذر الاتصال بالخادم. يرجى التحقق من اتصال الإنترنت.';
    case 'auth/too-many-requests':
      return 'تم حظر المحاولات مؤقتاً. يرجى الانتظار قليلاً والتحقق مجدداً.';
    case 'auth/requires-recent-login':
      return 'تتطلب هذه العملية التحقق من كلمة المرور الحالية أو إعادة تسجيل الدخول مؤخراً.';
    case 'permission-denied':
      return 'تعذر حفظ بيانات الحساب في قاعدة البيانات (صلاحيات Firestore).';
    case 'unavailable':
      return 'خدمة قاعدة البيانات غير متاحة مؤقتاً. يرجى المحاولة مرة أخرى.';
    default:
      if (rawMessage.toLowerCase().includes('missing or insufficient permissions')) {
        return 'تعذر حفظ بيانات الحساب في قاعدة البيانات (صلاحيات Firestore).';
      }
      return code ? `[${code}] ${rawMessage || 'حدث خطأ أثناء إجراء العملية.'}` : rawMessage || 'حدث خطأ أثناء إجراء العملية.';
  }
}

export interface FirestoreUserData {
  email: string | null;
  role: 'free' | 'vip' | 'elite' | 'admin' | string;
  tier?: 'free' | 'vip' | 'elite';
  isVip?: boolean;
  vipAccess?: boolean;
  vipExpiryDate?: string | null;
  isElite?: boolean;
  eliteExpiryDate?: string | null;
  grantedFeatures?: Record<string, string>;
  subscription_status?: string;
  subscription_end_date?: string | null;
  createdAt?: any;
  phone?: string;
  country?: string;
  dob?: string;
  experienceLevel?: string;
  assetClasses?: string[];
  favoritePairs?: string;
  isBanned?: boolean;
  isMutedFromChat?: boolean;
}

export interface UserOnboardingData {
  phone?: string;
  country?: string;
  dob?: string;
  experienceLevel?: 'Beginner' | 'Intermediate' | 'Advanced' | 'Institutional' | string;
  assetClasses?: string[];
  favoritePairs?: string;
  promoCode?: string;
}

function buildPlanName(normalizedRole: string, tier: 'free' | 'vip' | 'elite'): string {
  if (normalizedRole === 'ADMIN') return 'مدير المنصة (Admin)';
  if (normalizedRole === 'MODERATOR') return 'مشرف النظام (Moderator)';
  if (normalizedRole === 'SALES') return 'فريق المبيعات (Sales)';
  if (normalizedRole === 'ANALYSER' || normalizedRole === 'ANALYST') return 'محلل معتمد (Analyst)';
  if (tier === 'elite' || normalizedRole === 'ELITE') return 'باقة Elite المؤسسية ($500/mo)';
  if (tier === 'vip' || normalizedRole === 'VIP') return 'باقة VIP ($100/mo)';
  return 'الباقة المجانية (Free)';
}

function normalizeTimestampToIso(value: any): string | null {
  if (!value) return null;
  if (typeof value === 'string') return value;
  if (typeof value?.toDate === 'function') {
    return value.toDate().toISOString();
  }
  if (typeof value?.seconds === 'number') {
    return new Date(value.seconds * 1000).toISOString();
  }
  return null;
}

function mapUserDocToProfile(firebaseUser: FirebaseUser, data: Record<string, any> = {}): UserProfile {
  const isSuperAdmin =
    firebaseUser.emailVerified &&
    firebaseUser.email?.toLowerCase() === SUPER_ADMIN_EMAIL;

  let role = isSuperAdmin
    ? 'admin'
    : (data.role || 'free').toString().toLowerCase();

  const rawTier = (data.tier || '').toString().toLowerCase();
  const eliteEndDate: string | null =
    data.eliteExpiryDate || data.subscription_end_date || data.subscriptionEndDate || null;
  const subEndDate: string | null =
    data.subscription_end_date || data.subscriptionEndDate || data.vipExpiryDate || null;

  const parsedEnd = subEndDate ? new Date(subEndDate).getTime() : 0;
  const isExpired = Boolean(subEndDate && !Number.isNaN(parsedEnd) && parsedEnd <= Date.now());

  const parsedEliteEnd = eliteEndDate ? new Date(eliteEndDate).getTime() : 0;
  const isEliteExpired = Boolean(eliteEndDate && !Number.isNaN(parsedEliteEnd) && parsedEliteEnd <= Date.now());

  if ((role === 'vip' || role === 'elite') && isExpired && !isSuperAdmin) {
    role = 'free';
  }

  let subStatus: 'active' | 'expired' | 'none' =
    (data.subscription_status || data.subscriptionStatus || (role === 'vip' || role === 'elite' ? 'active' : 'none')) as any;
  if (isExpired && !isSuperAdmin) {
    subStatus = 'expired';
  }

  const normalizedRole = role.toUpperCase();
  const rawStaffRole = typeof data.staffRole === 'string' ? data.staffRole : undefined;
  const rawPermissions =
    data.permissions && typeof data.permissions === 'object' ? data.permissions : undefined;
  const hasGranularPerms =
    Boolean(rawStaffRole && rawStaffRole !== 'none') ||
    Boolean(rawPermissions && Object.values(rawPermissions).some(Boolean));

  const isAdmin =
    normalizedRole === 'ADMIN' ||
    rawStaffRole === 'super_admin' ||
    Boolean(rawPermissions?.canManageSystem);
  const isStaff =
    isAdmin ||
    ['ADMIN', 'MODERATOR', 'SALES', 'ANALYSER', 'ANALYST'].includes(normalizedRole) ||
    hasGranularPerms;

  const isElite =
    isAdmin ||
    isStaff ||
    ((rawTier === 'elite' || normalizedRole === 'ELITE' || Boolean(data.isElite)) && !isEliteExpired);

  const isVip =
    isAdmin ||
    isElite ||
    normalizedRole === 'VIP' ||
    ((rawTier === 'vip' || Boolean(data.isVip) || Boolean(data.vipAccess)) && !isExpired);

  const effectiveTier: 'free' | 'vip' | 'elite' = isElite ? 'elite' : isVip ? 'vip' : 'free';

  const grantedFeatures: Record<string, string> = {};
  if (data.grantedFeatures && typeof data.grantedFeatures === 'object') {
    for (const [k, v] of Object.entries(data.grantedFeatures)) {
      if (typeof v === 'string') grantedFeatures[k] = v;
    }
  }

  const isVerified =
    firebaseUser.emailVerified ||
    firebaseUser.providerData.some((p) => p.providerId === 'google.com');

  return {
    uid: firebaseUser.uid,
    id: firebaseUser.uid,
    email: firebaseUser.email || data.email || '',
    name: data.displayName || firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'متداول MBK',
    role: normalizedRole,
    tier: effectiveTier,
    planName: buildPlanName(normalizedRole, effectiveTier),
    avatar: firebaseUser.photoURL || data.avatar || undefined,
    isAdmin,
    isStaff,
    staffRole: isAdmin ? 'super_admin' : rawStaffRole,
    permissions: rawPermissions,
    isVip,
    vipAccess: isVip,
    vipExpiryDate: subEndDate,
    isElite,
    eliteExpiryDate: isElite ? eliteEndDate : null,
    grantedFeatures,
    isEmailVerified: isVerified,
    phone: data.phone || '',
    country: data.country || '',
    dob: data.dob || '',
    experienceLevel: data.experienceLevel || '',
    assetClasses: Array.isArray(data.assetClasses) ? data.assetClasses : [],
    favoritePairs: data.favoritePairs || '',
    telegramUsername: data.telegramUsername || '',
    totalPaid: Number(data.totalPaid || 0),
    isBanned: Boolean(data.isBanned),
    isMutedFromChat: Boolean(data.isMutedFromChat),
    subscriptionStatus: subStatus,
    subscriptionEndDate: subEndDate,
    activationKey: data.activationKey || null,
    promoCode: data.activationKey || undefined,
    lastNameChangeAt: normalizeTimestampToIso(data.lastNameChangeAt),
    lastActiveAt: normalizeTimestampToIso(data.lastActiveAt || data.updatedAt) || undefined
  };
}

/**
 * Fetches or creates the user registry document in Firestore 'users' collection using UID.
 * Gracefully falls back if Firestore daily read/write quota is temporarily exhausted.
 */
export async function fetchOrCreateUserRegistry(
  user: FirebaseUser,
  _defaultRole: string = 'free',
  extraData?: UserOnboardingData
): Promise<{ email: string; role: string; uid: string }> {
  const safeEmail = (user.email || '').slice(0, 200);
  const isSuperAdmin = safeEmail.toLowerCase() === SUPER_ADMIN_EMAIL;
  const fallbackRole = isSuperAdmin ? 'admin' : _defaultRole;

  try {
    const userDocRef = doc(db, 'users', user.uid);
    const docSnap = await getDoc(userDocRef);

    if (docSnap.exists()) {
      const data = docSnap.data() as FirestoreUserData;
      return {
        uid: user.uid,
        email: user.email || data.email || '',
        role: isSuperAdmin ? 'admin' : data.role || 'free'
      };
    }

    const safeDisplayName = (user.displayName || safeEmail.split('@')[0] || 'Trader').slice(0, 100);
    const safePhone = (extraData?.phone || '').slice(0, 40);
    const safeCountry = (extraData?.country || '').slice(0, 80);

    const normFallback = fallbackRole.toLowerCase();
    const isAdminOrEliteFallback = isSuperAdmin || normFallback === 'admin' || normFallback === 'elite';
    const isStaffOrVipFallback =
      isAdminOrEliteFallback ||
      ['vip', 'moderator', 'analyser', 'analyst', 'sales'].includes(normFallback);

    const newRegistryDoc = {
      uid: user.uid,
      email: safeEmail,
      role: fallbackRole,
      tier: isAdminOrEliteFallback ? 'elite' : isStaffOrVipFallback ? 'vip' : 'free',
      isVip: isStaffOrVipFallback,
      vipAccess: isStaffOrVipFallback,
      vipExpiryDate: null,
      isElite: isAdminOrEliteFallback,
      eliteExpiryDate: null,
      grantedFeatures: {},
      subscription_status: isStaffOrVipFallback ? 'active' : 'none',
      subscription_end_date: null,
      isBanned: false,
      isMutedFromChat: false,
      totalPaid: 0,
      displayName: safeDisplayName,
      phone: safePhone,
      country: safeCountry,
      dob: extraData?.dob || '',
      experienceLevel: extraData?.experienceLevel || '',
      assetClasses: Array.isArray(extraData?.assetClasses) ? extraData.assetClasses : [],
      favoritePairs: extraData?.favoritePairs || '',
      emailVerified: Boolean(
        user.emailVerified || user.providerData.some((p) => p.providerId === 'google.com')
      ),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };

    await setDoc(userDocRef, newRegistryDoc);
  } catch (err) {
    console.warn('[Firebase Auth] fetchOrCreateUserRegistry fallback (quota/offline):', err);
  }

  return {
    uid: user.uid,
    email: safeEmail,
    role: fallbackRole
  };
}

/**
 * User Registration using createUserWithEmailAndPassword from firebase/auth SDK
 * Sends verification email and saves onboarding data to Firestore 'users' collection
 */
export async function registerWithFirebase(
  email: string,
  pass: string,
  displayName?: string,
  extraDataInput?: UserOnboardingData | string
): Promise<{ userProfile: UserProfile; verificationSent: boolean }> {
  const cleanEmail = email.trim();
  const userCredential = await createUserWithEmailAndPassword(auth, cleanEmail, pass);
  const user = userCredential.user;

  const extraData: UserOnboardingData =
    typeof extraDataInput === 'string'
      ? { promoCode: extraDataInput }
      : extraDataInput || {};

  if (displayName && displayName.trim()) {
    try {
      await updateProfile(user, { displayName: displayName.trim() });
    } catch (err) {
      console.warn('Profile update notice:', err);
    }
  }

  // 1. Create Firestore user registry document (single clean write)
  await fetchOrCreateUserRegistry(user, 'free', extraData);

  // 2. Redeem activation key atomically if supplied
  if (extraData.promoCode && extraData.promoCode.trim()) {
    try {
      await redeemActivationKey(extraData.promoCode, user.uid, user.email || cleanEmail);
    } catch (keyErr) {
      console.warn('[Firebase Auth] Promo code redemption notice during registration:', keyErr);
    }
  }

  // 3. Send verification email via Firebase Auth SDK
  let verificationSent = false;
  try {
    await sendEmailVerification(user);
    verificationSent = true;
  } catch (verifyErr) {
    console.warn('[Firebase Auth] Could not send email verification:', verifyErr);
  }

  let data: Record<string, any> = {};
  try {
    const userDocRef = doc(db, 'users', user.uid);
    const latestSnap = await getDoc(userDocRef);
    if (latestSnap.exists()) {
      data = latestSnap.data();
    }
  } catch (err) {
    console.warn('[Firebase Auth] registerWithFirebase profile read fallback:', err);
  }

  const userProfile = mapUserDocToProfile(user, data);

  // 4. Immediately sign out user so they verify email before entering dashboard
  try {
    await signOut(auth);
  } catch {
    // ignore
  }

  return {
    userProfile,
    verificationSent
  };
}

/**
 * User Sign In using signInWithEmailAndPassword from firebase/auth SDK
 */
export async function loginWithFirebase(
  email: string,
  pass: string,
  promoCode?: string
): Promise<UserProfile> {
  const cleanEmail = email.trim();
  const userCredential = await signInWithEmailAndPassword(auth, cleanEmail, pass);
  const user = userCredential.user;
  const isSuperAdmin = user.email?.toLowerCase() === SUPER_ADMIN_EMAIL;

  await fetchOrCreateUserRegistry(user, isSuperAdmin ? 'admin' : 'free');

  if (promoCode && promoCode.trim()) {
    try {
      await redeemActivationKey(promoCode, user.uid, user.email || cleanEmail);
    } catch (err) {
      console.warn('[Firebase Auth] Promo code redemption notice during login:', err);
    }
  }

  let data: Record<string, any> = isSuperAdmin
    ? { role: 'admin', tier: 'elite', isVip: true, isElite: true }
    : {};

  try {
    const userDocRef = doc(db, 'users', user.uid);
    const latestSnap = await getDoc(userDocRef);
    if (latestSnap.exists()) {
      data = latestSnap.data();
    }

    if (user.emailVerified && isSuperAdmin && data.role !== 'admin') {
      try {
        await updateDoc(userDocRef, { role: 'admin', updatedAt: serverTimestamp() });
        data.role = 'admin';
      } catch {
        data.role = 'admin';
      }
    }
  } catch (err) {
    console.warn('[Firebase Auth] loginWithFirebase Firestore quota fallback:', err);
  }

  return mapUserDocToProfile(user, data);
}

/**
 * Google Sign In Popup with Two-Step Onboarding Check (serialized to prevent duplicate popups & races)
 */
export async function signInWithGooglePopup(promoCode?: string): Promise<{
  userProfile: UserProfile;
  isNewUser: boolean;
  uid: string;
}> {
  if (inFlightGoogleSignIn) {
    return inFlightGoogleSignIn;
  }

  inFlightGoogleSignIn = (async () => {
    const userCredential = await signInWithPopup(auth, googleProvider);
    const user = userCredential.user;
    const isSuperAdmin = user.email?.toLowerCase() === SUPER_ADMIN_EMAIL;
    pendingRegistrationUids.add(user.uid);

    try {
      const userDocRef = doc(db, 'users', user.uid);
      let isNewUser = false;
      let data: Record<string, any> = isSuperAdmin
        ? { role: 'admin', tier: 'elite', isVip: true, isElite: true }
        : {};

      try {
        const docSnap = await getDoc(userDocRef);
        if (!docSnap.exists()) {
          isNewUser = !isSuperAdmin;
        } else {
          data = docSnap.data();
          if (!isSuperAdmin && !data.experienceLevel && !data.phone && !data.country) {
            isNewUser = true;
          }
        }

        await fetchOrCreateUserRegistry(user, isSuperAdmin ? 'admin' : 'free');

        if (promoCode && promoCode.trim()) {
          await redeemActivationKey(promoCode, user.uid, user.email || '');
        }

        const latestSnap = await getDoc(userDocRef);
        if (latestSnap.exists()) {
          data = latestSnap.data();
        }

        if (
          (user.emailVerified || user.providerData.some((p) => p.providerId === 'google.com')) &&
          isSuperAdmin &&
          data.role !== 'admin'
        ) {
          try {
            await updateDoc(userDocRef, { role: 'admin', updatedAt: serverTimestamp() });
            data.role = 'admin';
          } catch {
            data.role = 'admin';
          }
        }
      } catch (err) {
        console.warn('[Firebase Auth] signInWithGooglePopup Firestore quota fallback:', err);
        isNewUser = false;
      }

      const userProfile = {
        ...mapUserDocToProfile(user, data),
        isEmailVerified: true,
        needsOnboarding: isNewUser
      };

      return {
        userProfile,
        isNewUser,
        uid: user.uid
      };
    } finally {
      pendingRegistrationUids.delete(user.uid);
    }
  })();

  try {
    return await inFlightGoogleSignIn;
  } finally {
    inFlightGoogleSignIn = null;
  }
}

/**
 * Saves Google User Secondary Onboarding Profile to Firestore users collection
 * Never modifies privileged role/subscription fields directly.
 */
export async function saveGoogleUserOnboardingProfile(
  uid: string,
  extraData: UserOnboardingData
): Promise<UserProfile> {
  const currentUser = auth.currentUser;
  const userDocRef = doc(db, 'users', uid);

  const safeDisplayName = (currentUser?.displayName || currentUser?.email?.split('@')[0] || 'Trader').slice(0, 100);
  const safePhone = (extraData.phone || '').slice(0, 40);
  const safeCountry = (extraData.country || '').slice(0, 80);

  let data: Record<string, any> = {
    displayName: safeDisplayName,
    phone: safePhone,
    country: safeCountry,
    dob: extraData.dob || '',
    experienceLevel: extraData.experienceLevel || 'Beginner',
    assetClasses: Array.isArray(extraData.assetClasses) ? extraData.assetClasses : [],
    favoritePairs: extraData.favoritePairs || '',
    emailVerified: true
  };

  try {
    const docSnap = await getDoc(userDocRef);

    if (!docSnap.exists() && currentUser) {
      await fetchOrCreateUserRegistry(currentUser, 'free', {
        ...extraData,
        phone: safePhone,
        country: safeCountry,
        experienceLevel: extraData.experienceLevel || 'Beginner'
      });
    } else {
      await updateDoc(userDocRef, {
        ...data,
        updatedAt: serverTimestamp()
      });
    }

    if (extraData.promoCode && extraData.promoCode.trim()) {
      await redeemActivationKey(extraData.promoCode, uid, currentUser?.email || '');
    }

    const freshSnap = await getDoc(userDocRef);
    if (freshSnap.exists()) {
      data = freshSnap.data();
    }
  } catch (err) {
    console.warn('[Firebase Auth] saveGoogleUserOnboardingProfile quota fallback:', err);
  }

  if (currentUser) {
    return {
      ...mapUserDocToProfile(currentUser, data),
      isEmailVerified: true,
      needsOnboarding: false
    };
  }

  const existingRole = (data.role || 'free').toString().toUpperCase();
  const rawTier = (data.tier || '').toString().toLowerCase();
  const fallbackTier: 'free' | 'vip' | 'elite' =
    existingRole === 'ADMIN' || rawTier === 'elite' || Boolean(data.isElite)
      ? 'elite'
      : existingRole === 'VIP' || rawTier === 'vip' || Boolean(data.isVip) || Boolean(data.vipAccess)
      ? 'vip'
      : 'free';

  return {
    uid,
    id: uid,
    email: data.email || '',
    name: data.displayName || 'متداول MBK',
    role: existingRole,
    tier: fallbackTier,
    isVip: fallbackTier === 'vip' || fallbackTier === 'elite',
    vipAccess: fallbackTier === 'vip' || fallbackTier === 'elite',
    isElite: fallbackTier === 'elite',
    vipExpiryDate: data.vipExpiryDate || null,
    eliteExpiryDate: data.eliteExpiryDate || null,
    grantedFeatures: (data.grantedFeatures && typeof data.grantedFeatures === 'object') ? data.grantedFeatures : {},
    planName: buildPlanName(existingRole, fallbackTier),
    isEmailVerified: true,
    needsOnboarding: false
  };
}

export const NAME_CHANGE_COOLDOWN_MS = 7 * 24 * 60 * 60 * 1000;

export interface ProfileUpdateInput {
  displayName: string;
  phone: string;
  country: string;
  dob: string;
  experienceLevel: string;
  assetClasses: string[];
  favoritePairs: string;
  telegramUsername: string;
}

export function getNameChangeAvailability(lastNameChangeAt?: string | null): {
  canChange: boolean;
  nextAvailableDate: Date | null;
  remainingDays: number;
  remainingHours: number;
} {
  if (!lastNameChangeAt) {
    return { canChange: true, nextAvailableDate: null, remainingDays: 0, remainingHours: 0 };
  }
  const lastMs = new Date(lastNameChangeAt).getTime();
  if (Number.isNaN(lastMs)) {
    return { canChange: true, nextAvailableDate: null, remainingDays: 0, remainingHours: 0 };
  }
  const nextMs = lastMs + NAME_CHANGE_COOLDOWN_MS;
  const diffMs = nextMs - Date.now();
  if (diffMs <= 0) {
    return { canChange: true, nextAvailableDate: null, remainingDays: 0, remainingHours: 0 };
  }
  return {
    canChange: false,
    nextAvailableDate: new Date(nextMs),
    remainingDays: Math.ceil(diffMs / (24 * 60 * 60 * 1000)),
    remainingHours: Math.ceil(diffMs / (60 * 60 * 1000))
  };
}

/**
 * Updates the signed-in user's own profile information (excluding immutable email & roles).
 * Enforces a strict 7-day cooldown on displayName changes (matching Firestore Rules).
 */
export async function updateOwnUserProfile(
  uid: string,
  input: ProfileUpdateInput
): Promise<{ nameChanged: boolean }> {
  const currentUser = auth.currentUser;
  if (!currentUser || currentUser.uid !== uid) {
    throw new Error('يجب تسجيل الدخول بحسابك لتحديث الملف الشخصي.');
  }

  const userDocRef = doc(db, 'users', uid);
  const snap = await getDoc(userDocRef);
  const existingData = snap.exists() ? snap.data() : {};

  const cleanName = input.displayName.trim().slice(0, 100);
  const existingName = (existingData.displayName || currentUser.displayName || '').toString().trim();
  const nameChanged = cleanName.length > 0 && cleanName !== existingName;

  if (nameChanged) {
    if (cleanName.length < 2) {
      throw new Error('الاسم يجب أن يتكون من حرفين على الأقل.');
    }
    const lastChangeIso = normalizeTimestampToIso(existingData.lastNameChangeAt);
    const availability = getNameChangeAvailability(lastChangeIso);
    if (!availability.canChange) {
      throw new Error(
        `يمكن تغيير الاسم مرة واحدة كل 7 أيام. المتاح مجدداً بعد ${availability.remainingDays} يوم.`
      );
    }
  }

  const cleanAssets = Array.isArray(input.assetClasses)
    ? input.assetClasses.filter((item) => typeof item === 'string' && item.trim()).slice(0, 10)
    : [];

  const payload: Record<string, any> = {
    phone: input.phone.trim().slice(0, 40),
    country: input.country.trim().slice(0, 80),
    dob: input.dob.trim().slice(0, 32),
    experienceLevel: input.experienceLevel.trim().slice(0, 40),
    assetClasses: cleanAssets,
    favoritePairs: input.favoritePairs.trim().slice(0, 200),
    telegramUsername: input.telegramUsername.trim().slice(0, 80),
    updatedAt: serverTimestamp()
  };

  if (nameChanged) {
    payload.displayName = cleanName;
    payload.lastNameChangeAt = serverTimestamp();
  }

  await updateDoc(userDocRef, payload);

  if (nameChanged) {
    try {
      await updateProfile(currentUser, { displayName: cleanName });
    } catch (err) {
      console.warn('[Firebase Auth] displayName metadata sync notice:', err);
    }

    try {
      await setDoc(
        doc(db, 'chat_profiles', uid),
        {
          uid,
          displayName: cleanName,
          role: (existingData.role || 'FREE').toString().toUpperCase(),
          isVip: Boolean(existingData.isVip || existingData.vipAccess),
          isElite: Boolean(existingData.isElite || existingData.tier === 'elite'),
          updatedAtMs: Date.now()
        },
        { merge: true }
      );
    } catch (err) {
      console.warn('[Firebase Auth] chat_profiles displayName sync notice:', err);
    }
  }

  return { nameChanged };
}

/**
 * Re-authenticates an email/password user with their current password and updates to a new password.
 */
export async function changeUserPassword(
  currentPassword: string,
  newPassword: string
): Promise<void> {
  const user = auth.currentUser;
  if (!user || !user.email) {
    throw new Error('يجب تسجيل الدخول بحسابك أولاً لتغيير كلمة المرور.');
  }

  const hasPasswordProvider = user.providerData.some((p) => p.providerId === 'password');
  if (!hasPasswordProvider) {
    throw new Error(
      'هذا الحساب مسجل عبر Google ولا يملك كلمة مرور محلية. يمكنك استخدام خيار إرسال رابط تعيين كلمة المرور إلى بريدك الإلكتروني.'
    );
  }

  if (!currentPassword) {
    throw new Error('يرجى إدخال كلمة المرور الحالية.');
  }
  if (!newPassword || newPassword.length < 6) {
    throw new Error('كلمة المرور الجديدة يجب أن تتكون من 6 أحرف أو أرقام على الأقل.');
  }
  if (currentPassword === newPassword) {
    throw new Error('كلمة المرور الجديدة يجب أن تختلف عن كلمة المرور الحالية.');
  }

  const credential = EmailAuthProvider.credential(user.email, currentPassword);
  await reauthenticateWithCredential(user, credential);
  await updatePassword(user, newPassword);
}

/**
 * Sends a Firebase Password Reset email to the specified address
 */
export async function sendFirebasePasswordReset(email: string): Promise<void> {
  const cleanEmail = email.trim();
  if (!cleanEmail || !cleanEmail.includes('@')) {
    throw { code: 'auth/invalid-email' };
  }
  await sendPasswordResetEmail(auth, cleanEmail);
}

/**
 * Resends Verification Email to currently logged-in user
 */
export async function resendCurrentEmailVerification(): Promise<boolean> {
  if (auth.currentUser) {
    await sendEmailVerification(auth.currentUser);
    return true;
  }
  return false;
}

/**
 * Sign Out
 */
export async function signOutUser(): Promise<void> {
  await signOut(auth);
}

const authSubscribers = new Set<(user: UserProfile | null) => void>();
let latestAuthUserProfile: UserProfile | null | undefined = undefined;
let sharedUnsubAuth: (() => void) | null = null;
let sharedUnsubDoc: (() => void) | null = null;
const syncedSuperAdminUids = new Set<string>();

function broadcastAuthProfile(profile: UserProfile | null): void {
  latestAuthUserProfile = profile;
  authSubscribers.forEach((cb) => {
    try {
      cb(profile);
    } catch {
      // ignore subscriber callback error
    }
  });
}

function ensureSharedAuthListener(): void {
  if (sharedUnsubAuth) return;

  sharedUnsubAuth = onAuthStateChanged(auth, async (firebaseUser) => {
    if (sharedUnsubDoc) {
      sharedUnsubDoc();
      sharedUnsubDoc = null;
    }

    if (!firebaseUser) {
      broadcastAuthProfile(null);
      return;
    }

    const isSuperAdmin =
      Boolean(firebaseUser.emailVerified) &&
      firebaseUser.email?.toLowerCase() === SUPER_ADMIN_EMAIL;

    if (isSuperAdmin) {
      broadcastAuthProfile(
        mapUserDocToProfile(firebaseUser, { role: 'admin', tier: 'elite', isVip: true, isElite: true })
      );
    } else {
      try {
        const cachedRaw = localStorage.getItem('mbk_user');
        if (cachedRaw) {
          const cachedUser = JSON.parse(cachedRaw);
          if (cachedUser && cachedUser.id === firebaseUser.uid) {
            broadcastAuthProfile(cachedUser);
          }
        }
      } catch {
        // ignore
      }
    }

    const userDocRef = doc(db, 'users', firebaseUser.uid);

    const roleWeight = (r?: string): number => {
      const up = (r || 'FREE').toString().toUpperCase();
      if (up === 'ADMIN') return 6;
      if (up === 'MODERATOR' || up === 'ANALYSER' || up === 'ANALYST' || up === 'SALES') return 5;
      if (up === 'ELITE') return 4;
      if (up === 'VIP') return 3;
      return 1;
    };

    sharedUnsubDoc = onSnapshot(
      userDocRef,
      async (docSnap) => {
        let cachedProfile: any = null;
        try {
          const cachedRaw = localStorage.getItem('mbk_user');
          if (cachedRaw) {
            const parsed = JSON.parse(cachedRaw);
            if (parsed && (parsed.id === firebaseUser.uid || parsed.uid === firebaseUser.uid)) {
              cachedProfile = parsed;
            }
          }
        } catch {
          // ignore
        }

        const cachedRoleLower = cachedProfile?.role ? String(cachedProfile.role).toLowerCase() : 'free';
        const effectiveInitialRole = isSuperAdmin
          ? 'admin'
          : roleWeight(cachedRoleLower) > 1
          ? cachedRoleLower
          : 'free';

        if (!docSnap.exists() && !pendingRegistrationUids.has(firebaseUser.uid)) {
          try {
            const cachedExtra: UserOnboardingData | undefined = cachedProfile
              ? {
                  phone: cachedProfile.phone || '',
                  country: cachedProfile.country || '',
                  dob: cachedProfile.dob || '',
                  experienceLevel: cachedProfile.experienceLevel || '',
                  assetClasses: Array.isArray(cachedProfile.assetClasses) ? cachedProfile.assetClasses : [],
                  favoritePairs: cachedProfile.favoritePairs || ''
                }
              : undefined;
            await fetchOrCreateUserRegistry(firebaseUser, effectiveInitialRole, cachedExtra);
            if (roleWeight(effectiveInitialRole) > 1) {
              const isStaffOrElite = ['admin', 'moderator', 'analyser', 'analyst', 'sales', 'elite'].includes(
                effectiveInitialRole
              );
              await updateDoc(userDocRef, {
                role: effectiveInitialRole === 'elite' ? 'vip' : effectiveInitialRole,
                tier: isStaffOrElite ? 'elite' : 'vip',
                isVip: true,
                vipAccess: true,
                isElite: isStaffOrElite,
                subscription_status: 'active',
                updatedAt: serverTimestamp()
              }).catch(() => {});
            }
          } catch (err) {
            console.warn('Error creating user profile doc:', err);
          }
          return;
        }
        const data = docSnap.exists() ? docSnap.data() : {};
        if (docSnap.exists() && isSuperAdmin && data.role !== 'admin') {
          if (!syncedSuperAdminUids.has(firebaseUser.uid)) {
            syncedSuperAdminUids.add(firebaseUser.uid);
            try {
              await updateDoc(userDocRef, { role: 'admin', updatedAt: serverTimestamp() });
              data.role = 'admin';
            } catch {
              // ignore
            }
          } else {
            data.role = 'admin';
          }
        }
        broadcastAuthProfile(mapUserDocToProfile(firebaseUser, data));
      },
      (err) => {
        console.warn('Firestore user profile listener notice:', err?.message || err);
        try {
          const cachedRaw = localStorage.getItem('mbk_user');
          if (cachedRaw) {
            const cachedUser = JSON.parse(cachedRaw);
            if (cachedUser && cachedUser.id === firebaseUser.uid) {
              if (isSuperAdmin) {
                cachedUser.role = 'ADMIN';
                cachedUser.isAdmin = true;
              }
              broadcastAuthProfile(cachedUser);
              return;
            }
          }
        } catch {
          // ignore
        }
        broadcastAuthProfile(mapUserDocToProfile(firebaseUser, isSuperAdmin ? { role: 'admin' } : {}));
      }
    );
  });
}

/**
 * Subscribe to live Firebase Auth user state + real-time Firestore user profile snapshot
 * Shared singleton across the entire application to eliminate duplicate users/{uid} listeners.
 */
export function subscribeToAuth(onUserChange: (user: UserProfile | null) => void): () => void {
  authSubscribers.add(onUserChange);
  ensureSharedAuthListener();

  if (latestAuthUserProfile !== undefined) {
    try {
      onUserChange(latestAuthUserProfile);
    } catch {
      // ignore
    }
  }

  return () => {
    authSubscribers.delete(onUserChange);
    if (authSubscribers.size === 0) {
      if (sharedUnsubDoc) {
        sharedUnsubDoc();
        sharedUnsubDoc = null;
      }
      if (sharedUnsubAuth) {
        sharedUnsubAuth();
        sharedUnsubAuth = null;
      }
      latestAuthUserProfile = undefined;
    }
  };
}

/**
 * Redeems a single-use Firestore activation key atomically for the user.
 */
export async function applyFirestorePromoCode(userId: string, promoCode: string): Promise<boolean> {
  await redeemActivationKey(promoCode, userId, auth.currentUser?.email || undefined);
  return true;
}

export const signUpWithEmail = registerWithFirebase;
export const signInWithEmail = loginWithFirebase;
export const signInWithGoogle = signInWithGooglePopup;
