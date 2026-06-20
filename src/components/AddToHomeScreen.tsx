import React from 'react';
import { X, Bookmark } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface Props {
  onClose: () => void;
}

const AddToHomeScreen = ({ onClose }: Props) => {
  const navigate = useNavigate();

  const handleGoToTools = () => {
    onClose();
    navigate('/tools');
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
            <Bookmark className="text-brand-gold" size={24} />
          </div>
          <div>
            <h2 className="font-bold text-gray-900 text-lg leading-tight">Need tools again?</h2>
            <p className="text-sm text-gray-500">Save our tools page for next time</p>
          </div>
        </div>

        <p className="text-gray-600 text-sm mb-5">
          Bookmark our tools page so you can quickly hire again whenever you need us.
        </p>

        <div className="space-y-3">
          <button
            onClick={handleGoToTools}
            className="w-full bg-brand-green text-white font-bold py-3 rounded-xl hover:bg-brand-green-dark transition-colors flex items-center justify-center gap-2"
          >
            <Bookmark size={18} />
            Go to Tools Page
          </button>
          <button
            onClick={onClose}
            className="w-full text-gray-500 text-sm py-2 hover:text-gray-700 transition-colors"
          >
            No thanks
          </button>
        </div>
      </div>
    </div>
  );
};

export default AddToHomeScreen;
