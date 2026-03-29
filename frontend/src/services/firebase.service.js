import { initializeApp, getApps } from 'firebase/app';
import { 
  getAuth, 
  GoogleAuthProvider, 
  signInWithRedirect,
  getRedirectResult,
  signInAnonymously as firebaseSignInAnonymously,
  signOut as firebaseSignOut
} from 'firebase/auth';
import firebaseConfig, { isFirebaseConfigured } from '@/config/firebase.config';

// Initialize Firebase
let app = null;
let auth = null;
let googleProvider = null;

// Initialize on module load if configured
if (isFirebaseConfigured()) {
  try {
    // Check if already initialized
    if (getApps().length === 0) {
      app = initializeApp(firebaseConfig);
      console.log('Firebase initialized successfully');
    } else {
      app = getApps()[0];
      console.log('Firebase already initialized');
    }
    
    auth = getAuth(app);
    
    // Configure Google Provider
    googleProvider = new GoogleAuthProvider();
    googleProvider.addScope('email');
    googleProvider.addScope('profile');
    googleProvider.setCustomParameters({
      prompt: 'select_account'
    });
    
  } catch (error) {
    console.error('Firebase initialization error:', error);
  }
}

// Google Sign In - Uses redirect for better cross-origin compatibility
export const signInWithGoogle = async () => {
  if (!auth || !googleProvider) {
    throw new Error('Firebase not initialized');
  }
  
  try {
    // Use redirect instead of popup to avoid COOP issues
    await signInWithRedirect(auth, googleProvider);
    // This function won't return anything as the page redirects
    // The result will be handled by getGoogleRedirectResult() on page load
    return null;
  } catch (error) {
    console.error('Google sign-in redirect error:', error);
    throw error;
  }
};

// Handle redirect result after returning from Google
export const getGoogleRedirectResult = async () => {
  if (!auth) {
    return null;
  }
  
  try {
    const result = await getRedirectResult(auth);
    if (result && result.user) {
      const user = result.user;
      const idToken = await user.getIdToken();
      
      return {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName,
        photoURL: user.photoURL,
        provider: 'google',
        idToken: idToken,
      };
    }
    return null;
  } catch (error) {
    console.error('Google redirect result error:', error);
    throw error;
  }
};

// Anonymous Sign In
export const signInAnonymousUser = async () => {
  if (!auth) {
    throw new Error('Firebase not initialized');
  }
  
  try {
    const result = await firebaseSignInAnonymously(auth);
    const user = result.user;
    const idToken = await user.getIdToken();
    
    return {
      uid: user.uid,
      email: null,
      displayName: null,
      photoURL: null,
      provider: 'anonymous',
      idToken: idToken,
      isAnonymous: true
    };
  } catch (error) {
    console.error('Anonymous sign-in error:', error);
    throw error;
  }
};

// Sign Out
export const signOut = async () => {
  if (auth) {
    await firebaseSignOut(auth);
  }
};

// Check if Firebase is ready
export const isFirebaseReady = () => {
  return !!auth && !!googleProvider;
};

export { auth };
