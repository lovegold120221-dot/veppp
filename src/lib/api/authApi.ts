import { 
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  updateProfile,
  onAuthStateChanged,
  signOut,
  User,
  GoogleAuthProvider,
  signInWithPopup,
  browserPopupRedirectResolver
} from 'firebase/auth';
import { auth } from '../firebase/index';

export interface GoogleCredentials {
  accessToken: string;
  refreshToken?: string;
  expiresAt: number;
  scopes: string[];
}

export const handleEmailAuth = async (
  email: string, 
  password: string
): Promise<User> => {
  try {
    const result = await signInWithEmailAndPassword(auth, email, password);
    return result.user;
  } catch (error: any) {
    throw new Error(getAuthErrorMessage(error));
  }
};

export const handleEmailSignup = async (
  fullName: string,
  email: string, 
  password: string,
  confirmPassword: string
): Promise<User> => {
  try {
    if (password.length < 6) throw new Error('Use at least 6 characters for the password.');
    if (password !== confirmPassword) throw new Error('Passwords do not match.');
    
    const result = await createUserWithEmailAndPassword(auth, email, password);
    await updateProfile(result.user, { displayName: fullName });
    localStorage.removeItem('googleAccessToken');
    
    return result.user;
  } catch (error: any) {
    throw new Error(getAuthErrorMessage(error));
  }
};

export const handlePasswordReset = async (email: string): Promise<void> => {
  try {
    await sendPasswordResetEmail(auth, email);
  } catch (error: any) {
    throw new Error(getAuthErrorMessage(error));
  }
};

export const handleGoogleSignIn = async (): Promise<User> => {
  try {
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({
      prompt: 'consent select_account',
      access_type: 'offline',
    });
    
    // Add only valid Google OAuth scopes
    provider.addScope('https://www.googleapis.com/auth/gmail.readonly');
    provider.addScope('https://www.googleapis.com/auth/gmail.send');
    provider.addScope('https://www.googleapis.com/auth/gmail.compose');
    provider.addScope('https://www.googleapis.com/auth/drive');
    provider.addScope('https://www.googleapis.com/auth/drive.file');
    provider.addScope('https://www.googleapis.com/auth/drive.metadata');
    provider.addScope('https://www.googleapis.com/auth/documents');
    provider.addScope('https://www.googleapis.com/auth/spreadsheets');
    provider.addScope('https://www.googleapis.com/auth/presentations');
    provider.addScope('https://www.googleapis.com/auth/youtube');
    provider.addScope('https://www.googleapis.com/auth/youtube.upload');
    provider.addScope('https://www.googleapis.com/auth/youtube.readonly');
    provider.addScope('https://www.googleapis.com/auth/calendar');
    provider.addScope('https://www.googleapis.com/auth/calendar.events');
    provider.addScope('https://www.googleapis.com/auth/tasks');
    provider.addScope('https://www.googleapis.com/auth/contacts');
    provider.addScope('https://www.googleapis.com/auth/contacts.readonly');
    provider.addScope('https://www.googleapis.com/auth/forms');
    provider.addScope('https://www.googleapis.com/auth/forms.body');
    provider.addScope('https://www.googleapis.com/auth/chat.messages');
    provider.addScope('https://www.googleapis.com/auth/chat.spaces');
    provider.addScope('https://www.googleapis.com/auth/chat.memberships');
    provider.addScope('https://www.googleapis.com/auth/analytics.readonly');
    provider.addScope('https://www.googleapis.com/auth/analytics');
    provider.addScope('https://www.googleapis.com/auth/cloud-platform');
    provider.addScope('https://www.googleapis.com/auth/cloud-billing');
    provider.addScope('https://www.googleapis.com/auth/firebase');
    provider.addScope('https://www.googleapis.com/auth/sqlservice');
    provider.addScope('https://www.googleapis.com/auth/sqlservice.admin');
    provider.addScope('https://www.googleapis.com/auth/bigquery');
    provider.addScope('https://www.googleapis.com/auth/bigquery.readonly');
    provider.addScope('https://www.googleapis.com/auth/logging.read');
    provider.addScope('https://www.googleapis.com/auth/monitoring');
    provider.addScope('https://www.googleapis.com/auth/monitoring.read');
    provider.addScope('https://www.googleapis.com/auth/trace.append');
    provider.addScope('https://www.googleapis.com/auth/cloudruntimeconfig');
    provider.addScope('https://www.googleapis.com/auth/devstorage.full_control');
    provider.addScope('https://www.googleapis.com/auth/fitness.activity.read');
    provider.addScope('https://www.googleapis.com/auth/fitness.body.read');
    provider.addScope('https://www.googleapis.com/auth/photoslibrary');
    provider.addScope('https://www.googleapis.com/auth/photoslibrary.readonly');
    provider.addScope('https://www.googleapis.com/auth/photoslibrary.readonly.appcreateddata');

    const result = await signInWithPopup(auth, provider, browserPopupRedirectResolver);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    
    if (credential?.accessToken) {
      localStorage.setItem('googleAccessToken', credential.accessToken);
    }
    
    return result.user;
  } catch (error: any) {
    throw new Error(getAuthErrorMessage(error));
  }
};

export const handleSignOut = async (): Promise<void> => {
  try {
    await signOut(auth);
    localStorage.removeItem('googleAccessToken');
  } catch (error: any) {
    console.error('Sign out error:', error);
    throw new Error('Failed to sign out');
  }
};

export const getAuthErrorMessage = (error: any): string => {
  const code = String(error?.code || '');
  
  if (code.includes('auth/email-already-in-use')) return 'That email is already registered. Sign in instead.';
  if (code.includes('auth/invalid-email')) return 'Enter a valid email address.';
  if (code.includes('auth/user-not-found') || code.includes('auth/wrong-password') || code.includes('auth/invalid-credential')) return 'Email or password is incorrect.';
  if (code.includes('auth/weak-password')) return 'Use at least 6 characters for the password.';
  if (code.includes('auth/too-many-requests')) return 'Too many attempts. Wait a moment and try again.';
  if (code.includes('auth/popup-closed-by-user')) return 'The Google sign-in window was closed.';
  if (code.includes('auth/missing-initial-state')) return 'Authentication failed due to browser privacy settings. Open the app in a new tab and try again.';
  
  return error?.message || 'Authentication failed. Try again.';
};

export const onAuthStateChange = (callback: (user: User | null) => void) => {
  return onAuthStateChanged(auth, callback);
};
