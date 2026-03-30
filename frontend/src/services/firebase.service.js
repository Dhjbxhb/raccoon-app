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

let app = null;
let auth = null;
let googleProvider = null;
let initDone = false;
let authStateListeners = [];
let lastKnownUser = null; // Cache the last auth state

// Initialize synchronously
if (isFirebaseConfigured()) {
  try {
    if (getApps().length === 0) {
      app = initializeApp(firebaseConfig);
    } else {
      app = getApps()[0];
    }
    
    auth = getAuth(app);
    
    googleProvider = new GoogleAuthProvider();
    googleProvider.addScope('email');
    googleProvider.addScope('profile');
    googleProvider.setCustomParameters({
      prompt: 'select_account'
    });
    
    initDone = true;
    console.log('Firebase initialized');
    
    // Set up global auth state listener
    onAuthStateChanged(auth, (user) => {
      console.log('=== AUTH STATE CHANGED ===');
      console.log('User:', user ? user.email : 'null');
      console.log('Is anonymous:', user?.isAnonymous);
      
      // Cache the user for late subscribers
      lastKnownUser = user;
      
      // Notify all listeners
      authStateListeners.forEach(listener => {
        try {
          listener(user);
        } catch (e) {
          console.error('Auth listener error:', e);
        }
      });
    });
    
  } catch (error) {
    console.error('Firebase init error:', error);
  }
}

// Add auth state listener - immediately calls with cached user if available
export const addAuthStateListener = (callback) => {
  authStateListeners.push(callback);
  
  // Immediately fire with cached user if we already have one
  if (lastKnownUser !== null) {
    console.log('Firing listener immediately with cached user:', lastKnownUser?.email);
    try {
      callback(lastKnownUser);
    } catch (e) {
      console.error('Auth listener immediate fire error:', e);
    }
  }
  
  // Return unsubscribe function
  return () => {
    authStateListeners = authStateListeners.filter(l => l !== callback);
  };
};

// Google Sign In
export const signInWithGoogle = async () => {
  if (!auth || !googleProvider) {
    throw new Error('Firebase not initialized');
  }
  
  console.log('Starting Google redirect...');
  // Use localStorage instead of sessionStorage - survives cross-origin redirects
  localStorage.setItem('googleAuthPending', 'true');
  localStorage.setItem('googleAuthTimestamp', Date.now().toString());
  
  await signInWithRedirect(auth, googleProvider);
};

// Handle redirect result  
export const getGoogleRedirectResult = async () => {
  if (!auth) return null;
  
  try {
    const wasPending = localStorage.getItem('googleAuthPending');
    const timestamp = localStorage.getItem('googleAuthTimestamp');
    console.log('Checking redirect, pending:', wasPending, 'timestamp:', timestamp);
    
    // Clear the pending flag if it's stale (older than 5 minutes)
    if (timestamp && Date.now() - parseInt(timestamp) > 5 * 60 * 1000) {
      console.log('Auth pending flag is stale, clearing');
      localStorage.removeItem('googleAuthPending');
      localStorage.removeItem('googleAuthTimestamp');
      return null;
    }
    
    // First try getRedirectResult
    const result = await getRedirectResult(auth);
    console.log('getRedirectResult:', result ? 'found user: ' + result.user?.email : 'null');
    
    // Clear pending flags on success
    localStorage.removeItem('googleAuthPending');
    localStorage.removeItem('googleAuthTimestamp');
    
    if (result?.user) {
      return await extractUserData(result.user);
    }
    
    // Fallback: check currentUser
    if (auth.currentUser && !auth.currentUser.isAnonymous) {
      console.log('Using currentUser fallback:', auth.currentUser.email);
      return await extractUserData(auth.currentUser);
    }
    
    return null;
  } catch (error) {
    console.error('getRedirectResult error:', error);
    localStorage.removeItem('googleAuthPending');
    localStorage.removeItem('googleAuthTimestamp');
    throw error;
  }
};

// Extract user data helper
const extractUserData = async (user) => {
  const idToken = await user.getIdToken(true);
  return {
    uid: user.uid,
    email: user.email,
    displayName: user.displayName,
    photoURL: user.photoURL,
    provider: 'google',
    idToken: idToken,
  };
};

// Get current user if available
export const getCurrentUser = async () => {
  if (!auth || !auth.currentUser || auth.currentUser.isAnonymous) {
    return null;
  }
  return await extractUserData(auth.currentUser);
};

// Get cached Firebase user (synchronous)
export const getCachedFirebaseUser = () => {
  return lastKnownUser;
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

// Check if redirect is pending
export const isGoogleAuthPending = () => {
  const pending = localStorage.getItem('googleAuthPending') === 'true';
  const timestamp = localStorage.getItem('googleAuthTimestamp');
  
  // Consider stale if older than 5 minutes
  if (pending && timestamp && Date.now() - parseInt(timestamp) > 5 * 60 * 1000) {
    console.log('Google auth pending flag is stale, clearing');
    localStorage.removeItem('googleAuthPending');
    localStorage.removeItem('googleAuthTimestamp');
    return false;
  }
  
  return pending;
};

// Clear pending flags
export const clearGoogleAuthPending = () => {
  localStorage.removeItem('googleAuthPending');
  localStorage.removeItem('googleAuthTimestamp');
};

export { auth };
