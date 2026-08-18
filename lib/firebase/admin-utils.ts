import { adminAuth, adminDb } from './admin';
import { UserRole } from '@/types/types';

/**
 * Set user role (admin only operation)
 * This should be called from a secure server-side context
 */
export async function setUserRole(uid: string, role: UserRole) {
  try {
    // Set custom claim
    await adminAuth.setCustomUserClaims(uid, { role });

    // Update Firestore
    await adminDb.collection('users').doc(uid).update({
      role,
      updatedAt: new Date(),
    });

    return { success: true };
  } catch (error) {
    console.error('Set user role error:', error);
    throw error;
  }
}

/**
 * Get user role
 */
export async function getUserRole(uid: string): Promise<UserRole> {
  try {
    const user = await adminAuth.getUser(uid);
    return (user.customClaims?.role as UserRole) || 'user';
  } catch (error) {
    console.error('Get user role error:', error);
    return 'user';
  }
}

/**
 * Check if user is admin
 */
export async function isUserAdmin(uid: string): Promise<boolean> {
  const role = await getUserRole(uid);
  return role === 'admin';
}

/**
 * Verify session and get user with role
 */
export async function verifySessionAndGetUser(sessionCookie: string) {
  try {
    const decodedClaims = await adminAuth.verifySessionCookie(sessionCookie, true);
    const role = (decodedClaims.role as UserRole) || 'user';

    return {
      uid: decodedClaims.uid,
      email: decodedClaims.email,
      role,
    };
  } catch (error) {
    throw new Error('Invalid session');
  }
}