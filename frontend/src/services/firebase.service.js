import { initializeApp, getApps } from 'firebase/app';
import { 
  getAuth, 
  GoogleAuthProvider, 
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  signInAnonymously as firebaseSignInAnonymously,
  signOut as firebaseSignOut,
  browserLocalPersistence,
  setPersistence
} from 'firebase/auth';
import firebaseConfig, { isFirebaseConfigured } from '@/config/firebase.config';

// Initialize Firebase
let app = null;
let auth = null;
let googleProvider = null;
let initPromise = null;
let initDone = false;

// Initialize on module load if configured
const initFirebase = async () => {
  if (initDone) return true;
  
  if (!isFirebaseConfigured()) {
    console.log('Firebase not configured');
    return false;
  }
  
  try {
    console.log('=== INITIALIZING FIREBASE ===');
    
    // Check if already initialized
    if (getApps().length === 0) {
      app = initializeApp(firebaseConfig);
      console.log('Firebase app created');
    } else {
      app = getApps()[0];
      console.log('Firebase app already exists');
    }
    
    auth = getAuth(app);
    console.log('Auth object created');
    
    // Set persistence to LOCAL
    try {
      await setPersistence(auth, browserLocalPersistence);
      console.log('Auth persistence set to LOCAL');
    } catch (e) {
      console.log('Persistence already set or error:', e.message);
    }
    
    // Configure Google Provider
    googleProvider = new GoogleAuthProvider();
    googleProvider.addScope('email');
    googleProvider.addScope('profile');
    googleProvider.setCustomParameters({
      prompt: 'select_account'
    });
    
    initDone = true;
    console.log('=== FIREBASE READY ===');
    
    return true;
  } catch (error) {
    console.error('=== FIREBASE INIT ERROR ===', error);
    return false;
  }
};

// Start initialization immediately
initPromise = initFirebase();

// Google Sign In - Try popup first, fall back to redirect
export const signInWithGoogle = async () => {
  await initPromise;
  
  if (!auth || !googleProvider) {
    throw new Error('Firebase not initialized');
  }
  
  console.log('=== STARTING GOOGLE SIGN-IN ===');
  
  // Try popup first (works better in most cases)
  try {
    console.log('Trying popup...');
    const result = await signInWithPopup(auth, googleProvider);
    
    if (result && result.user) {
      console.log('=== POPUP SUCCESS ===');
      console.log('User:', result.user.email);
      
      const idToken = await result.user.getIdToken(true);
      
      return {
        uid: result.user.uid,
        email: result.user.email,
        displayName: result.user.displayName,
        photoURL: result.user.photoURL,
        provider: 'google',
        idToken: idToken,
      };
    }
  } catch (popupError) {
    console.log('Popup failed:', popupError.code, popupError.message);
    
    // If popup blocked or failed, try redirect
    if (popupError.code === 'auth/popup-blocked' || 
        popupError.code === 'auth/popup-closed-by-user' ||
        popupError.code === 'auth/cancelled-popup-request') {
      console.log('Falling back to redirect...');
      await signInWithRedirect(auth, googleProvider);
      return null; // Page will redirect
    }
    
    // For other errors, throw
    throw popupError;
  }
};

// Handle redirect result after returning from Google
export const getGoogleRedirectResult = async () => {
  await initPromise;
  
  if (!auth) {
    console.log('Firebase auth not initialized');
    return null;
  }
  
  try {
    console.log('=== CHECKING REDIRECT RESULT ===');
    console.log('Current user:', auth.currentUser?.email || 'none');
    
    const result = await getRedirectResult(auth);
    
    if (result && result.user) {
      console.log('=== REDIRECT RESULT FOUND ===');
      console.log('User:', result.user.email);
      
      const idToken = await result.user.getIdToken(true);
      
      return {
        uid: result.user.uid,
        email: result.user.email,
        displayName: result.user.displayName,
        photoURL: result.user.photoURL,
        provider: 'google',
        idToken: idToken,
      };
    }
    
    // Check current user as fallback
    if (auth.currentUser && !auth.currentUser.isAnonymous) {
      console.log('=== FOUND CURRENT USER ===');
      console.log('User:', auth.currentUser.email);
      
      const idToken = await auth.currentUser.getIdToken(true);
      
      return {
        uid: auth.currentUser.uid,
        email: auth.currentUser.email,
        displayName: auth.currentUser.displayName,
        photoURL: auth.currentUser.photoURL,
        provider: 'google',
        idToken: idToken,
      };
    }
    
    console.log('No redirect result and no current user');
    return null;
  } catch (error) {
    console.error('=== REDIRECT ERROR ===', error.code, error.message);
    throw error;
  }
};

// Anonymous Sign In
export const signInAnonymousUser = async () => {
  await initPromise;
  
  if (!auth) {
    throw new Error('Firebase not initialized');
  }
  
  const result = await firebaseSignInAnonymously(auth);
  const idToken = await result.user.getIdToken();
  
  return {
    uid: result.user.uid,
    email: null,
    displayName: null,
    photoURL: null,
    provider: 'anonymous',
    idToken: idToken,
    isAnonymous: true
  };
};

// Sign Out
export const signOut = async () => {
  if (auth) {
    await firebaseSignOut(auth);
  }
};

// Check if Firebase is ready
export const isFirebaseReady = () => {
  return initDone && !!auth && !!googleProvider;
};

// Wait for Firebase to be ready
export const waitForFirebase = async () => {
  await initPromise;
  return isFirebaseReady();
};

// Export auth for direct access
export { auth };
