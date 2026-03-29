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
    
    console.log('Firebase auth ready');
    
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
    console.log('Starting Google sign-in redirect...');
    // Use redirect instead of popup to avoid COOP issues
    await signInWithRedirect(auth, googleProvider);
    // This function won't return anything as the page redirects
    return null;
  } catch (error) {
    console.error('Google sign-in redirect error:', error);
    throw error;
  }
};

// Handle redirect result after returning from Google
export const getGoogleRedirectResult = async () => {
  if (!auth) {
    console.log('Firebase auth not initialized');
    return null;
  }
  
  try {
    console.log('Checking for Google redirect result...');
    const result = await getRedirectResult(auth);
    
    console.log('Redirect result:', result ? 'FOUND' : 'NULL');
    
    if (result && result.user) {
      console.log('=== GOOGLE REDIRECT RESULT ===');
      console.log('User UID:', result.user.uid);
      console.log('User email:', result.user.email);
      console.log('User display name:', result.user.displayName);
      
      const user = result.user;
      const idToken = await user.getIdToken(true);
      
      console.log('Got ID token:', idToken ? 'YES' : 'NO');
      
      return {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName,
        photoURL: user.photoURL,
        provider: 'google',
        idToken: idToken,
      };
    }
    
    console.log('No redirect result found');
    return null;
  } catch (error) {
    console.error('=== GOOGLE REDIRECT ERROR ===');
    console.error('Error code:', error.code);
    console.error('Error message:', error.message);
    
    if (error.code === 'auth/unauthorized-domain') {
      console.error('DOMAIN NOT AUTHORIZED!');
      console.error('Add this domain to Firebase Console:', window.location.hostname);
    }
    
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

// Export auth for direct access (needed for onAuthStateChanged)
export { auth };
