/**
 * Firebase Service - Proper Redirect Handling
 * 
 * KEY RULES:
 * 1. Wait for auth to be ready BEFORE calling getRedirectResult()
 * 2. Call getRedirectResult() EXACTLY ONCE
 * 3. Store result in module-level state
 * 4. Don't let components interfere with redirect handling
 */

import { initializeApp, getApps } from 'firebase/app';
import { 
  getAuth, 
  GoogleAuthProvider, 
  signInWithRedirect,
  getRedirectResult,
  signOut as firebaseSignOut
} from 'firebase/auth';
import firebaseConfig, { isFirebaseConfigured } from '@/config/firebase.config';

// === MODULE-LEVEL SINGLETON STATE ===
let app = null;
let auth = null;
let googleProvider = null;
let initDone = false;

// Redirect result state - CRITICAL
let redirectResultPromise = null;
let redirectHandled = false;
let redirectUser = null;
let redirectError = null;

// === INITIALIZATION ===
console.log('=== FIREBASE SERVICE: Module loading ===');
console.log('Timestamp:', new Date().toISOString());
console.log('URL:', typeof window !== 'undefined' ? window.location.href : 'SSR');

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
    
    initDone = true;
    
    // === CRITICAL: Handle redirect result ONCE at module load ===
    // This must happen synchronously when module loads, before React renders
    const isPending = localStorage.getItem('googleAuthPending') === 'true';
    console.log('[FIREBASE] Google auth pending flag:', isPending);
    
    if (isPending) {
      console.log('[FIREBASE] === PROCESSING REDIRECT ===');
      console.log('[FIREBASE] Calling getRedirectResult() NOW...');
      
      // Start the redirect result check immediately
      redirectResultPromise = new Promise((resolve) => {
        // Use authStateReady or wait for auth to initialize
        const checkRedirect = async () => {
          try {
            console.log('[FIREBASE] getRedirectResult() starting...');
            const result = await getRedirectResult(auth);
            
            console.log('[FIREBASE] getRedirectResult() completed');
            console.log('[FIREBASE] Result:', result ? 'HAS RESULT' : 'NULL');
            
            if (result && result.user) {
              console.log('[FIREBASE] User found!');
              console.log('[FIREBASE] Email:', result.user.email);
              console.log('[FIREBASE] UID:', result.user.uid);
              console.log('[FIREBASE] Provider:', result.providerId);
              redirectUser = result.user;
              redirectHandled = true;
              resolve(result.user);
            } else {
              console.log('[FIREBASE] No user in redirect result');
              console.log('[FIREBASE] Checking auth.currentUser...');
              
              // Sometimes the user is already signed in via auth state
              if (auth.currentUser) {
                console.log('[FIREBASE] Found auth.currentUser:', auth.currentUser.email);
                redirectUser = auth.currentUser;
                redirectHandled = true;
                resolve(auth.currentUser);
              } else {
                console.log('[FIREBASE] No user anywhere - redirect may have failed');
                redirectHandled = true;
                resolve(null);
              }
            }
          } catch (error) {
            console.error('[FIREBASE] getRedirectResult() ERROR:', error.code, error.message);
            redirectError = error;
            redirectHandled = true;
            resolve(null);
          }
        };
        
        // Execute immediately
        checkRedirect();
      });
    } else {
      console.log('[FIREBASE] No pending redirect, skipping getRedirectResult()');
      redirectHandled = true;
      redirectResultPromise = Promise.resolve(null);
    }
    
    console.log('[FIREBASE] Initialization complete');
    
  } catch (error) {
    console.error('[FIREBASE] Init error:', error);
    redirectHandled = true;
  }
} else {
  console.warn('[FIREBASE] Not configured - missing env vars');
  redirectHandled = true;
}

// ============================================
// EXPORTED FUNCTIONS
// ============================================

/**
 * Get the redirect result user
 * Returns: Firebase User or null
 */
export const handleGoogleRedirect = async () => {
  console.log('[FIREBASE] handleGoogleRedirect() called');
  console.log('[FIREBASE] redirectHandled:', redirectHandled);
  console.log('[FIREBASE] redirectUser:', redirectUser?.email || 'null');
  
  if (!auth) {
    console.error('[FIREBASE] Auth not initialized');
    return null;
  }
  
  // Wait for the redirect result promise
  if (redirectResultPromise) {
    console.log('[FIREBASE] Awaiting redirectResultPromise...');
    const user = await redirectResultPromise;
    console.log('[FIREBASE] Promise resolved:', user?.email || 'null');
    return user;
  }
  
  // Already have the user
  if (redirectUser) {
    console.log('[FIREBASE] Returning cached redirectUser:', redirectUser.email);
    return redirectUser;
  }
  
  // Check current user as fallback
  if (auth.currentUser) {
    console.log('[FIREBASE] Returning auth.currentUser:', auth.currentUser.email);
    return auth.currentUser;
  }
  
  console.log('[FIREBASE] No user found');
  return null;
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
  
  // Reset state for new sign in
  redirectHandled = false;
  redirectUser = null;
  redirectError = null;
  redirectResultPromise = null;
  
  // Set pending flags BEFORE redirect
  localStorage.setItem('googleAuthPending', 'true');
  localStorage.setItem('googleAuthTimestamp', Date.now().toString());
  
  console.log('[FIREBASE] Pending flags set');
  console.log('[FIREBASE] Calling signInWithRedirect...');
  
  // This navigates away from the page
  await signInWithRedirect(auth, googleProvider);
};

/**
 * Sign out
 */
export const signOut = async () => {
  if (auth) {
    await firebaseSignOut(auth);
    redirectUser = null;
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
 * Get current user
 */
export const getCurrentUser = () => {
  return auth?.currentUser || redirectUser;
};

/**
 * Wait for redirect handling to complete
 */
export const waitForRedirectCheck = async () => {
  if (redirectResultPromise) {
    return await redirectResultPromise;
  }
  return redirectUser;
};

/**
 * Check if redirect has been handled
 */
export const isRedirectHandled = () => {
  return redirectHandled;
};

/**
 * Get any redirect error
 */
export const getRedirectError = () => {
  return redirectError;
};

export { auth };
