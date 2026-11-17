import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  updateProfile,
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
  const isAdmin = normalizedRole === 'ADMIN';
  const isStaff = ['ADMIN', 'MODERATOR', 'SALES', 'ANALYSER', 'ANALYST'].includes(normalizedRole);

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
    name: firebaseUser.displayName || data.displayName || firebaseUser.email?.split('@')[0] || 'متداول MBK',
    role: normalizedRole,
    tier: effectiveTier,
    planName: buildPlanName(normalizedRole, effectiveTier),
    avatar: firebaseUser.photoURL || data.avatar || undefined,
    isAdmin,
    isStaff,
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
    totalPaid: Number(data.totalPaid || 0),
    isBanned: Boolean(data.isBanned),
    isMutedFromChat: Boolean(data.isMutedFromChat),
    subscriptionStatus: subStatus,
    subscriptionEndDate: subEndDate,
    activationKey: data.activationKey || null,
    promoCode: data.activationKey || undefined,
    lastActiveAt: new Date().toISOString()
  };
}

/**
 * Fetches or creates the user registry document in Firestore 'users' collection using UID
 */
export async function fetchOrCreateUserRegistry(
  user: FirebaseUser,
  _defaultRole: string = 'free',
  extraData?: UserOnboardingData
): Promise<{ email: string; role: string; uid: string }> {
  const userDocRef = doc(db, 'users', user.uid);
  const docSnap = await getDoc(userDocRef);

  if (docSnap.exists()) {
    const data = docSnap.data() as FirestoreUserData;
    return {
      uid: user.uid,
      email: user.email || data.email || '',
      role: data.role || 'free'
    };
  }

  const safeEmail = (user.email || '').slice(0, 200);
  const safeDisplayName = (user.displayName || safeEmail.split('@')[0] || 'Trader').slice(0, 100);
  const safePhone = (extraData?.phone || '').slice(0, 40);
  const safeCountry = (extraData?.country || '').slice(0, 80);

  const newRegistryDoc = {
    email: safeEmail,
    role: 'free',
    tier: 'free',
    isVip: false,
    vipAccess: false,
    vipExpiryDate: null,
    isElite: false,
    eliteExpiryDate: null,
    grantedFeatures: {},
    subscription_status: 'none',
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

  return {
    uid: user.uid,
    email: safeEmail,
    role: 'free'
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
    await redeemActivationKey(extraData.promoCode, user.uid, user.email || cleanEmail);
  }

  // 3. Send verification email via Firebase Auth SDK
  let verificationSent = false;
  try {
    await sendEmailVerification(user);
    verificationSent = true;
  } catch (verifyErr) {
    console.warn('[Firebase Auth] Could not send email verification:', verifyErr);
  }

  const userDocRef = doc(db, 'users', user.uid);
  const latestSnap = await getDoc(userDocRef);
  const userProfile = mapUserDocToProfile(user, latestSnap.exists() ? latestSnap.data() : {});

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

  await fetchOrCreateUserRegistry(user, 'free');

  if (promoCode && promoCode.trim()) {
    await redeemActivationKey(promoCode, user.uid, user.email || cleanEmail);
  }

  const userDocRef = doc(db, 'users', user.uid);
  const latestSnap = await getDoc(userDocRef);
  const data = latestSnap.exists() ? latestSnap.data() : {};

  if (
    user.emailVerified &&
    user.email?.toLowerCase() === SUPER_ADMIN_EMAIL &&
    data.role !== 'admin'
  ) {
    try {
      await updateDoc(userDocRef, { role: 'admin', updatedAt: serverTimestamp() });
      data.role = 'admin';
    } catch {
      // ignore if rules handle super-admin via verified token
    }
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
    pendingRegistrationUids.add(user.uid);

    try {
      const userDocRef = doc(db, 'users', user.uid);
      const docSnap = await getDoc(userDocRef);

      let isNewUser = false;
      if (!docSnap.exists()) {
        isNewUser = true;
      } else {
        const data = docSnap.data();
        if (!data.experienceLevel && !data.phone && !data.country) {
          isNewUser = true;
        }
      }

      await fetchOrCreateUserRegistry(user, 'free');

      if (promoCode && promoCode.trim()) {
        await redeemActivationKey(promoCode, user.uid, user.email || '');
      }

      const latestSnap = await getDoc(userDocRef);
      const data = latestSnap.exists() ? latestSnap.data() : {};

      if (
        (user.emailVerified || user.providerData.some((p) => p.providerId === 'google.com')) &&
        user.email?.toLowerCase() === SUPER_ADMIN_EMAIL &&
        data.role !== 'admin'
      ) {
        try {
          await updateDoc(userDocRef, { role: 'admin', updatedAt: serverTimestamp() });
          data.role = 'admin';
        } catch {
          // ignore
        }
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
  const docSnap = await getDoc(userDocRef);

  const safeDisplayName = (currentUser?.displayName || currentUser?.email?.split('@')[0] || 'Trader').slice(0, 100);
  const safePhone = (extraData.phone || '').slice(0, 40);
  const safeCountry = (extraData.country || '').slice(0, 80);

  if (!docSnap.exists() && currentUser) {
    await fetchOrCreateUserRegistry(currentUser, 'free', {
      ...extraData,
      phone: safePhone,
      country: safeCountry,
      experienceLevel: extraData.experienceLevel || 'Beginner'
    });
  } else {
    await updateDoc(userDocRef, {
      displayName: safeDisplayName,
      phone: safePhone,
      country: safeCountry,
      dob: extraData.dob || '',
      experienceLevel: extraData.experienceLevel || 'Beginner',
      assetClasses: Array.isArray(extraData.assetClasses) ? extraData.assetClasses : [],
      favoritePairs: extraData.favoritePairs || '',
      emailVerified: true,
      updatedAt: serverTimestamp()
    });
  }

  if (extraData.promoCode && extraData.promoCode.trim()) {
    await redeemActivationKey(extraData.promoCode, uid, currentUser?.email || '');
  }

  const freshSnap = await getDoc(userDocRef);
  const data = freshSnap.exists() ? freshSnap.data() : {};

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

/**
 * Subscribe to live Firebase Auth user state + real-time Firestore user profile snapshot
 */
export function subscribeToAuth(onUserChange: (user: UserProfile | null) => void): () => void {
  let unsubDoc: (() => void) | null = null;

  const unsubAuth = onAuthStateChanged(auth, async (firebaseUser) => {
    if (unsubDoc) {
      unsubDoc();
      unsubDoc = null;
    }

    if (!firebaseUser) {
      onUserChange(null);
      return;
    }

    const userDocRef = doc(db, 'users', firebaseUser.uid);

    if (!pendingRegistrationUids.has(firebaseUser.uid)) {
      try {
        const initialSnap = await getDoc(userDocRef);
        if (!initialSnap.exists()) {
          await fetchOrCreateUserRegistry(firebaseUser);
        }

        if (
          firebaseUser.emailVerified &&
          firebaseUser.email?.toLowerCase() === SUPER_ADMIN_EMAIL &&
          initialSnap.exists() &&
          initialSnap.data()?.role !== 'admin'
        ) {
          try {
            await updateDoc(userDocRef, { role: 'admin', updatedAt: serverTimestamp() });
          } catch {
            // ignore
          }
        }
      } catch (err) {
        console.warn('Error ensuring user profile doc:', err);
      }
    }

    unsubDoc = onSnapshot(
      userDocRef,
      (docSnap) => {
        const data = docSnap.exists() ? docSnap.data() : {};
        onUserChange(mapUserDocToProfile(firebaseUser, data));
      },
      (err) => {
        console.warn('Error listening to Firestore user registry:', err);
        onUserChange(mapUserDocToProfile(firebaseUser, {}));
      }
    );
  });

  return () => {
    if (unsubDoc) unsubDoc();
    unsubAuth();
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
