/**
 * Firebase Service - Using onAuthStateChanged (NOT getRedirectResult)
 * 
 * getRedirectResult is unreliable - it often returns null even after successful login.
 * onAuthStateChanged is the reliable way to detect auth state after redirect.
 */

import { initializeApp, getApps } from 'firebase/app';
import { 
  getAuth, 
  GoogleAuthProvider, 
  signInWithRedirect,
  onAuthStateChanged,
  signOut as firebaseSignOut
} from 'firebase/auth';
import firebaseConfig, { isFirebaseConfigured } from '@/config/firebase.config';

// === MODULE-LEVEL SINGLETON STATE ===
let app = null;
let auth = null;
let googleProvider = null;
let initDone = false;

// Auth state tracking
let currentUser = null;
let authStateReady = false;
let authStatePromise = null;
let authStateResolve = null;

// === INITIALIZATION ===
console.log('[FIREBASE] Module loading...');

if (isFirebaseConfigured()) {
  try {
    // Get or create Firebase app (singleton)
    if (getApps().length === 0) {
      app = initializeApp(firebaseConfig);
      console.log('[FIREBASE] App created');
    } else {
      app = getApps()[0];
      console.log('[FIREBASE] App reused');
    }
    
    auth = getAuth(app);
    console.log('[FIREBASE] Auth obtained');
    
    // Configure Google provider
    googleProvider = new GoogleAuthProvider();
    googleProvider.addScope('email');
    googleProvider.addScope('profile');
    googleProvider.setCustomParameters({ prompt: 'select_account' });
    
    // Create a promise that resolves when auth state is ready
    authStatePromise = new Promise((resolve) => {
      authStateResolve = resolve;
    });
    
    // === CRITICAL: Use onAuthStateChanged to detect user ===
    // This fires immediately with current auth state, and again after redirect completes
    onAuthStateChanged(auth, (user) => {
      console.log('[FIREBASE] onAuthStateChanged fired');
      console.log('[FIREBASE] User:', user ? user.email : 'null');
      
      currentUser = user;
      authStateReady = true;
      
      // Resolve the promise so Login.js can proceed
      if (authStateResolve) {
        authStateResolve(user);
        authStateResolve = null;
      }
    });
    
    initDone = true;
    console.log('[FIREBASE] Initialization complete');
    
  } catch (error) {
    console.error('[FIREBASE] Init error:', error);
    authStateReady = true;
    if (authStateResolve) {
      authStateResolve(null);
    }
  }
} else {
  console.warn('[FIREBASE] Not configured - missing env vars');
  authStateReady = true;
}

// ============================================
// EXPORTED FUNCTIONS
// ============================================

/**
 * Wait for Firebase auth state to be ready
 * Returns the current user (or null if not logged in)
 */
export const waitForAuthState = async () => {
  console.log('[FIREBASE] waitForAuthState called');
  console.log('[FIREBASE] authStateReady:', authStateReady);
  console.log('[FIREBASE] currentUser:', currentUser?.email || 'null');
  
  if (authStateReady) {
    return currentUser;
  }
  
  if (authStatePromise) {
    console.log('[FIREBASE] Waiting for authStatePromise...');
    const user = await authStatePromise;
    console.log('[FIREBASE] authStatePromise resolved:', user?.email || 'null');
    return user;
  }
  
  return null;
};

/**
 * Get current Firebase user (synchronous)
 */
export const getCurrentUser = () => {
  return currentUser || auth?.currentUser || null;
};

/**
 * Check if auth state has been determined
 */
export const isAuthStateReady = () => {
  return authStateReady;
};

/**
 * Start Google sign in with redirect
 */
export const signInWithGoogle = async () => {
  if (!auth || !googleProvider) {
    throw new Error('Firebase not initialized');
  }
  
  console.log('[FIREBASE] === STARTING GOOGLE SIGN IN ===');
  console.log('[FIREBASE] Current URL:', window.location.href);
  
  // Set pending flags BEFORE redirect
  localStorage.setItem('googleAuthPending', 'true');
  localStorage.setItem('googleAuthTimestamp', Date.now().toString());
  
  console.log('[FIREBASE] Pending flag set, redirecting to Google...');
  
  // This navigates away from the page
  await signInWithRedirect(auth, googleProvider);
};

/**
 * Sign out
 */
export const signOut = async () => {
  if (auth) {
    await firebaseSignOut(auth);
    currentUser = null;
  }
};

/**
 * Check if Firebase is ready
 */
export const isFirebaseReady = () => {
  return initDone && !!auth && !!googleProvider;
};

/**
 * Check if Google auth redirect is pending
 */
export const isGoogleAuthPending = () => {
  const pending = localStorage.getItem('googleAuthPending') === 'true';
  const timestamp = localStorage.getItem('googleAuthTimestamp');
  
  // Stale if older than 5 minutes
  if (pending && timestamp) {
    const age = Date.now() - parseInt(timestamp);
    if (age > 5 * 60 * 1000) {
      console.log('[FIREBASE] Pending flag is stale, clearing');
      clearGoogleAuthPending();
      return false;
    }
  }
  
  return pending;
};

/**
 * Clear pending flags
 */
export const clearGoogleAuthPending = () => {
  console.log('[FIREBASE] Clearing pending flags');
  localStorage.removeItem('googleAuthPending');
  localStorage.removeItem('googleAuthTimestamp');
};

/**
 * Subscribe to auth state changes
 * Returns unsubscribe function
 */
export const onAuthStateChange = (callback) => {
  if (!auth) return () => {};
  
  return onAuthStateChanged(auth, callback);
};

export { auth };
