/**
 * Firebase Service - CRITICAL: Redirect handling must happen at module load
 * 
 * KEY RULES:
 * 1. getRedirectResult() must be called ONCE, immediately when this module loads
 * 2. The result must be stored before any component renders
 * 3. No double initialization of Firebase
 * 4. onAuthStateChanged is only for ongoing auth state, NOT for redirect handling
 */

import { initializeApp, getApps } from 'firebase/app';
import { 
  getAuth, 
  GoogleAuthProvider, 
  signInWithRedirect,
  getRedirectResult,
  onAuthStateChanged,
  signOut as firebaseSignOut
} from 'firebase/auth';
import firebaseConfig, { isFirebaseConfigured } from '@/config/firebase.config';

// Module-level state (singleton)
let app = null;
let auth = null;
let googleProvider = null;
let initDone = false;

// CRITICAL: Store redirect result at module load time
let redirectResultPromise = null;
let redirectResultUser = null;
let redirectResultError = null;
let redirectResultChecked = false;

// Initialize Firebase ONCE at module load
if (isFirebaseConfigured()) {
  try {
    console.log('=== FIREBASE: Module initialization starting ===');
    
    // Get or create app
    if (getApps().length === 0) {
      app = initializeApp(firebaseConfig);
      console.log('Firebase app created');
    } else {
      app = getApps()[0];
      console.log('Firebase app reused (already exists)');
    }
    
    auth = getAuth(app);
    console.log('Firebase auth obtained');
    
    googleProvider = new GoogleAuthProvider();
    googleProvider.addScope('email');
    googleProvider.addScope('profile');
    googleProvider.setCustomParameters({
      prompt: 'select_account'
    });
    
    initDone = true;
    
    // CRITICAL: Call getRedirectResult IMMEDIATELY at module load
    // This MUST happen before any component renders
    // Store it as a promise so Login.js can await it
    console.log('=== FIREBASE: Calling getRedirectResult IMMEDIATELY ===');
    
    redirectResultPromise = getRedirectResult(auth)
      .then((result) => {
        console.log('=== FIREBASE: getRedirectResult completed ===');
        console.log('Result:', result ? 'USER FOUND' : 'null');
        
        if (result && result.user) {
          console.log('User email:', result.user.email);
          console.log('User UID:', result.user.uid);
          console.log('Provider:', result.providerId);
          redirectResultUser = result.user;
        } else {
          console.log('No redirect result (user may not have just redirected)');
        }
        
        redirectResultChecked = true;
        return result;
      })
      .catch((error) => {
        console.error('=== FIREBASE: getRedirectResult ERROR ===');
        console.error('Error code:', error.code);
        console.error('Error message:', error.message);
        redirectResultError = error;
        redirectResultChecked = true;
        throw error;
      });
    
    console.log('Firebase initialization complete');
    
  } catch (error) {
    console.error('Firebase init error:', error);
    redirectResultChecked = true;
  }
} else {
  console.error('Firebase not configured - missing env vars');
  redirectResultChecked = true;
}

// ============================================
// EXPORTED FUNCTIONS
// ============================================

/**
 * Get the redirect result - returns the stored promise
 * This will resolve with the user if there was a redirect, or null otherwise
 */
export const handleGoogleRedirect = async () => {
  console.log('=== handleGoogleRedirect called ===');
  
  if (!auth) {
    console.error('Firebase auth not initialized');
    return null;
  }
  
  // Wait for the redirect result promise that was started at module load
  if (redirectResultPromise) {
    console.log('Waiting for redirectResultPromise...');
    try {
      const result = await redirectResultPromise;
      console.log('redirectResultPromise resolved');
      console.log('User:', result?.user?.email || 'null');
      return result?.user || null;
    } catch (error) {
      console.error('redirectResultPromise error:', error);
      
      // Handle specific errors
      if (error.code === 'auth/unauthorized-domain') {
        throw new Error('Domain not authorized in Firebase Console. Add: ' + window.location.hostname);
      }
      
      throw error;
    }
  }
  
  // Fallback: check if we already have the result
  if (redirectResultUser) {
    console.log('Returning stored redirectResultUser:', redirectResultUser.email);
    return redirectResultUser;
  }
  
  // If redirect was already checked and no user, try auth.currentUser
  if (redirectResultChecked && !redirectResultUser) {
    console.log('Redirect checked but no user. Checking auth.currentUser...');
    if (auth.currentUser) {
      console.log('Found auth.currentUser:', auth.currentUser.email);
      return auth.currentUser;
    }
  }
  
  console.log('No redirect user found');
  return null;
};

/**
 * Start Google sign in with redirect
 */
export const signInWithGoogle = async () => {
  if (!auth || !googleProvider) {
    throw new Error('Firebase not initialized');
  }
  
  console.log('=== STARTING GOOGLE SIGN IN REDIRECT ===');
  console.log('Current URL:', window.location.href);
  
  // Set pending flags BEFORE redirect
  localStorage.setItem('googleAuthPending', 'true');
  localStorage.setItem('googleAuthTimestamp', Date.now().toString());
  
  console.log('Pending flags set, calling signInWithRedirect...');
  
  // This will navigate away from the page
  await signInWithRedirect(auth, googleProvider);
};

/**
 * Sign out
 */
export const signOut = async () => {
  if (auth) {
    await firebaseSignOut(auth);
    redirectResultUser = null;
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
  if (pending && timestamp && Date.now() - parseInt(timestamp) > 5 * 60 * 1000) {
    console.log('Google auth pending flag is stale, clearing');
    clearGoogleAuthPending();
    return false;
  }
  
  return pending;
};

/**
 * Clear pending flags
 */
export const clearGoogleAuthPending = () => {
  console.log('Clearing Google auth pending flags');
  localStorage.removeItem('googleAuthPending');
  localStorage.removeItem('googleAuthTimestamp');
};

/**
 * Get current user (if any)
 */
export const getCurrentUser = () => {
  return auth?.currentUser || redirectResultUser;
};

/**
 * Wait for redirect result to be checked
 */
export const waitForRedirectCheck = async () => {
  if (redirectResultChecked) {
    return redirectResultUser;
  }
  
  if (redirectResultPromise) {
    try {
      const result = await redirectResultPromise;
      return result?.user || null;
    } catch (e) {
      return null;
    }
  }
  
  return null;
};

/**
 * Subscribe to auth state changes (for ongoing state, NOT for redirect)
 */
export const onAuthStateChange = (callback) => {
  if (!auth) return () => {};
  
  return onAuthStateChanged(auth, (user) => {
    console.log('=== FIREBASE: onAuthStateChanged ===');
    console.log('User:', user?.email || 'null');
    callback(user);
  });
};

export { auth };
