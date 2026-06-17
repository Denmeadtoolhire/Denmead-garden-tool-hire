import React, { useEffect, useState } from 'react';
import { X, Share, Plus, Smartphone } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

let deferredPrompt: BeforeInstallPromptEvent | null = null;

// Capture the install prompt event early (before any component mounts)
if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e as BeforeInstallPromptEvent;
  });
}

function isIos(): boolean {
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
}

function isInStandaloneMode(): boolean {
  return ('standalone' in navigator && (navigator as any).standalone) ||
    window.matchMedia('(display-mode: standalone)').matches;
}

interface Props {
  onClose: () => void;
}

const AddToHomeScreen = ({ onClose }: Props) => {
  const [ios] = useState(isIos());
  const [installed, setInstalled] = useState(false);

  // Don't show if already installed
  useEffect(() => {
    if (isInStandaloneMode()) setInstalled(true);
  }, []);

  if (installed) return null;

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') deferredPrompt = null;
    onClose();
  };

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
            <Smartphone className="text-brand-gold" size={24} />
          </div>
          <div>
            <h2 className="font-bold text-gray-900 text-lg leading-tight">Add to Home Screen</h2>
            <p className="text-sm text-gray-500">Quick access to tool hire</p>
          </div>
        </div>

        <p className="text-gray-600 text-sm mb-5">
          Save Denmead Tool Hire to your home screen for quick access next time you need to hire a tool.
        </p>

        {ios ? (
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
        ) : deferredPrompt ? (
          <div className="space-y-3">
            <button
              onClick={handleInstall}
              className="w-full bg-brand-green text-white font-bold py-3 rounded-xl hover:bg-brand-green-dark transition-colors flex items-center justify-center gap-2"
            >
              <Plus size={18} />
              Add to Home Screen
            </button>
            <button
              onClick={onClose}
              className="w-full text-gray-500 text-sm py-2 hover:text-gray-700 transition-colors"
            >
              No thanks
            </button>
          </div>
        ) : (
          // Fallback: browser doesn't support install prompt (e.g. already installed or desktop)
          <button
            onClick={onClose}
            className="w-full bg-brand-green text-white font-semibold py-3 rounded-xl hover:bg-brand-green-dark transition-colors"
          >
            Close
          </button>
        )}
      </div>
    </div>
  );
};

export default AddToHomeScreen;
