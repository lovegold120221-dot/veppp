import { useState } from 'react';
import { X, LogOut, Save, Settings } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { LANGUAGES, setStoredLanguage } from '../../lib/languages';

interface AgentSettings {
  userName: string;
  agentName: string;
  personaName: string;
  personality: string;
  avatarUrl: string;
  selectedVoice: string;
  language: string;
  serviceProviders?: Record<string, 'direct' | 'zapier'>;
  translatorMode?: boolean;
  translatorLanguage?: string;
}

interface ProfileSettingsProps {
  user: any;
  settings: AgentSettings;
  onSettingsChange: (settings: AgentSettings) => void;
  onLogout: () => void;
  onShowTools: () => void;
  onClose: () => void;
  onSave: () => void;
}

export default function ProfileSettings({
  user,
  settings,
  onSettingsChange,
  onLogout,
  onShowTools,
  onClose,
  onSave
}: ProfileSettingsProps) {
  const [localSettings, setLocalSettings] = useState(settings);

  const handleAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (ev) => {
      const img = new Image();
      img.onload = () => {
        const c = document.createElement('canvas');
        c.width = 150;
        c.height = 150;
        const ctx = c.getContext('2d');
        if (!ctx) return;
        ctx.drawImage(img, 0, 0, 150, 150);
        const newSettings = { ...localSettings, avatarUrl: c.toDataURL('image/jpeg', 0.8) };
        setLocalSettings(newSettings);
        onSettingsChange(newSettings);
      };
      img.src = ev.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[200] flex flex-col overflow-y-auto bg-[#020302]"
      >
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-white/[0.10] bg-[#020302] px-6 pb-8 pt-16">
          <h2 className="text-[15px] font-black uppercase tracking-[0.18em] text-white">Office Profile</h2>
          <button
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-[12px] border border-lime-300/25 bg-lime-300/[0.05] text-lime-300/85 transition-colors hover:border-lime-300/50 hover:text-lime-200"
            aria-label="Close profile settings"
            title="Close profile settings"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 px-6 pb-32">
          {/* Profile Photo */}
          <div className="flex flex-col items-center py-10">
            <div className="relative">
              <div className="flex h-32 w-32 items-center justify-center overflow-hidden rounded-full border-[3px] border-white/[0.12] bg-zinc-900/70 p-3">
                {localSettings.avatarUrl || user.photoURL ? (
                  <img
                    src={localSettings.avatarUrl || user.photoURL || ''}
                    alt="Profile"
                    className="h-full w-full rounded-full object-cover"
                  />
                ) : (
                  <div className="text-4xl text-white/50">👤</div>
                )}
              </div>
              <input
                type="file"
                accept="image/*"
                className="absolute inset-0 opacity-0 cursor-pointer"
                aria-label="Upload profile photo"
                title="Upload profile photo"
                onChange={handleAvatarUpload}
              />
            </div>
            <p className="mt-5 text-[14px] font-black uppercase tracking-[0.22em] text-white">Profile Photo</p>
            <p className="mt-2 text-sm font-semibold text-zinc-600">Tap to update</p>
          </div>

          {/* Settings Form */}
          <div className="space-y-6">
            <div>
              <label className="block text-[12px] font-black uppercase tracking-[0.16em] text-white/60 mb-2">
                Your Name
              </label>
              <input
                type="text"
                value={localSettings.userName}
                onChange={(e) => {
                  const newSettings = { ...localSettings, userName: e.target.value };
                  setLocalSettings(newSettings);
                  onSettingsChange(newSettings);
                }}
                className="w-full rounded-[12px] border border-white/[0.08] bg-white/[0.02] px-4 py-3 text-white placeholder-white/[0.3] focus:border-lime-300/50 focus:outline-none"
                placeholder="Enter your name"
              />
            </div>

            <div>
              <label className="block text-[12px] font-black uppercase tracking-[0.16em] text-white/60 mb-2">
                Agent Name
              </label>
              <input
                type="text"
                value={localSettings.personaName}
                onChange={(e) => {
                  const newSettings = { ...localSettings, personaName: e.target.value };
                  setLocalSettings(newSettings);
                  onSettingsChange(newSettings);
                }}
                className="w-full rounded-[12px] border border-white/[0.08] bg-white/[0.02] px-4 py-3 text-white placeholder-white/[0.3] focus:border-lime-300/50 focus:outline-none"
                placeholder="Agent name"
              />
            </div>

            <div>
              <label className="block text-[12px] font-black uppercase tracking-[0.16em] text-white/60 mb-2">
                Language
              </label>
              <select
                value={localSettings.language}
                onChange={(e) => {
                  const newSettings = { ...localSettings, language: e.target.value };
                  setLocalSettings(newSettings);
                  onSettingsChange(newSettings);
                  setStoredLanguage(e.target.value);
                }}
                title="Select language"
                aria-label="Select language"
                className="w-full rounded-[12px] border border-white/[0.08] bg-white/[0.02] px-4 py-3 text-white focus:border-lime-300/50 focus:outline-none"
              >
                {LANGUAGES.map((lang) => (
                  <option key={lang} value={lang}>{lang}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[12px] font-black uppercase tracking-[0.16em] text-white/60 mb-2">
                Voice Selection
              </label>
              <select
                value={localSettings.selectedVoice}
                onChange={(e) => {
                  const newSettings = { ...localSettings, selectedVoice: e.target.value };
                  setLocalSettings(newSettings);
                  onSettingsChange(newSettings);
                }}
                title="Select AI voice"
                aria-label="Select AI voice"
                className="w-full rounded-[12px] border border-white/[0.08] bg-white/[0.02] px-4 py-3 text-white focus:border-lime-300/50 focus:outline-none"
              >
                <option value="Hera">Black Widow (Hera) - Female, Professional</option>
                <option value="Kore">Wonder Woman (Kore) - Female, Confident</option>
                <option value="Aoede">Athena (Aoede) - Female, Elegant</option>
                <option value="Fenrir">Batman (Fenrir) - Male, Deep</option>
                <option value="Puck">Loki (Puck) - Male, Playful</option>
                <option value="Charon">Ghost Rider (Charon) - Male, Gravelly</option>
              </select>
            </div>

            <div>
              <label className="block text-[12px] font-black uppercase tracking-[0.16em] text-white/60 mb-2">
                Personality Notes
              </label>
              <textarea
                value={localSettings.personality}
                onChange={(e) => {
                  const newSettings = { ...localSettings, personality: e.target.value };
                  setLocalSettings(newSettings);
                  onSettingsChange(newSettings);
                }}
                className="w-full rounded-[12px] border border-white/[0.08] bg-white/[0.02] px-4 py-3 text-white placeholder-white/[0.3] focus:border-lime-300/50 focus:outline-none resize-none"
                rows={4}
                placeholder="Any personality preferences or notes..."
              />
            </div>

            {/* Translator Mode */}
            <div className="pt-4 border-t border-white/[0.06]">
              <div className="flex items-center justify-between mb-3">
                <label className="block text-[12px] font-black uppercase tracking-[0.16em] text-white/60">
                  Translator Mode
                </label>
                <div
                  onClick={() => {
                    const next = { ...localSettings, translatorMode: !localSettings.translatorMode };
                    setLocalSettings(next);
                    onSettingsChange(next);
                  }}
                  className={`relative h-6 w-11 cursor-pointer rounded-full transition-colors ${
                    localSettings.translatorMode ? 'bg-lime-400' : 'bg-zinc-700'
                  }`}
                >
                  <span
                    className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${
                      localSettings.translatorMode ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </div>
              </div>
              <p className="text-[11px] text-zinc-500 mb-3">
                When ON, the live session switches into a pure translator with no persona intro or extro — just the translated text.
              </p>
              <label className="block text-[11px] font-bold uppercase tracking-[0.14em] text-zinc-500 mb-1.5">
                Target Language
              </label>
              <select
                value={localSettings.translatorLanguage || 'English'}
                onChange={(e) => {
                  const next = { ...localSettings, translatorLanguage: e.target.value };
                  setLocalSettings(next);
                  onSettingsChange(next);
                }}
                disabled={!localSettings.translatorMode}
                title="Select translator target language"
                aria-label="Select translator target language"
                className={`w-full rounded-[12px] border px-4 py-3 text-white focus:border-lime-300/50 focus:outline-none appearance-none ${
                  localSettings.translatorMode
                    ? 'border-white/[0.08] bg-white/[0.02]'
                    : 'border-white/[0.04] bg-white/[0.01] text-zinc-600 cursor-not-allowed'
                }`}
              >
                {LANGUAGES.map((lang) => (
                  <option key={lang} value={lang}>{lang}</option>
                ))}
              </select>
            </div>

            {/* Service Provider Toggles */}
            <div className="pt-4 border-t border-white/[0.06]">
              <label className="block text-[12px] font-black uppercase tracking-[0.16em] text-white/60 mb-3">
                Service Providers
              </label>
              <p className="text-[11px] text-zinc-500 mb-3">
                Choose how each Google service connects. Direct = fast native OAuth. Zapier = broader app coverage (slower).
              </p>
              {[
                { key: 'gmail', label: 'Gmail' },
                { key: 'drive', label: 'Google Drive' },
                { key: 'calendar', label: 'Google Calendar' },
                { key: 'sheets', label: 'Google Sheets' },
                { key: 'docs', label: 'Google Docs' },
                { key: 'slides', label: 'Google Slides' },
                { key: 'tasks', label: 'Google Tasks' },
                { key: 'contacts', label: 'Google Contacts' },
                { key: 'youtube', label: 'YouTube' },
                { key: 'forms', label: 'Google Forms' },
                { key: 'chat', label: 'Google Chat' },
                { key: 'analytics', label: 'Google Analytics' },
                { key: 'photos', label: 'Google Photos' },
                { key: 'maps', label: 'Google Maps' },
              ].map(({ key, label }) => {
                const current = localSettings.serviceProviders?.[key] || 'direct';
                return (
                  <div key={key} className="flex items-center justify-between py-2.5 border-b border-white/[0.04] last:border-0">
                    <span className="text-[13px] text-white/80">{label}</span>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          const next = { ...localSettings.serviceProviders, [key]: 'direct' as const };
                          const newSettings = { ...localSettings, serviceProviders: next };
                          setLocalSettings(newSettings);
                          onSettingsChange(newSettings);
                        }}
                        className={`px-3 py-1.5 rounded-lg text-[11px] font-bold uppercase tracking-wider transition-all ${
                          current === 'direct'
                            ? 'bg-lime-400/20 text-lime-300 border border-lime-400/40'
                            : 'bg-white/[0.03] text-zinc-500 border border-white/[0.06] hover:text-white/60'
                        }`}
                      >
                        Direct
                      </button>
                      <button
                        onClick={() => {
                          const next = { ...localSettings.serviceProviders, [key]: 'zapier' as const };
                          const newSettings = { ...localSettings, serviceProviders: next };
                          setLocalSettings(newSettings);
                          onSettingsChange(newSettings);
                        }}
                        className={`px-3 py-1.5 rounded-lg text-[11px] font-bold uppercase tracking-wider transition-all ${
                          current === 'zapier'
                            ? 'bg-orange-400/20 text-orange-300 border border-orange-400/40'
                            : 'bg-white/[0.03] text-zinc-500 border border-white/[0.06] hover:text-white/60'
                        }`}
                      >
                        Zapier
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="fixed bottom-0 left-0 right-0 border-t border-white/[0.10] bg-black/95 p-4">
          <div className="flex gap-3">
            <button
              onClick={onLogout}
              className="flex flex-1 items-center justify-center gap-3 rounded-[22px] bg-red-950/45 py-5 text-[13px] font-black uppercase tracking-[0.16em] text-red-500 transition-all hover:bg-red-950 active:scale-95"
            >
              <LogOut className="h-4 w-4" />
              LOGOUT
            </button>
            <button
              onClick={onShowTools}
              className="flex flex-1 items-center justify-center gap-3 rounded-[22px] bg-blue-950/45 py-5 text-[13px] font-black uppercase tracking-[0.16em] text-blue-400 transition-all hover:bg-blue-950 active:scale-95"
            >
              <Settings className="h-4 w-4" />
              TOOLS
            </button>
            <button
              onClick={onSave}
              className="flex flex-1 items-center justify-center gap-3 rounded-[22px] bg-lime-400 py-5 text-[13px] font-black uppercase tracking-[0.16em] text-black transition-all hover:bg-lime-300 active:scale-95"
            >
              <Save className="h-4 w-4" />
              SAVE
            </button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
