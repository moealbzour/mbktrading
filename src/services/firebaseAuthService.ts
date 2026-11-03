import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  updateProfile,
  onAuthStateChanged,
  sendEmailVerification,
  User as FirebaseUser
} from 'firebase/auth';
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  serverTimestamp
} from 'firebase/firestore';
import { auth, googleProvider, db } from '../lib/firebase';
import { UserProfile } from '../types/trading';

/**
 * Arabic Firebase Auth Error Message Translation
 */
export function getFirebaseAuthErrorMessage(error: any): string {
  const code = error?.code || '';
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
    case 'auth/network-request-failed':
      return 'تعذر الاتصال بالخادم. يرجى التحقق من اتصال الإنترنت.';
    case 'auth/too-many-requests':
      return 'تم حظر المحاولات مؤقتاً. يرجى الانتظار قليلاً والتحقق مجدداً.';
    default:
      return error?.message || 'حدث خطأ أثناء إجراء العملية.';
  }
}

export interface FirestoreUserData {
  email: string | null;
  role: 'free' | 'vip' | 'admin' | string;
  createdAt?: any;
  phone?: string;
  country?: string;
  dob?: string;
  experienceLevel?: string;
  assetClasses?: string[];
  favoritePairs?: string;
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

/**
 * Fetches or creates the user registry document in Firestore 'users' collection using UID
 */
export async function fetchOrCreateUserRegistry(
  user: FirebaseUser,
  defaultRole: string = 'free',
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

  // Registry payload stored in Firestore users collection
  const newRegistryDoc = {
    email: user.email,
    role: 'free',
    displayName: user.displayName || user.email?.split('@')[0] || '',
    phone: extraData?.phone || '',
    country: extraData?.country || '',
    dob: extraData?.dob || '',
    experienceLevel: extraData?.experienceLevel || 'Beginner',
    assetClasses: extraData?.assetClasses || [],
    favoritePairs: extraData?.favoritePairs || '',
    emailVerified: Boolean(user.emailVerified),
    createdAt: serverTimestamp()
  };

  await setDoc(userDocRef, newRegistryDoc);

  return {
    uid: user.uid,
    email: user.email || '',
    role: 'free'
  };
}

/**
 * User Registration using createUserWithEmailAndPassword from firebase/auth SDK
 * Sends verification email and saves comprehensive onboarding data to Firestore 'users' collection
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

  // 1. Send verification email via Firebase Auth SDK
  let verificationSent = false;
  try {
    await sendEmailVerification(user);
    verificationSent = true;
    console.log('[Firebase Auth] Verification email sent to:', cleanEmail);
  } catch (verifyErr) {
    console.warn('[Firebase Auth] Could not send email verification:', verifyErr);
  }

  // 2. Create/update Firestore document in users collection using UID as document ID
  const registry = await fetchOrCreateUserRegistry(user, 'free', extraData);

  // Update additional onboarding details in Firestore document if provided
  if (extraData && Object.keys(extraData).length > 0) {
    const userDocRef = doc(db, 'users', user.uid);
    await updateDoc(userDocRef, {
      displayName: displayName || user.displayName || cleanEmail.split('@')[0],
      phone: extraData.phone || '',
      country: extraData.country || '',
      dob: extraData.dob || '',
      experienceLevel: extraData.experienceLevel || 'Beginner',
      assetClasses: extraData.assetClasses || [],
      favoritePairs: extraData.favoritePairs || '',
      updatedAt: serverTimestamp()
    });
  }

  if (extraData.promoCode && extraData.promoCode.trim()) {
    await applyFirestorePromoCode(user.uid, extraData.promoCode);
  }

  const userDocRef = doc(db, 'users', user.uid);
  const latestSnap = await getDoc(userDocRef);
  const currentRole = latestSnap.exists() ? latestSnap.data().role : registry.role;
  const normalizedRole = (currentRole || 'FREE').toUpperCase() as any;

  // 3. Immediately sign out user so they are NOT directly logged in before email verification
  try {
    await signOut(auth);
  } catch {
    // ignore
  }

  const userProfile: UserProfile = {
    uid: user.uid,
    id: user.uid,
    email: user.email || cleanEmail,
    name: user.displayName || displayName || cleanEmail.split('@')[0],
    role: normalizedRole,
    planName: normalizedRole === 'ADMIN' ? 'مدير المنصة (Admin)' : normalizedRole === 'VIP' ? 'عضوية VIP' : 'الحساب المجاني (Free)'
  };

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

  const registry = await fetchOrCreateUserRegistry(user, 'free');

  if (promoCode && promoCode.trim()) {
    await applyFirestorePromoCode(user.uid, promoCode);
  }

  const userDocRef = doc(db, 'users', user.uid);
  const latestSnap = await getDoc(userDocRef);
  let currentRole = latestSnap.exists() ? latestSnap.data().role : registry.role;
  if (cleanEmail.toLowerCase() === 'moe.albzour@gmail.com' || user.email?.toLowerCase() === 'moe.albzour@gmail.com') {
    currentRole = 'admin';
    try {
      await updateDoc(userDocRef, { role: 'admin' });
    } catch {
      // ignore
    }
  }
  const normalizedRole = (currentRole || 'FREE').toUpperCase() as any;

  const isVerified =
    user.emailVerified ||
    user.providerData.some((p) => p.providerId === 'google.com');

  return {
    uid: user.uid,
    id: user.uid,
    email: user.email || cleanEmail,
    name: user.displayName || cleanEmail.split('@')[0],
    role: normalizedRole,
    planName: normalizedRole === 'ADMIN' ? 'مدير المنصة (Admin)' : normalizedRole === 'VIP' ? 'عضوية VIP' : 'الحساب المجاني (Free)',
    isEmailVerified: isVerified
  };
}

/**
 * Google Sign In Popup with Two-Step Onboarding Check
 */
export async function signInWithGooglePopup(promoCode?: string): Promise<{
  userProfile: UserProfile;
  isNewUser: boolean;
  uid: string;
}> {
  const userCredential = await signInWithPopup(auth, googleProvider);
  const user = userCredential.user;

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

  const registry = await fetchOrCreateUserRegistry(user, 'free');

  if (promoCode && promoCode.trim()) {
    await applyFirestorePromoCode(user.uid, promoCode);
  }

  const latestSnap = await getDoc(userDocRef);
  let currentRole = latestSnap.exists() ? latestSnap.data().role : registry.role;
  if (user.email?.toLowerCase() === 'moe.albzour@gmail.com') {
    currentRole = 'admin';
    try {
      await updateDoc(userDocRef, { role: 'admin' });
    } catch {
      // ignore
    }
  }
  const normalizedRole = (currentRole || 'FREE').toUpperCase() as any;

  const userProfile: UserProfile = {
    uid: user.uid,
    id: user.uid,
    email: user.email || '',
    name: user.displayName || user.email?.split('@')[0] || 'متداول MBK',
    role: normalizedRole,
    planName: normalizedRole === 'ADMIN' ? 'مدير المنصة (Admin)' : normalizedRole === 'VIP' ? 'عضوية VIP' : 'الحساب المجاني (Free)',
    avatar: user.photoURL || undefined,
    isEmailVerified: true, // Google OAuth accounts are pre-verified by Google
    needsOnboarding: isNewUser
  };

  return {
    userProfile,
    isNewUser,
    uid: user.uid
  };
}

/**
 * Saves Google User Secondary Onboarding Profile to Firestore users collection
 */
export async function saveGoogleUserOnboardingProfile(
  uid: string,
  extraData: UserOnboardingData
): Promise<UserProfile> {
  const userDocRef = doc(db, 'users', uid);
  const docSnap = await getDoc(userDocRef);

  const existingRole = docSnap.exists() ? docSnap.data().role || 'free' : 'free';
  const normalizedRole = existingRole.toUpperCase() as any;

  const profilePayload = {
    email: auth.currentUser?.email || '',
    displayName: auth.currentUser?.displayName || '',
    role: existingRole,
    phone: extraData.phone || '',
    country: extraData.country || '',
    dob: extraData.dob || '',
    experienceLevel: extraData.experienceLevel || 'Beginner',
    assetClasses: extraData.assetClasses || [],
    favoritePairs: extraData.favoritePairs || '',
    emailVerified: true,
    updatedAt: serverTimestamp()
  };

  await setDoc(userDocRef, profilePayload, { merge: true });

  if (extraData.promoCode && extraData.promoCode.trim()) {
    await applyFirestorePromoCode(uid, extraData.promoCode);
  }

  return {
    uid,
    id: uid,
    email: auth.currentUser?.email || '',
    name: auth.currentUser?.displayName || 'متداول MBK',
    role: normalizedRole,
    planName: normalizedRole === 'ADMIN' ? 'مدير المنصة (Admin)' : normalizedRole === 'VIP' ? 'عضوية VIP' : 'الحساب المجاني (Free)',
    avatar: auth.currentUser?.photoURL || undefined,
    isEmailVerified: true,
    needsOnboarding: false
  };
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
 * Subscribe to current Firebase Auth user state and fetch extended details (like role and email verification)
 */
export function subscribeToAuth(onUserChange: (user: UserProfile | null) => void): () => void {
  return onAuthStateChanged(auth, async (firebaseUser) => {
    if (firebaseUser) {
      try {
        const userDocRef = doc(db, 'users', firebaseUser.uid);
        const docSnap = await getDoc(userDocRef);

        let data = docSnap.exists() ? docSnap.data() : null;
        if (!data) {
          await fetchOrCreateUserRegistry(firebaseUser);
          const freshSnap = await getDoc(userDocRef);
          data = freshSnap.data() || {};
        }

        // Automated Subscription Expiration Check & Admin Restoration
        let role = (data.role || 'free').toString().toLowerCase();
        let subEndDate = data.subscription_end_date || data.subscriptionEndDate || null;
        let subStatus = data.subscription_status || data.subscriptionStatus || (role === 'vip' ? 'active' : 'none');

        if (
          firebaseUser.email?.toLowerCase() === 'moe.albzour@gmail.com' ||
          data.email?.toLowerCase() === 'moe.albzour@gmail.com'
        ) {
          role = 'admin';
          if (data.role !== 'admin') {
            try {
              await updateDoc(userDocRef, { role: 'admin' });
              console.log('[Admin Restoration] Restored admin role in Firestore for moe.albzour@gmail.com');
            } catch (err) {
              console.warn('[Admin Restoration] Firestore update notice:', err);
            }
          }
        } else if (subEndDate && new Date(subEndDate) < new Date() && role === 'vip') {
          // Automated Downgrade Engine
          role = 'free';
          subStatus = 'expired';
          try {
            await updateDoc(userDocRef, {
              role: 'free',
              subscription_status: 'expired'
            });
            console.log('[Subscription Engine] Downgraded expired VIP user:', firebaseUser.uid);
          } catch (err) {
            console.warn('[Subscription Engine] Update notice:', err);
          }
        }

        const normalizedRole = role.toUpperCase();
        const isVerified =
          firebaseUser.emailVerified ||
          firebaseUser.providerData.some((p) => p.providerId === 'google.com');

        onUserChange({
          uid: firebaseUser.uid,
          id: firebaseUser.uid,
          email: firebaseUser.email || data.email || '',
          name: firebaseUser.displayName || data.displayName || firebaseUser.email?.split('@')[0] || 'متداول MBK',
          role: normalizedRole,
          planName:
            normalizedRole === 'ADMIN'
              ? 'مدير المنصة (Admin)'
              : normalizedRole === 'MODERATOR'
              ? 'مشرف النظام (Moderator)'
              : normalizedRole === 'SALES'
              ? 'فريق المبيعات (Sales)'
              : normalizedRole === 'VIP'
              ? 'عضوية VIP'
              : 'الحساب المجاني (Free)',
          avatar: firebaseUser.photoURL || data.avatar || undefined,
          isEmailVerified: isVerified,
          phone: data.phone || '',
          country: data.country || '',
          dob: data.dob || '',
          experienceLevel: data.experienceLevel || '',
          assetClasses: data.assetClasses || [],
          favoritePairs: data.favoritePairs || '',
          totalPaid: Number(data.totalPaid || 0),
          isBanned: Boolean(data.isBanned),
          isMutedFromChat: Boolean(data.isMutedFromChat),
          subscriptionStatus: subStatus as any,
          subscriptionEndDate: subEndDate,
          lastActiveAt: new Date().toISOString()
        });
      } catch (err) {
        console.warn('Error fetching Firestore user registry:', err);
        const isVerified =
          firebaseUser.emailVerified ||
          firebaseUser.providerData.some((p) => p.providerId === 'google.com');

        onUserChange({
          uid: firebaseUser.uid,
          id: firebaseUser.uid,
          email: firebaseUser.email || '',
          name: firebaseUser.displayName || 'متداول MBK',
          role: 'FREE',
          planName: 'الحساب المجاني (Free)',
          avatar: firebaseUser.photoURL || undefined,
          isEmailVerified: isVerified
        });
      }
    } else {
      onUserChange(null);
    }
  });
}

/**
 * Applies promo code to upgrade user role in Firestore 'users' collection
 */
export async function applyFirestorePromoCode(userId: string, promoCode: string): Promise<boolean> {
  const cleanCode = promoCode.trim().toUpperCase();
  if (cleanCode === 'MBKVIP' || cleanCode === 'VIP2026' || cleanCode === 'PROMO2026') {
    const userDocRef = doc(db, 'users', userId);
    await updateDoc(userDocRef, { role: 'vip' });
    return true;
  }
  return false;
}

// Export backward compatible function aliases
export const signUpWithEmail = registerWithFirebase;
export const signInWithEmail = loginWithFirebase;
export const signInWithGoogle = signInWithGooglePopup;


