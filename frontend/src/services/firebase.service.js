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
let authStateResolved = false;
let currentFirebaseUser = null;

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
      console.log('=== FIREBASE AUTH STATE CHANGED ===');
      console.log('User:', user ? user.email : 'null');
      console.log('Provider:', user?.providerData?.[0]?.providerId || 'none');
      
      currentFirebaseUser = user;
      authStateResolved = true;
      
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

// Wait for auth state to be resolved
export const waitForAuthState = () => {
  return new Promise((resolve) => {
    if (authStateResolved) {
      resolve(currentFirebaseUser);
      return;
    }
    
    const checkInterval = setInterval(() => {
      if (authStateResolved) {
        clearInterval(checkInterval);
        resolve(currentFirebaseUser);
      }
    }, 100);
    
    // Timeout after 5 seconds
    setTimeout(() => {
      clearInterval(checkInterval);
      resolve(currentFirebaseUser);
    }, 5000);
  });
};

// Add auth state listener
export const addAuthStateListener = (callback) => {
  authStateListeners.push(callback);
  
  // If auth state is already resolved, fire immediately
  if (authStateResolved && currentFirebaseUser) {
    console.log('Auth already resolved, firing listener with:', currentFirebaseUser?.email);
    setTimeout(() => callback(currentFirebaseUser), 0);
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
  
  console.log('=== STARTING GOOGLE REDIRECT ===');
  localStorage.setItem('googleAuthPending', 'true');
  localStorage.setItem('googleAuthTimestamp', Date.now().toString());
  
  await signInWithRedirect(auth, googleProvider);
};

// Handle redirect result - MUST be called on page load
export const handleGoogleRedirect = async () => {
  if (!auth) {
    console.log('Auth not initialized');
    return null;
  }
  
  const wasPending = localStorage.getItem('googleAuthPending') === 'true';
  const timestamp = localStorage.getItem('googleAuthTimestamp');
  
  console.log('=== CHECKING GOOGLE REDIRECT ===');
  console.log('Was pending:', wasPending);
  console.log('Timestamp:', timestamp);
  
  // Check if stale
  if (timestamp && Date.now() - parseInt(timestamp) > 5 * 60 * 1000) {
    console.log('Auth pending flag is stale, clearing');
    clearGoogleAuthPending();
    return null;
  }
  
  if (!wasPending) {
    console.log('No pending redirect');
    return null;
  }
  
  try {
    // Try getRedirectResult first
    console.log('Calling getRedirectResult...');
    const result = await getRedirectResult(auth);
    
    if (result?.user) {
      console.log('=== GOT USER FROM getRedirectResult ===');
      console.log('Email:', result.user.email);
      clearGoogleAuthPending();
      return result.user;
    }
    
    console.log('getRedirectResult returned null, waiting for auth state...');
    
    // Wait for auth state to resolve
    const user = await waitForAuthState();
    
    if (user && !user.isAnonymous) {
      const isGoogleUser = user.providerData?.some(p => p.providerId === 'google.com');
      if (isGoogleUser) {
        console.log('=== GOT USER FROM AUTH STATE ===');
        console.log('Email:', user.email);
        clearGoogleAuthPending();
        return user;
      }
    }
    
    console.log('No Google user found');
    clearGoogleAuthPending();
    return null;
    
  } catch (error) {
    console.error('handleGoogleRedirect error:', error);
    clearGoogleAuthPending();
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
  return initDone && !!auth && !!googleProvider;
};

// Check if redirect is pending
export const isGoogleAuthPending = () => {
  const pending = localStorage.getItem('googleAuthPending') === 'true';
  const timestamp = localStorage.getItem('googleAuthTimestamp');
  
  if (pending && timestamp && Date.now() - parseInt(timestamp) > 5 * 60 * 1000) {
    clearGoogleAuthPending();
    return false;
  }
  
  return pending;
};

// Clear pending flags
export const clearGoogleAuthPending = () => {
  localStorage.removeItem('googleAuthPending');
  localStorage.removeItem('googleAuthTimestamp');
};

// Get current user
export const getCurrentUser = () => {
  return auth?.currentUser || currentFirebaseUser;
};

export { auth };
