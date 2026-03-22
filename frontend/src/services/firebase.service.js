import { initializeApp, getApps } from 'firebase/app';
import { 
  getAuth, 
  GoogleAuthProvider, 
  OAuthProvider,
  signInWithPopup,
  signInWithPhoneNumber,
  RecaptchaVerifier,
  signOut as firebaseSignOut
} from 'firebase/auth';
import firebaseConfig, { isFirebaseConfigured } from '@/config/firebase.config';

// Initialize Firebase only if configured
let app = null;
let auth = null;
let googleProvider = null;
let appleProvider = null;

if (isFirebaseConfigured() && getApps().length === 0) {
  try {
    app = initializeApp(firebaseConfig);
    auth = getAuth(app);
    
    // Google Provider
    googleProvider = new GoogleAuthProvider();
    googleProvider.addScope('email');
    googleProvider.addScope('profile');
    
    // Apple Provider (prepared for future use)
    appleProvider = new OAuthProvider('apple.com');
    appleProvider.addScope('email');
    appleProvider.addScope('name');
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

// Apple Sign In (prepared for future use)
export const signInWithApple = async () => {
  if (!auth || !appleProvider) {
    throw new Error('Firebase not configured or Apple Sign-In not available.');
  }
  
  try {
    const result = await signInWithPopup(auth, appleProvider);
    const user = result.user;
    
    return {
      uid: user.uid,
      email: user.email,
      displayName: user.displayName,
      photoURL: user.photoURL,
      provider: 'apple',
      idToken: await user.getIdToken(),
    };
  } catch (error) {
    console.error('Apple sign-in error:', error);
    throw error;
  }
};

// Phone Number Sign In - Setup
export const setupRecaptcha = (containerId) => {
  if (!auth) {
    throw new Error('Firebase not configured.');
  }
  
  window.recaptchaVerifier = new RecaptchaVerifier(auth, containerId, {
    size: 'invisible',
    callback: () => {
      // reCAPTCHA solved
    },
  });
  
  return window.recaptchaVerifier;
};

// Phone Number Sign In - Send OTP
export const sendOTP = async (phoneNumber) => {
  if (!auth) {
    throw new Error('Firebase not configured.');
  }
  
  try {
    const appVerifier = window.recaptchaVerifier;
    const confirmationResult = await signInWithPhoneNumber(auth, phoneNumber, appVerifier);
    window.confirmationResult = confirmationResult;
    return true;
  } catch (error) {
    console.error('Send OTP error:', error);
    throw error;
  }
};

// Phone Number Sign In - Verify OTP
export const verifyOTP = async (otp) => {
  if (!window.confirmationResult) {
    throw new Error('Please request OTP first.');
  }
  
  try {
    const result = await window.confirmationResult.confirm(otp);
    const user = result.user;
    
    return {
      uid: user.uid,
      phoneNumber: user.phoneNumber,
      provider: 'phone',
      idToken: await user.getIdToken(),
    };
  } catch (error) {
    console.error('Verify OTP error:', error);
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
