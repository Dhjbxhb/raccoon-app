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
let currentFirebaseUser = null;
let authStatePromise = null;
let authStateResolve = null;

// Create a promise that resolves when auth state is known
authStatePromise = new Promise((resolve) => {
  authStateResolve = resolve;
});

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
    
    // Set up auth state listener - this is KEY
    onAuthStateChanged(auth, (user) => {
      console.log('=== FIREBASE AUTH STATE CHANGED ===');
      console.log('User:', user ? user.email : 'null');
      console.log('Provider:', user?.providerData?.[0]?.providerId || 'none');
      console.log('UID:', user?.uid || 'none');
      
      currentFirebaseUser = user;
      
      // Resolve the promise so waiting code can proceed
      if (authStateResolve) {
        authStateResolve(user);
        authStateResolve = null; // Only resolve once
      }
    });
    
  } catch (error) {
    console.error('Firebase init error:', error);
    if (authStateResolve) {
      authStateResolve(null);
    }
  }
} else {
  console.error('Firebase not configured');
  if (authStateResolve) {
    authStateResolve(null);
  }
}

// Wait for auth state to be resolved (with timeout)
export const waitForAuthState = (timeoutMs = 5000) => {
  return new Promise((resolve) => {
    // If we already have a user, return immediately
    if (currentFirebaseUser) {
      console.log('waitForAuthState: Already have user:', currentFirebaseUser.email);
      resolve(currentFirebaseUser);
      return;
    }
    
    // Race between auth state promise and timeout
    const timeoutId = setTimeout(() => {
      console.log('waitForAuthState: Timeout reached');
      resolve(currentFirebaseUser); // May still be null
    }, timeoutMs);
    
    authStatePromise.then((user) => {
      clearTimeout(timeoutId);
      console.log('waitForAuthState: Auth state resolved:', user?.email || 'null');
      resolve(user);
    });
  });
};

// Google Sign In - sets pending flag before redirect
export const signInWithGoogle = async () => {
  if (!auth || !googleProvider) {
    throw new Error('Firebase not initialized');
  }
  
  console.log('=== STARTING GOOGLE REDIRECT ===');
  
  // Set pending flags BEFORE redirect
  localStorage.setItem('googleAuthPending', 'true');
  localStorage.setItem('googleAuthTimestamp', Date.now().toString());
  
  // This will navigate away from the page
  await signInWithRedirect(auth, googleProvider);
};

// Handle redirect result - called when page loads after Google redirect
export const handleGoogleRedirect = async () => {
  if (!auth) {
    console.log('handleGoogleRedirect: Auth not initialized');
    return null;
  }
  
  const wasPending = localStorage.getItem('googleAuthPending') === 'true';
  const timestamp = localStorage.getItem('googleAuthTimestamp');
  
  console.log('=== HANDLE GOOGLE REDIRECT ===');
  console.log('Pending flag:', wasPending);
  console.log('Timestamp:', timestamp);
  console.log('Current user already:', auth.currentUser?.email || 'none');
  
  // Check if redirect is stale (older than 5 minutes)
  if (timestamp && Date.now() - parseInt(timestamp) > 5 * 60 * 1000) {
    console.log('Redirect is stale, clearing flags');
    clearGoogleAuthPending();
    return null;
  }
  
  if (!wasPending) {
    console.log('No pending redirect flag');
    return null;
  }
  
  try {
    // METHOD 1: Try getRedirectResult first
    console.log('Trying getRedirectResult...');
    const result = await getRedirectResult(auth);
    
    if (result?.user) {
      console.log('=== SUCCESS: Got user from getRedirectResult ===');
      console.log('Email:', result.user.email);
      console.log('UID:', result.user.uid);
      return result.user;
    }
    
    console.log('getRedirectResult returned null');
    
    // METHOD 2: Check if user is already signed in
    if (auth.currentUser) {
      const isGoogle = auth.currentUser.providerData?.some(p => p.providerId === 'google.com');
      if (isGoogle) {
        console.log('=== SUCCESS: User already signed in via Google ===');
        console.log('Email:', auth.currentUser.email);
        return auth.currentUser;
      }
    }
    
    // METHOD 3: Wait for auth state to resolve
    console.log('Waiting for auth state...');
    const user = await waitForAuthState(3000);
    
    if (user) {
      const isGoogle = user.providerData?.some(p => p.providerId === 'google.com');
      if (isGoogle) {
        console.log('=== SUCCESS: Got user from auth state ===');
        console.log('Email:', user.email);
        return user;
      } else {
        console.log('User found but not Google provider');
      }
    }
    
    console.log('No Google user found after all methods');
    return null;
    
  } catch (error) {
    console.error('handleGoogleRedirect error:', error);
    throw error;
  }
};

// Sign Out
export const signOut = async () => {
  if (auth) {
    await firebaseSignOut(auth);
    currentFirebaseUser = null;
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
  
  // Check if stale
  if (pending && timestamp && Date.now() - parseInt(timestamp) > 5 * 60 * 1000) {
    clearGoogleAuthPending();
    return false;
  }
  
  return pending;
};

// Clear pending flags
export const clearGoogleAuthPending = () => {
  console.log('Clearing Google auth pending flags');
  localStorage.removeItem('googleAuthPending');
  localStorage.removeItem('googleAuthTimestamp');
};

// Get current user
export const getCurrentUser = () => {
  return auth?.currentUser || currentFirebaseUser;
};

export { auth };
