import React, { useEffect, useState } from 'react';
import { X, Share, Plus, Smartphone, Monitor } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

// Store the event globally so it survives across renders
let _deferredPrompt: BeforeInstallPromptEvent | null = null;
const _listeners: Array<(e: BeforeInstallPromptEvent | null) => void> = [];

function setDeferredPrompt(e: BeforeInstallPromptEvent | null) {
  _deferredPrompt = e;
  _listeners.forEach((fn) => fn(e));
}

if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    setDeferredPrompt(e as BeforeInstallPromptEvent);
  });
  window.addEventListener('appinstalled', () => {
    setDeferredPrompt(null);
  });
}

function useInstallPrompt() {
  const [prompt, setPrompt] = useState<BeforeInstallPromptEvent | null>(_deferredPrompt);
  useEffect(() => {
    _listeners.push(setPrompt);
    // In case the event already fired before this component mounted
    setPrompt(_deferredPrompt);
    return () => {
      const idx = _listeners.indexOf(setPrompt);
      if (idx !== -1) _listeners.splice(idx, 1);
    };
  }, []);
  return prompt;
}

function isIos(): boolean {
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
}

function isMobile(): boolean {
  return /iphone|ipad|ipod|android/i.test(navigator.userAgent);
}

function isInStandaloneMode(): boolean {
  return ('standalone' in navigator && (navigator as any).standalone) ||
    window.matchMedia('(display-mode: standalone)').matches;
}

interface Props {
  onClose: () => void;
}

const AddToHomeScreen = ({ onClose }: Props) => {
  const installPrompt = useInstallPrompt();
  const [ios] = useState(isIos());
  const [mobile] = useState(isMobile());

  // Don't show if already installed as standalone app
  if (isInStandaloneMode()) return null;

  const handleInstall = async () => {
    if (!installPrompt) return;
    await installPrompt.prompt();
    const { outcome } = await installPrompt.userChoice;
    if (outcome === 'accepted') setDeferredPrompt(null);
    onClose();
  };

  const title = mobile ? 'Add to Home Screen' : 'Install as App';
  const subtitle = mobile ? 'Quick access to tool hire' : 'Open instantly from your desktop';
  const description = mobile
    ? 'Save Denmead Tool Hire to your home screen for quick access next time you need to hire a tool.'
    : 'Install Denmead Tool Hire as an app on your desktop — it opens instantly without needing a browser.';
  const icon = mobile
    ? <Smartphone className="text-brand-gold" size={24} />
    : <Monitor className="text-brand-gold" size={24} />;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black bg-opacity-50">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 relative animate-slide-up">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
          aria-label="Close"
        >
          <X size={20} />
        </button>

        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 bg-brand-green rounded-xl flex items-center justify-center flex-shrink-0">
            {icon}
          </div>
          <div>
            <h2 className="font-bold text-gray-900 text-lg leading-tight">{title}</h2>
            <p className="text-sm text-gray-500">{subtitle}</p>
          </div>
        </div>

        <p className="text-gray-600 text-sm mb-5">{description}</p>

        {ios ? (
          // iOS Safari — manual instructions (no programmatic prompt available)
          <div className="bg-gray-50 rounded-xl p-4 text-sm text-gray-700 space-y-3">
            <p className="font-semibold text-gray-800">To add to your home screen:</p>
            <div className="flex items-center gap-3">
              <span className="w-6 h-6 rounded-full bg-brand-green text-white text-xs font-bold flex items-center justify-center flex-shrink-0">1</span>
              <span>Tap the <strong>Share</strong> button <Share size={14} className="inline" /> at the bottom of Safari</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="w-6 h-6 rounded-full bg-brand-green text-white text-xs font-bold flex items-center justify-center flex-shrink-0">2</span>
              <span>Scroll down and tap <strong>"Add to Home Screen"</strong> <Plus size={14} className="inline" /></span>
            </div>
            <div className="flex items-center gap-3">
              <span className="w-6 h-6 rounded-full bg-brand-green text-white text-xs font-bold flex items-center justify-center flex-shrink-0">3</span>
              <span>Tap <strong>"Add"</strong> in the top right corner</span>
            </div>
            <button
              onClick={onClose}
              className="w-full mt-2 bg-brand-green text-white font-semibold py-3 rounded-xl hover:bg-brand-green-dark transition-colors"
            >
              Got it, thanks!
            </button>
          </div>
        ) : installPrompt ? (
          // Android or desktop Chrome/Edge — native install prompt available
          <div className="space-y-3">
            <button
              onClick={handleInstall}
              className="w-full bg-brand-green text-white font-bold py-3 rounded-xl hover:bg-brand-green-dark transition-colors flex items-center justify-center gap-2"
            >
              <Plus size={18} />
              {title}
            </button>
            <button
              onClick={onClose}
              className="w-full text-gray-500 text-sm py-2 hover:text-gray-700 transition-colors"
            >
              No thanks
            </button>
          </div>
        ) : (
          // Browser doesn't support install (e.g. Firefox, Safari desktop)
          <div className="space-y-3">
            <p className="text-sm text-gray-500 bg-gray-50 rounded-xl p-4">
              Your browser doesn't support automatic install. In Chrome or Edge, look for the
              <strong> install icon</strong> in the address bar to add this site to your desktop.
            </p>
            <button
              onClick={onClose}
              className="w-full bg-brand-green text-white font-semibold py-3 rounded-xl hover:bg-brand-green-dark transition-colors"
            >
              Close
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default AddToHomeScreen;
