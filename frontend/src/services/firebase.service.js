import { initializeApp, getApps } from 'firebase/app';
import { 
  getAuth, 
  GoogleAuthProvider, 
  signInWithPopup,
  signInAnonymously,
  signOut as firebaseSignOut
} from 'firebase/auth';
import firebaseConfig, { isFirebaseConfigured } from '@/config/firebase.config';

// Initialize Firebase only if configured
let app = null;
let auth = null;
let googleProvider = null;

if (isFirebaseConfigured() && getApps().length === 0) {
  try {
    app = initializeApp(firebaseConfig);
    auth = getAuth(app);
    
    // Google Provider
    googleProvider = new GoogleAuthProvider();
    googleProvider.addScope('email');
    googleProvider.addScope('profile');
  } catch (error) {
    console.error('Firebase initialization error:', error);
  }
}

// Google Sign In
export const signInWithGoogle = async () => {
  if (!auth || !googleProvider) {
    throw new Error('Firebase not configured. Please add Firebase credentials.');
  }
  
  try {
    const result = await signInWithPopup(auth, googleProvider);
    const user = result.user;
    
    return {
      uid: user.uid,
      email: user.email,
      displayName: user.displayName,
      photoURL: user.photoURL,
      provider: 'google',
      idToken: await user.getIdToken(),
    };
  } catch (error) {
    console.error('Google sign-in error:', error);
    throw error;
  }
};

// Anonymous Sign In
export const signInAnonymousUser = async () => {
  if (!auth) {
    throw new Error('Firebase not configured. Please add Firebase credentials.');
  }
  
  try {
    const result = await signInAnonymously(auth);
    const user = result.user;
    
    return {
      uid: user.uid,
      email: null,
      displayName: null,
      photoURL: null,
      provider: 'anonymous',
      idToken: await user.getIdToken(),
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
  return !!auth;
};

export { auth };
