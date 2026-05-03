import { useState } from 'react';
import { Volume2, Command, Loader2 } from 'lucide-react';
import { motion } from 'motion/react';
import { GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { auth } from '../firebase';
import './styles/MobileLoginScreen.css';

interface MobileLoginScreenProps {
  onLogin: (user: any) => void;
  onStoreCredentials: (user: any, credential: any) => Promise<void>;
}

export default function MobileLoginScreen({ onLogin, onStoreCredentials }: MobileLoginScreenProps) {
  const [isLoading, setIsLoading] = useState(false);

  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    try {
      const provider = new GoogleAuthProvider();
      
      // Add only valid Google service scopes for the live agent
      const scopes = [
        'https://www.googleapis.com/auth/gmail.readonly',      // Gmail read access
        'https://www.googleapis.com/auth/gmail.send',          // Gmail send access
        'https://www.googleapis.com/auth/gmail.compose',       // Gmail compose
        'https://www.googleapis.com/auth/calendar.readonly',   // Calendar read access
        'https://www.googleapis.com/auth/calendar.events',      // Calendar events management
        'https://www.googleapis.com/auth/drive.readonly',       // Drive read access
        'https://www.googleapis.com/auth/drive.file',           // Drive file access
        'https://www.googleapis.com/auth/spreadsheets.readonly', // Sheets read access
        'https://www.googleapis.com/auth/spreadsheets',         // Sheets full access
        'https://www.googleapis.com/auth/documents.readonly',    // Docs read access
        'https://www.googleapis.com/auth/documents',            // Docs full access
        'https://www.googleapis.com/auth/youtube.readonly',      // YouTube read access
        'https://www.googleapis.com/auth/youtube.upload',        // YouTube upload
        'https://www.googleapis.com/auth/analytics.readonly',   // Analytics read access
        'https://www.googleapis.com/auth/contacts.readonly',    // Contacts read access
        'https://www.googleapis.com/auth/tasks',                 // Tasks
        'https://www.googleapis.com/auth/photos.readonly',       // Photos read access
        'https://www.googleapis.com/auth/cloud-platform',        // Cloud Platform
        'https://www.googleapis.com/auth/cloud-billing',        // Cloud Billing
        'https://www.googleapis.com/auth/firebase',              // Firebase
        'https://www.googleapis.com/auth/sqlservice',           // Cloud SQL
        'https://www.googleapis.com/auth/sqlservice.admin',      // Cloud SQL Admin
        'https://www.googleapis.com/auth/bigquery',              // BigQuery
        'https://www.googleapis.com/auth/bigquery.readonly',     // BigQuery read-only
        'https://www.googleapis.com/auth/logging.read',          // Cloud Logging read-only
        'https://www.googleapis.com/auth/monitoring',           // Cloud Monitoring
        'https://www.googleapis.com/auth/monitoring.read',      // Cloud Monitoring read-only
        'https://www.googleapis.com/auth/trace.append',         // Cloud Trace
        'https://www.googleapis.com/auth/cloudruntimeconfig',    // Cloud Runtime Config
        'https://www.googleapis.com/auth/devstorage.full_control', // Cloud Storage full control
        'https://www.googleapis.com/auth/fitness.activity.read', // Fitness activity
        'https://www.googleapis.com/auth/fitness.body.read',     // Fitness body
        'https://www.googleapis.com/auth/photoslibrary',          // Photos Library
        'https://www.googleapis.com/auth/photoslibrary.readonly', // Photos Library read-only
        'https://www.googleapis.com/auth/forms',                 // Forms
        'https://www.googleapis.com/auth/forms.body',            // Forms body
        'https://www.googleapis.com/auth/chat.messages',         // Chat messages
        'https://www.googleapis.com/auth/chat.spaces',           // Chat spaces
        'https://www.googleapis.com/auth/chat.memberships',      // Chat memberships
        'https://www.googleapis.com/auth/userinfo.email',         // User email
        'https://www.googleapis.com/auth/userinfo.profile'        // User profile
      ];
      
      scopes.forEach(scope => {
        provider.addScope(scope);
      });
      
      // Set custom parameters for better UX
      provider.setCustomParameters({
        prompt: 'consent', // Force consent screen to show all permissions
        access_type: 'offline' // Get refresh token for long-lived access
      });
      
      const result = await signInWithPopup(auth, provider);
      
      // Store Google credentials for live agent use
      if (result.user) {
        // Get the OAuth credential from the result
        const credential = GoogleAuthProvider.credentialFromResult(result);
        if (credential) {
          await onStoreCredentials(result.user, credential);
        }
        onLogin(result.user);
      }
    } catch (error) {
      console.error('Google sign-in error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="mobile-login-screen">
      <div className="hardware-grid" />
      <div className="ambient-glow" />
      
      <div className="status-bar">
        <span>12:03 AM</span>
        <div className="signal-bars">
          <div className="signal-bar signal-bar-1">
            <div className="signal-bar-fill"></div>
          </div>
          <div className="signal-bar signal-bar-2">
            <div className="signal-bar-fill"></div>
          </div>
          <div className="signal-bar signal-bar-3">
            <div className="signal-bar-fill"></div>
          </div>
        </div>
      </div>
      
      <div className="login-content">
        <motion.div 
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="logo-container"
        >
          <div className="logo-inner">
            <Volume2 className="w-10 h-10 text-amber-500" />
          </div>
          <div className="logo-badge">
            <Command className="w-4 h-4 text-black" />
          </div>
        </motion.div>
        
        <h1 className="app-title">Vep</h1>
        <p className="app-subtitle">
          Powered by Aoede Persona
        </p>
        
        <div className="login-button-container">
          <button 
            onClick={handleGoogleSignIn}
            disabled={isLoading}
            className="login-button"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Initializing...
              </>
            ) : (
              'Initialize Vep Identity'
            )}
          </button>
        </div>
        
        <div className="service-icons">
          <img src="https://www.gstatic.com/images/branding/product/2x/gmail_64dp.png" className="service-icon" alt="G" />
          <img src="https://www.gstatic.com/images/branding/product/2x/calendar_64dp.png" className="service-icon" alt="C" />
          <img src="https://www.gstatic.com/images/branding/product/2x/drive_64dp.png" className="service-icon" alt="D" />
          <img src="https://www.gstatic.com/images/branding/product/2x/sheets_64dp.png" className="service-icon" alt="S" />
        </div>
      </div>
    </div>
  );
}
