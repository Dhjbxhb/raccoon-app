/**
 * Auth Utilities
 * Client-side validation and auth helper functions
 */

// Email validation
export const validateEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!email) {
    return { valid: false, error: 'Email is required' };
  }
  if (!emailRegex.test(email)) {
    return { valid: false, error: 'Please enter a valid email address' };
  }
  return { valid: true, error: null };
};

// Password validation
export const validatePassword = (password) => {
  if (!password) {
    return { valid: false, error: 'Password is required' };
  }
  if (password.length < 6) {
    return { valid: false, error: 'Password must be at least 6 characters' };
  }
  if (password.length > 100) {
    return { valid: false, error: 'Password is too long' };
  }
  return { valid: true, error: null };
};

// Password confirmation validation
export const validatePasswordMatch = (password, confirmPassword) => {
  if (!confirmPassword) {
    return { valid: false, error: 'Please confirm your password' };
  }
  if (password !== confirmPassword) {
    return { valid: false, error: 'Passwords do not match' };
  }
  return { valid: true, error: null };
};

// Username validation
export const validateUsername = (username) => {
  if (!username) {
    return { valid: false, error: 'Username is required' };
  }
  if (username.length < 3) {
    return { valid: false, error: 'Username must be at least 3 characters' };
  }
  if (username.length > 20) {
    return { valid: false, error: 'Username must be 20 characters or less' };
  }
  if (!/^[a-zA-Z0-9_]+$/.test(username)) {
    return { valid: false, error: 'Username can only contain letters, numbers, and underscores' };
  }
  return { valid: true, error: null };
};

// Gender validation
export const validateGender = (gender) => {
  const validGenders = ['male', 'female', 'any'];
  if (!gender) {
    return { valid: false, error: 'Please select an option' };
  }
  if (!validGenders.includes(gender.toLowerCase())) {
    return { valid: false, error: 'Please select a valid option' };
  }
  return { valid: true, error: null };
};

// Phone number validation
export const validatePhone = (phone) => {
  if (!phone) {
    return { valid: false, error: 'Phone number is required' };
  }
  // Remove non-digits for length check
  const digits = phone.replace(/\D/g, '');
  if (digits.length < 10) {
    return { valid: false, error: 'Please enter a valid phone number' };
  }
  return { valid: true, error: null };
};

// OTP validation
export const validateOTP = (otp) => {
  if (!otp) {
    return { valid: false, error: 'Verification code is required' };
  }
  if (otp.length !== 6) {
    return { valid: false, error: 'Please enter the 6-digit code' };
  }
  if (!/^\d{6}$/.test(otp)) {
    return { valid: false, error: 'Code must contain only numbers' };
  }
  return { valid: true, error: null };
};

// Full login form validation
export const validateLoginForm = (email, password) => {
  const errors = {};
  
  const emailResult = validateEmail(email);
  if (!emailResult.valid) errors.email = emailResult.error;
  
  const passwordResult = validatePassword(password);
  if (!passwordResult.valid) errors.password = passwordResult.error;
  
  return {
    valid: Object.keys(errors).length === 0,
    errors
  };
};

// Full signup form validation
export const validateSignupForm = (data) => {
  const errors = {};
  
  const usernameResult = validateUsername(data.username);
  if (!usernameResult.valid) errors.username = usernameResult.error;
  
  const emailResult = validateEmail(data.email);
  if (!emailResult.valid) errors.email = emailResult.error;
  
  const passwordResult = validatePassword(data.password);
  if (!passwordResult.valid) errors.password = passwordResult.error;
  
  const confirmResult = validatePasswordMatch(data.password, data.confirmPassword);
  if (!confirmResult.valid) errors.confirmPassword = confirmResult.error;
  
  const genderResult = validateGender(data.gender);
  if (!genderResult.valid) errors.gender = genderResult.error;
  
  return {
    valid: Object.keys(errors).length === 0,
    errors
  };
};

// Extract error message from API response
export const getErrorMessage = (error) => {
  if (error.response?.data?.detail) {
    return error.response.data.detail;
  }
  if (error.response?.data?.message) {
    return error.response.data.message;
  }
  if (error.message) {
    return error.message;
  }
  return 'An unexpected error occurred. Please try again.';
};

// Whole years old for an ISO date string, or null if the date is unparseable.
export const getAge = (isoDate) => {
  const dob = new Date(isoDate);
  if (Number.isNaN(dob.getTime())) return null;
  const today = new Date();
  let age = today.getFullYear() - dob.getFullYear();
  const m = today.getMonth() - dob.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) age -= 1;
  return age;
};

// Parse a fetch Response as JSON, tolerating a non-JSON body (e.g. an nginx
// 502/504 HTML page served while the backend restarts) instead of throwing a
// raw "Unexpected token '<'" error up to the caller/UI.
export const readJsonSafe = async (response) => {
  try {
    return await response.json();
  } catch {
    return null;
  }
};

// Token management helpers
export const TOKEN_KEY = 'raccoon_token';

export const getStoredToken = () => {
  return localStorage.getItem(TOKEN_KEY);
};

export const setStoredToken = (token) => {
  localStorage.setItem(TOKEN_KEY, token);
};

export const clearStoredToken = () => {
  localStorage.removeItem(TOKEN_KEY);
};

export const isTokenValid = (token) => {
  if (!token) return false;
  
  try {
    // Decode JWT payload (middle part)
    const payload = JSON.parse(atob(token.split('.')[1]));
    // Check expiration
    const now = Date.now() / 1000;
    return payload.exp > now;
  } catch (error) {
    return false;
  }
};

// Get browser locale for country detection fallback
export const getBrowserLocale = () => {
  return navigator.language || navigator.userLanguage || 'en-US';
};

// Determines where to send a user right after login/signup, based on the
// gates that apply to them. Guests skip email verification entirely since
// they don't have an email on file. Onboarding (date of birth + gender)
// applies to every new account, guests included, and also covers age
// verification - so a completed profile implies age_verified.
export const getPostAuthRedirect = (user) => {
  if (!user) return '/login';
  if (user.is_admin) return '/admin';
  if (!user.is_guest && !user.email_verified) return '/verify-email-pending';
  if (!user.profile_completed) return '/onboarding';
  return '/dashboard';
};
