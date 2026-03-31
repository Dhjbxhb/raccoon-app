/**
 * Firebase Service - Proper Session Persistence
 * 
 * CRITICAL FIXES:
 * 1. setPersistence(browserLocalPersistence) BEFORE signInWithRedirect
 * 2. Single Firebase instance (no duplicates)
 * 3. Don't clear auth state before it resolves
 * 4. Properly wait for onAuthStateChanged
 */

import { initializeApp, getApps, getApp } from 'firebase/app';
import { 
  getAuth, 
  GoogleAuthProvider, 
  signInWithRedirect,
  onAuthStateChanged,
  signOut as firebaseSignOut,
  browserLocalPersistence,
  setPersistence
} from 'firebase/auth';
import firebaseConfig, { isFirebaseConfigured } from '@/config/firebase.config';

// === SINGLETON STATE ===
let app = null;
let auth = null;
let googleProvider = null;
let isInitialized = false;

// Auth state
let currentUser = null;
let authStateResolved = false;
let authReadyPromise = null;
let authReadyResolve = null;

// Subscribers
const authSubscribers = [];

// === INITIALIZE FIREBASE (ONCE) ===
const initializeFirebase = () => {
  if (isInitialized) {
    console.log('[FIREBASE] Already initialized, skipping');
    return;
  }
  
  console.log('[FIREBASE] Initializing...');
  
  if (!isFirebaseConfigured()) {
    console.error('[FIREBASE] Not configured - missing env vars');
    authStateResolved = true;
    return;
  }
  
  try {
    // Get existing app or create new one (SINGLETON)
    const existingApps = getApps();
    if (existingApps.length > 0) {
      app = getApp();
      console.log('[FIREBASE] Using existing app');
    } else {
      app = initializeApp(firebaseConfig);
      console.log('[FIREBASE] Created new app');
    }
    
    // Get auth instance
    auth = getAuth(app);
    console.log('[FIREBASE] Auth obtained');
    
    // Configure Google provider
    googleProvider = new GoogleAuthProvider();
    googleProvider.addScope('email');
    googleProvider.addScope('profile');
    googleProvider.setCustomParameters({ prompt: 'select_account' });
    
    // Create promise for auth ready state
    authReadyPromise = new Promise((resolve) => {
      authReadyResolve = resolve;
    });
    
    // === CRITICAL: Listen for auth state changes ===
    onAuthStateChanged(auth, (user) => {
      console.log('[FIREBASE] ==========================================');
      console.log('[FIREBASE] onAuthStateChanged FIRED');
      console.log('[FIREBASE] User:', user ? 'EXISTS' : 'NULL');
      if (user) {
        console.log('[FIREBASE] Email:', user.email);
        console.log('[FIREBASE] UID:', user.uid);
        console.log('[FIREBASE] Display Name:', user.displayName);
        console.log('[FIREBASE] Provider:', user.providerData?.[0]?.providerId);
      }
      console.log('[FIREBASE] ==========================================');
      
      currentUser = user;
      authStateResolved = true;
      
      // Resolve the ready promise
      if (authReadyResolve) {
        authReadyResolve(user);
        authReadyResolve = null;
      }
      
      // Notify all subscribers
      authSubscribers.forEach(callback => {
        try {
          callback(user);
        } catch (e) {
          console.error('[FIREBASE] Subscriber error:', e);
        }
      });
    });
    
    isInitialized = true;
    console.log('[FIREBASE] Initialization complete');
    
  } catch (error) {
    console.error('[FIREBASE] Init error:', error);
    authStateResolved = true;
    if (authReadyResolve) {
      authReadyResolve(null);
    }
  }
};

// Initialize immediately when module loads
initializeFirebase();

// ============================================
// EXPORTED FUNCTIONS
// ============================================

/**
 * Wait for auth state to be determined
 * Returns: Firebase User or null
 */
export const waitForAuthReady = async () => {
  console.log('[FIREBASE] waitForAuthReady called');
  console.log('[FIREBASE] authStateResolved:', authStateResolved);
  console.log('[FIREBASE] currentUser:', currentUser?.email || 'null');
  
  // If already resolved, return immediately
  if (authStateResolved) {
    return currentUser;
  }
  
  // Wait for the promise
  if (authReadyPromise) {
    console.log('[FIREBASE] Waiting for authReadyPromise...');
    const user = await authReadyPromise;
    console.log('[FIREBASE] authReadyPromise resolved:', user?.email || 'null');
    return user;
  }
  
  return null;
};

/**
 * Get current user (synchronous, may be null if not ready)
 */
export const getCurrentUser = () => {
  return currentUser;
};

/**
 * Check if auth state has been determined
 */
export const isAuthReady = () => {
  return authStateResolved;
};

/**
 * Subscribe to auth state changes
 * Returns unsubscribe function
 */
export const subscribeToAuth = (callback) => {
  authSubscribers.push(callback);
  
  // Immediately call with current state if resolved
  if (authStateResolved) {
    callback(currentUser);
  }
  
  // Return unsubscribe function
  return () => {
    const index = authSubscribers.indexOf(callback);
    if (index > -1) {
      authSubscribers.splice(index, 1);
    }
  };
};

/**
 * Start Google sign in with redirect
 * CRITICAL: Set persistence BEFORE redirect
 */
export const signInWithGoogle = async () => {
  if (!auth || !googleProvider) {
    throw new Error('Firebase not initialized');
  }
  
  console.log('[FIREBASE] ==========================================');
  console.log('[FIREBASE] STARTING GOOGLE SIGN IN');
  console.log('[FIREBASE] Current URL:', window.location.href);
  console.log('[FIREBASE] ==========================================');
  
  try {
    // CRITICAL: Set persistence to LOCAL before redirect
    // This ensures the auth state survives page reload
    console.log('[FIREBASE] Setting persistence to browserLocalPersistence...');
    await setPersistence(auth, browserLocalPersistence);
    console.log('[FIREBASE] Persistence set successfully');
    
    // Set pending flag
    localStorage.setItem('googleAuthPending', 'true');
    localStorage.setItem('googleAuthTimestamp', Date.now().toString());
    console.log('[FIREBASE] Pending flag set');
    
    // Start redirect
    console.log('[FIREBASE] Calling signInWithRedirect...');
    await signInWithRedirect(auth, googleProvider);
    
  } catch (error) {
    console.error('[FIREBASE] signInWithGoogle error:', error);
    localStorage.removeItem('googleAuthPending');
    localStorage.removeItem('googleAuthTimestamp');
    throw error;
  }
};

/**
 * Sign out
 */
export const signOut = async () => {
  if (auth) {
    console.log('[FIREBASE] Signing out...');
    await firebaseSignOut(auth);
    currentUser = null;
    console.log('[FIREBASE] Signed out');
  }
};

/**
 * Check if Firebase is ready
 */
export const isFirebaseReady = () => {
  return isInitialized && !!auth && !!googleProvider;
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
      console.log('[FIREBASE] Pending flag is stale (> 5 min), clearing');
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

export { auth };
