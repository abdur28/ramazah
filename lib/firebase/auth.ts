import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  sendPasswordResetEmail,
  updateProfile,
  updateEmail,
  updatePassword,
  User,
  GoogleAuthProvider,
  signInWithPopup,
  sendEmailVerification,
  onAuthStateChanged,
  deleteUser as firebaseDeleteUser
} from 'firebase/auth';
import { doc, setDoc, getDoc, updateDoc, serverTimestamp, deleteDoc } from 'firebase/firestore';
import { auth, db } from './config';
import { UserPreferences, UserProfile, UserRole } from '@/types/types';

/**
 * Sign up with email and password
 */
export async function signUp(email: string, password: string, displayName?: string) {
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    if (displayName) {
      await updateProfile(user, { displayName });
    }

    await sendEmailVerification(user);

    // Create user profile with 'user' role by default
    await createUserProfile(user, 'email', 'user');

    // Set auth cookie
    await setAuthCookie(user);

    return { user, error: null };
  } catch (error: any) {
    console.error('Sign up error:', error);
    return { user: null, error: error.message };
  }
}

/**
 * Sign in with email and password
 */
export async function signIn(email: string, password: string) {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    
    // Set auth cookie
    await setAuthCookie(userCredential.user);

    return { user: userCredential.user, error: null };
  } catch (error: any) {
    console.error('Sign in error:', error);
    return { user: null, error: error.message };
  }
}

/**
 * Sign in with Google
 */
export async function signInWithGoogle() {
  try {
    const provider = new GoogleAuthProvider();
    const userCredential = await signInWithPopup(auth, provider);
    const user = userCredential.user;

    // Check if user profile exists
    const userDoc = await getDoc(doc(db, 'users', user.uid));
    if (!userDoc.exists()) {
      await createUserProfile(user, 'google', 'user');
    }

    // Set auth cookie
    await setAuthCookie(user);

    return { user, error: null };
  } catch (error: any) {
    console.error('Google sign in error:', error);
    return { user: null, error: error.message };
  }
}

/**
 * Sign out
 */
export async function signOut() {
  try {
    await firebaseSignOut(auth);
    
    // Clear auth cookie
    await clearAuthCookie();

    return { error: null };
  } catch (error: any) {
    console.error('Sign out error:', error);
    return { error: error.message };
  }
}

export async function deleteUser() {
  try {
    const user = auth.currentUser;
    if (!user) throw new Error('No user logged in');

    const userDoc = await getDoc(doc(db, 'users', user.uid));
    if (userDoc.exists()) {
      await deleteDoc(doc(db, 'users', user.uid));
    }

    await firebaseDeleteUser(user);

    return { error: null };
  } catch (error: any) {
    console.error('Delete user error:', error);
    return { error: error.message };
  }
}

/**
 * Send password reset email
 */
export async function resetPassword(email: string) {
  try {
    await sendPasswordResetEmail(auth, email);
    return { error: null };
  } catch (error: any) {
    console.error('Password reset error:', error);
    return { error: error.message };
  }
}

/**
 * Update user profile
 */
export async function updateUserProfile(updates: {
  displayName?: string;
  photoURL?: string;
  address?: {
    fullName: string;
    phone: string;
    street: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
  };
  preferences?: UserPreferences;
}) {
  try {
    const user = auth.currentUser;
    if (!user) throw new Error('No user logged in');

    if (updates.displayName || updates.photoURL) {
      await updateProfile(user, {
        displayName: updates.displayName,
        photoURL: updates.photoURL,
      });
    }

    const userRef = doc(db, 'users', user.uid);
    await updateDoc(userRef, {
      ...updates,
      updatedAt: serverTimestamp(),
    });

    return { error: null };
  } catch (error: any) {
    console.error('Update profile error:', error);
    return { error: error.message };
  }
}

/**
 * Update user email
 */
export async function updateUserEmail(newEmail: string) {
  try {
    const user = auth.currentUser;
    if (!user) throw new Error('No user logged in');

    await updateEmail(user, newEmail);

    const userRef = doc(db, 'users', user.uid);
    await updateDoc(userRef, {
      email: newEmail,
      updatedAt: serverTimestamp(),
    });

    await sendEmailVerification(user);

    return { error: null };
  } catch (error: any) {
    console.error('Update email error:', error);
    return { error: error.message };
  }
}

/**
 * Update user password
 */
export async function updateUserPassword(newPassword: string) {
  try {
    const user = auth.currentUser;
    if (!user) throw new Error('No user logged in');

    await updatePassword(user, newPassword);
    return { error: null };
  } catch (error: any) {
    console.error('Update password error:', error);
    return { error: error.message };
  }
}

/**
 * Create user profile in Firestore
 */
async function createUserProfile(
  user: User, 
  signInMethod: 'email' | 'google',
  role: UserRole = 'user'
) {
  const userProfile: Omit<UserProfile, 'createdAt' | 'updatedAt'> & {
    createdAt: any;
    updatedAt: any;
  } = {
    uid: user.uid,
    email: user.email!,
    ...(user.displayName ? { displayName: user.displayName } : {}),
    ...(user.photoURL ? { photoURL: user.photoURL } : {}),
    displayName: user.displayName || undefined,
    ...(user.photoURL ? { photoURL: user.photoURL } : {}),
    role, // Default to 'user'
    signInMethod,
    preferences: {
      currency: 'rub',
      emailNotifications: {
        orderUpdates: true,
        promotions: true,
        newArrivals: true,
        wishlistAlerts: true,
        newsletter: true,
      }
    },
    emailVerified: user.emailVerified,
    orders: [],
    wishlistItems: [],
    emailOptIn: true,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  await setDoc(doc(db, 'users', user.uid), userProfile);
}

/**
 * Get user profile from Firestore
 */
export async function getUserProfile(uid: string): Promise<UserProfile | null> {
  try {
    const userDoc = await getDoc(doc(db, 'users', uid));
    if (userDoc.exists()) {
      return userDoc.data() as UserProfile;
    }
    return null;
  } catch (error) {
    console.error('Get user profile error:', error);
    return null;
  }
}

/**
 * Set auth cookie (calls API route)
 */
async function setAuthCookie(user: User) {
  try {
    const idToken = await user.getIdToken();
    
    await fetch('/api/auth/session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idToken }),
    });
  } catch (error) {
    console.error('Set auth cookie error:', error);
  }
}

/**
 * Clear auth cookie (calls API route)
 */
async function clearAuthCookie() {
  try {
    await fetch('/api/auth/session', {
      method: 'DELETE',
    });
  } catch (error) {
    console.error('Clear auth cookie error:', error);
  }
}

/**
 * Listen to auth state changes
 */
export function onAuthChange(callback: (user: User | null) => void) {
  return onAuthStateChanged(auth, callback);
}

/**
 * Get current user
 */
export function getCurrentUser() {
  return auth.currentUser;
}

/**
 * Check if user is authenticated
 */
export function isAuthenticated() {
  return !!auth.currentUser;
}