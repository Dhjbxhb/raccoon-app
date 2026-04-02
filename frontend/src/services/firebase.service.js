/**
 * Firebase Service - SINGLETON + POPUP ONLY
 * 
 * CRITICAL:
 * 1. Firebase initialized ONCE globally
 * 2. signInWithPopup ONLY (no redirect)
 * 3. User returned DIRECTLY from popup result
 * 4. No reliance on cross-domain session persistence
 */

import { initializeApp, getApps, getApp } from 'firebase/app';
import { 
  getAuth, 
  GoogleAuthProvider, 
  signInWithPopup,
  signOut as firebaseSignOut,
  browserLocalPersistence,
  setPersistence
} from 'firebase/auth';
import firebaseConfig, { isFirebaseConfigured } from '@/config/firebase.config';

// === STRICT SINGLETON ===
let _app = null;
let _auth = null;
let _googleProvider = null;
let _initialized = false;

/**
 * Get or create Firebase app (SINGLETON)
 */
const getFirebaseApp = () => {
  if (_app) return _app;
  
  const apps = getApps();
  if (apps.length > 0) {
    _app = getApp();
    console.log('[FIREBASE] Reusing existing app');
  } else {
    _app = initializeApp(firebaseConfig);
    console.log('[FIREBASE] Created new app');
  }
  
  return _app;
};

/**
 * Get or create Auth instance (SINGLETON)
 */
const getFirebaseAuth = () => {
  if (_auth) return _auth;
  
  const app = getFirebaseApp();
  _auth = getAuth(app);
  
  console.log('[FIREBASE] Auth instance created');
  console.log('[FIREBASE] projectId:', _auth.app.options.projectId);
  console.log('[FIREBASE] authDomain:', _auth.app.options.authDomain);
  
  return _auth;
};

/**
 * Get or create Google Provider (SINGLETON)
 */
const getGoogleProvider = () => {
  if (_googleProvider) return _googleProvider;
  
  _googleProvider = new GoogleAuthProvider();
  _googleProvider.addScope('email');
  _googleProvider.addScope('profile');
  _googleProvider.setCustomParameters({ prompt: 'select_account' });
  
  console.log('[FIREBASE] Google provider created');
  
  return _googleProvider;
};

/**
 * Initialize Firebase (call once at app startup)
 */
export const initializeFirebase = () => {
  if (_initialized) {
    console.log('[FIREBASE] Already initialized');
    return true;
  }
  
  console.log('[FIREBASE] ==========================================');
  console.log('[FIREBASE] INITIALIZING (SINGLETON)');
  console.log('[FIREBASE] ==========================================');
  
  if (!isFirebaseConfigured()) {
    console.error('[FIREBASE] NOT CONFIGURED - missing env vars');
    return false;
  }
  
  console.log('[FIREBASE] Config:');
  console.log('[FIREBASE] - projectId:', firebaseConfig.projectId);
  console.log('[FIREBASE] - authDomain:', firebaseConfig.authDomain);
  console.log('[FIREBASE] - apiKey:', firebaseConfig.apiKey?.substring(0, 15) + '...');
  
  try {
    getFirebaseApp();
    getFirebaseAuth();
    getGoogleProvider();
    
    _initialized = true;
    console.log('[FIREBASE] Initialization COMPLETE');
    return true;
  } catch (error) {
    console.error('[FIREBASE] Init error:', error);
    return false;
  }
};

// Initialize immediately on module load
initializeFirebase();

/**
 * Sign in with Google using POPUP ONLY
 * Returns Firebase user directly - no cross-domain issues
 */
export const signInWithGoogle = async () => {
  console.log('[FIREBASE] ==========================================');
  console.log('[FIREBASE] SIGN IN WITH GOOGLE (POPUP)');
  console.log('[FIREBASE] ==========================================');
  
  const auth = getFirebaseAuth();
  const provider = getGoogleProvider();
  
  if (!auth || !provider) {
    throw new Error('Firebase not initialized');
  }
  
  try {
    // Set persistence
    console.log('[FIREBASE] Setting persistence...');
    await setPersistence(auth, browserLocalPersistence);
    
    // Sign in with popup - user returned DIRECTLY
    console.log('[FIREBASE] Opening popup...');
    const result = await signInWithPopup(auth, provider);
    
    // Log the result immediately
    console.log('[FIREBASE] ==========================================');
    console.log('[FIREBASE] POPUP RESULT:');
    console.log('[FIREBASE] result:', result ? 'EXISTS' : 'NULL');
    console.log('[FIREBASE] result.user:', result?.user ? 'EXISTS' : 'NULL');
    
    if (result?.user) {
      console.log('[FIREBASE] USER DETAILS:');
      console.log('[FIREBASE] - email:', result.user.email);
      console.log('[FIREBASE] - uid:', result.user.uid);
      console.log('[FIREBASE] - displayName:', result.user.displayName);
      console.log('[FIREBASE] - emailVerified:', result.user.emailVerified);
      console.log('[FIREBASE] - providerId:', result.providerId);
      
      // Double check auth.currentUser
      console.log('[FIREBASE] auth.currentUser:', auth.currentUser?.email || 'NULL');
    }
    console.log('[FIREBASE] ==========================================');
    
    if (!result?.user) {
      throw new Error('No user in popup result');
    }
    
    return result.user;
    
  } catch (error) {
    console.error('[FIREBASE] ==========================================');
    console.error('[FIREBASE] POPUP ERROR:');
    console.error('[FIREBASE] code:', error.code);
    console.error('[FIREBASE] message:', error.message);
    console.error('[FIREBASE] ==========================================');
    throw error;
  }
};

/**
 * Sign out
 */
export const signOut = async () => {
  const auth = getFirebaseAuth();
  if (auth) {
    console.log('[FIREBASE] Signing out...');
    await firebaseSignOut(auth);
    console.log('[FIREBASE] Signed out');
  }
};

/**
 * Get current user (may be null)
 */
export const getCurrentUser = () => {
  const auth = getFirebaseAuth();
  return auth?.currentUser || null;
};

/**
 * Check if Firebase is ready
 */
export const isFirebaseReady = () => {
  return _initialized && !!_auth && !!_googleProvider;
};

// Export auth for direct access if needed
export const auth = _auth;
