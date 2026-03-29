import { initializeApp, getApps } from 'firebase/app';
import { 
  getAuth, 
  GoogleAuthProvider, 
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

console.log('=== FIREBASE SERVICE LOADING ===');
console.log('Firebase configured:', isFirebaseConfigured());

// Initialize on module load if configured
const initFirebase = async () => {
  if (!isFirebaseConfigured()) {
    console.log('Firebase not configured');
    return false;
  }
  
  try {
    // Check if already initialized
    if (getApps().length === 0) {
      console.log('Initializing Firebase app...');
      app = initializeApp(firebaseConfig);
    } else {
      app = getApps()[0];
      console.log('Firebase app already exists');
    }
    
    auth = getAuth(app);
    
    // CRITICAL: Set persistence to LOCAL so auth state survives page reload
    await setPersistence(auth, browserLocalPersistence);
    console.log('Auth persistence set to LOCAL');
    
    // Configure Google Provider
    googleProvider = new GoogleAuthProvider();
    googleProvider.addScope('email');
    googleProvider.addScope('profile');
    googleProvider.setCustomParameters({
      prompt: 'select_account'
    });
    
    console.log('=== FIREBASE INITIALIZED ===');
    console.log('Auth:', !!auth);
    console.log('Google Provider:', !!googleProvider);
    
    return true;
  } catch (error) {
    console.error('=== FIREBASE INIT ERROR ===', error);
    return false;
  }
};

// Start initialization immediately
initPromise = initFirebase();

// Google Sign In - Uses redirect for better cross-origin compatibility
export const signInWithGoogle = async () => {
  // Ensure Firebase is initialized
  await initPromise;
  
  if (!auth || !googleProvider) {
    throw new Error('Firebase not initialized');
  }
  
  try {
    console.log('=== STARTING GOOGLE SIGN-IN ===');
    console.log('Using redirect flow...');
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
  // Ensure Firebase is initialized
  await initPromise;
  
  if (!auth) {
    console.log('Firebase auth not initialized');
    return null;
  }
  
  try {
    console.log('=== GETTING REDIRECT RESULT ===');
    console.log('Current user before getRedirectResult:', auth.currentUser?.email || 'null');
    
    const result = await getRedirectResult(auth);
    
    console.log('Redirect result:', result ? 'FOUND' : 'NULL');
    
    if (result && result.user) {
      console.log('=== GOOGLE USER FROM REDIRECT ===');
      console.log('UID:', result.user.uid);
      console.log('Email:', result.user.email);
      console.log('Name:', result.user.displayName);
      
      const user = result.user;
      const idToken = await user.getIdToken(true);
      
      console.log('ID Token obtained:', idToken ? 'YES' : 'NO');
      
      return {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName,
        photoURL: user.photoURL,
        provider: 'google',
        idToken: idToken,
      };
    }
    
    // Check if there's a current user (might be from persistence)
    if (auth.currentUser && !auth.currentUser.isAnonymous) {
      console.log('=== FOUND PERSISTENT USER ===');
      console.log('Email:', auth.currentUser.email);
      
      const user = auth.currentUser;
      const idToken = await user.getIdToken(true);
      
      return {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName,
        photoURL: user.photoURL,
        provider: 'google',
        idToken: idToken,
      };
    }
    
    console.log('No redirect result and no current user');
    return null;
  } catch (error) {
    console.error('=== REDIRECT RESULT ERROR ===');
    console.error('Code:', error.code);
    console.error('Message:', error.message);
    
    if (error.code === 'auth/unauthorized-domain') {
      console.error('DOMAIN NOT AUTHORIZED!');
      console.error('Add domain to Firebase Console:', window.location.hostname);
    }
    
    throw error;
  }
};

// Anonymous Sign In
export const signInAnonymousUser = async () => {
  await initPromise;
  
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

// Wait for Firebase to be ready
export const waitForFirebase = async () => {
  await initPromise;
  return isFirebaseReady();
};

// Export auth for direct access (needed for onAuthStateChanged)
export { auth };
