import { useState } from 'react';
import MobileLoginScreen from './MobileLoginScreen';
import MobileMainScreen from './MobileMainScreen';
import MobileChatScreen from './MobileChatScreen';

type ScreenType = 'login' | 'main' | 'chat';

interface MobileAppProps {
  user: any;
  onLogin: () => void;
  onLogout: () => void;
  initialSettings: any;
  onStoreCredentials: (user: any, credential: any) => Promise<void>;
}

export default function MobileApp({ user, onLogin, onLogout, initialSettings, onStoreCredentials }: MobileAppProps) {
  const [currentScreen, setCurrentScreen] = useState<ScreenType>(user ? 'main' : 'login');

  const handleLoginSuccess = (loggedInUser: any) => {
    setCurrentScreen('main');
  };

  const handleChat = () => {
    setCurrentScreen('chat');
  };

  const handleBack = () => {
    setCurrentScreen('main');
  };

  const renderScreen = () => {
    if (!user) {
      return <MobileLoginScreen onLogin={handleLoginSuccess} onStoreCredentials={onStoreCredentials} />;
    }
    
    switch (currentScreen) {
      case 'login':
        return <MobileLoginScreen onLogin={handleLoginSuccess} onStoreCredentials={onStoreCredentials} />;
      case 'main':
        return <MobileMainScreen onChat={handleChat} user={user} onLogout={onLogout} settings={initialSettings} />;
      case 'chat':
        return <MobileChatScreen onBack={handleBack} user={user} />;
      default:
        return <MobileLoginScreen onLogin={handleLoginSuccess} onStoreCredentials={onStoreCredentials} />;
    }
  };

  return (
    <div className="max-w-md mx-auto h-screen overflow-hidden">
      {renderScreen()}
    </div>
  );
}
