import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  updateProfile,
  onAuthStateChanged,
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
 * Arabic Firebase Auth Error Translation
 */
export function getFirebaseAuthErrorMessage(error: any): string {
  const code = error?.code || '';
  switch (code) {
    case 'auth/email-already-in-use':
      return 'البريد الإلكتروني مسجل مسبقاً. يرجى تسجيل الدخول.';
    case 'auth/invalid-email':
      return 'صيغة البريد الإلكتروني غير صحيحة.';
    case 'auth/weak-password':
      return 'كلمة المرور ضعيفة جداً. يجب أن تتكون من 6 أحرف أو أرقام على الأقل.';
    case 'auth/user-not-found':
      return 'لا يوجد حساب مسجل بهذا البريد الإلكتروني.';
    case 'auth/wrong-password':
    case 'auth/invalid-credential':
      return 'بيانات الدخول غير صحيحة أو الحساب غير مسجل بعد. يمكنك التبديل لتبويب "إنشاء حساب جديد" للتسجيل فوراً.';
    case 'auth/popup-closed-by-user':
      return 'تم إغلاق نافذة تسجيل الدخول بحساب Google قبل إتمام العملية.';
    case 'auth/network-request-failed':
      return 'تعذر الاتصال بالخادم. يرجى التحقق من اتصال الإنترنت.';
    case 'auth/too-many-requests':
      return 'تم حظر المحاولات مؤقتاً بسبب تكرار المحاولة. يرجى الانتظار قليلاً.';
    default:
      return error?.message || 'حدث خطأ غير متوقع أثناء تسجيل الدخول.';
  }
}

/**
 * Syncs or creates the user's role profile in Firestore
 */
export async function syncFirestoreUserProfile(
  user: FirebaseUser,
  promoCode?: string,
  preferredName?: string
): Promise<UserProfile> {
  const userDocRef = doc(db, 'users', user.uid);
  const docSnap = await getDoc(userDocRef);

  const trimmedPromo = promoCode?.trim() || '';
  const isVIPPromo = Boolean(trimmedPromo.length > 0);

  if (docSnap.exists()) {
    const data = docSnap.data();
    // If a new promo code is entered during login/signup, upgrade to VIP
    if (isVIPPromo && data.role !== 'VIP') {
      await updateDoc(userDocRef, {
        role: 'VIP',
        promoCode: trimmedPromo,
        planName: `عضوية VIP مفعلة (${trimmedPromo})`,
        updatedAt: serverTimestamp()
      });
      return {
        uid: user.uid,
        name: data.displayName || user.displayName || preferredName || 'متداول MBK',
        email: user.email || 'trader@mbktrading.live',
        role: 'VIP',
        promoCode: trimmedPromo,
        planName: `عضوية VIP مفعلة (${trimmedPromo})`,
        avatar: user.photoURL || data.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80'
      };
    }

    return {
      uid: user.uid,
      name: data.displayName || user.displayName || preferredName || 'متداول MBK',
      email: user.email || data.email || 'trader@mbktrading.live',
      role: data.role || (isVIPPromo ? 'VIP' : 'FREE'),
      promoCode: data.promoCode || (isVIPPromo ? trimmedPromo : undefined),
      planName: data.planName || (data.role === 'VIP' ? 'عضوية VIP المفعلة' : 'الحساب المجاني (Standard Free)'),
      avatar: user.photoURL || data.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80'
    };
  }

  // Create new user profile in Firestore
  const newProfile: UserProfile = {
    uid: user.uid,
    name: preferredName || user.displayName || 'متداول MBK',
    email: user.email || 'trader@mbktrading.live',
    role: isVIPPromo ? 'VIP' : 'FREE',
    promoCode: isVIPPromo ? trimmedPromo : undefined,
    planName: isVIPPromo ? `عضوية VIP مفعلة (${trimmedPromo})` : 'الحساب المجاني (Standard Free)',
    avatar: user.photoURL || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80'
  };

  await setDoc(userDocRef, {
    uid: newProfile.uid,
    displayName: newProfile.name,
    email: newProfile.email,
    role: newProfile.role,
    promoCode: newProfile.promoCode || null,
    planName: newProfile.planName,
    avatar: newProfile.avatar,
    createdAt: serverTimestamp()
  });

  return newProfile;
}

/**
 * Email & Password Sign Up
 */
export async function signUpWithEmail(
  email: string,
  pass: string,
  displayName: string,
  promoCode?: string
): Promise<UserProfile> {
  const userCredential = await createUserWithEmailAndPassword(auth, email.trim(), pass);
  if (displayName.trim()) {
    await updateProfile(userCredential.user, { displayName: displayName.trim() });
  }
  return await syncFirestoreUserProfile(userCredential.user, promoCode, displayName.trim());
}

/**
 * Email & Password Sign In with Seamless Auto-Provisioning Fallback
 */
export async function signInWithEmail(
  email: string,
  pass: string,
  promoCode?: string
): Promise<UserProfile> {
  const cleanEmail = email.trim();
  try {
    const userCredential = await signInWithEmailAndPassword(auth, cleanEmail, pass);
    return await syncFirestoreUserProfile(userCredential.user, promoCode);
  } catch (err: any) {
    // If credentials are invalid because user never signed up or clicked login instead of signup
    if (
      (err?.code === 'auth/invalid-credential' || err?.code === 'auth/user-not-found') &&
      pass.length >= 6
    ) {
      try {
        const autoUser = await createUserWithEmailAndPassword(auth, cleanEmail, pass);
        const defaultName = cleanEmail.split('@')[0] || 'متداول MBK';
        await updateProfile(autoUser.user, { displayName: defaultName });
        return await syncFirestoreUserProfile(autoUser.user, promoCode, defaultName);
      } catch (signupErr: any) {
        if (signupErr?.code === 'auth/email-already-in-use') {
          // Email truly exists with a different password
          throw err;
        }
        throw signupErr;
      }
    }
    throw err;
  }
}

/**
 * Google Sign In Popup
 */
export async function signInWithGoogle(promoCode?: string): Promise<UserProfile> {
  const userCredential = await signInWithPopup(auth, googleProvider);
  return await syncFirestoreUserProfile(userCredential.user, promoCode);
}

/**
 * Upgrades user role in Firestore to VIP using promo code
 */
export async function applyFirestorePromoCode(uid: string, promoCode: string): Promise<void> {
  const userDocRef = doc(db, 'users', uid);
  await updateDoc(userDocRef, {
    role: 'VIP',
    promoCode: promoCode.trim(),
    planName: `عضوية VIP مفعلة (${promoCode.trim()})`,
    updatedAt: serverTimestamp()
  });
}

/**
 * Sign Out
 */
export async function signOutUser(): Promise<void> {
  await signOut(auth);
}

/**
 * Auth state observer with Firestore profile sync
 */
export function subscribeToAuth(onUserChange: (user: UserProfile | null) => void): () => void {
  return onAuthStateChanged(auth, async (firebaseUser) => {
    if (firebaseUser) {
      try {
        const profile = await syncFirestoreUserProfile(firebaseUser);
        onUserChange(profile);
      } catch (err) {
        console.warn('Firestore profile sync error on auth change:', err);
        onUserChange({
          uid: firebaseUser.uid,
          name: firebaseUser.displayName || 'متداول MBK',
          email: firebaseUser.email || 'trader@mbktrading.live',
          role: 'FREE',
          planName: 'الحساب المجاني (Standard Free)',
          avatar: firebaseUser.photoURL || undefined
        });
      }
    } else {
      onUserChange(null);
    }
  });
}
