import React from 'react';
import { TEXTS } from '../constants';
import { Language } from '../types';

interface ApiKeySelectorProps {
  onKeySelected: () => void;
  lang: Language;
}

const ApiKeySelector: React.FC<ApiKeySelectorProps> = ({ onKeySelected, lang }) => {
  const handleSelectKey = async () => {
    // Cast window to any to access aistudio property, bypassing potential type conflicts
    // with the global definition (AIStudio) which is already present in the environment.
    const aistudio = (window as any).aistudio;
    if (aistudio) {
      try {
        await aistudio.openSelectKey();
        // Assume success if no error, proceed immediately
        onKeySelected();
      } catch (e) {
        console.error("Key selection failed or cancelled", e);
        alert("Selection failed. Please try again.");
      }
    } else {
      console.warn("AI Studio client not found, assuming dev environment or proceeding.");
      onKeySelected();
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] p-6 text-center space-y-6">
      <div className="bg-indigo-50 p-8 rounded-2xl shadow-sm border border-indigo-100 max-w-md w-full">
        <h2 className="text-2xl font-bold text-gray-800 mb-4">{TEXTS[lang].selectKey}</h2>
        <p className="text-gray-600 mb-6 leading-relaxed">
          {TEXTS[lang].apiKeyNote}
        </p>
        <button
          onClick={handleSelectKey}
          className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-semibold py-3 px-6 rounded-lg transition-all transform hover:scale-[1.02] shadow-md"
        >
          {TEXTS[lang].selectKey}
        </button>
        <div className="mt-4 text-sm text-indigo-500 hover:text-indigo-700">
           <a href="https://ai.google.dev/gemini-api/docs/billing" target="_blank" rel="noopener noreferrer">
             {TEXTS[lang].billingLink}
           </a>
        </div>
      </div>
    </div>
  );
};

export default ApiKeySelector;