
import React, { useState } from 'react';

interface RawResponseModalProps {
  isOpen: boolean;
  rawText: string;
  onClose: () => void;
}

export const RawResponseModal: React.FC<RawResponseModalProps> = ({ isOpen, rawText, onClose }) => {
  const [isCopied, setIsCopied] = useState(false);

  if (!isOpen) return null;

  const handleCopy = () => {
    if (isCopied) return;
    window.navigator.clipboard.writeText(rawText).then(() => {
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    }).catch(err => {
      console.error('Failed to copy raw text:', err);
    });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4" role="dialog" aria-modal="true" aria-labelledby="raw-response-title">
      <div className="bg-gray-800 rounded-lg shadow-2xl max-w-3xl w-full max-h-[90vh] flex flex-col">
        <div className="p-4 flex justify-between items-center border-b border-gray-700">
          <h2 id="raw-response-title" className="text-lg font-bold text-white">
            AI Raw Response
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white" aria-label="Close modal">
            <i className="fa-solid fa-times text-xl"></i>
          </button>
        </div>
        <div className="p-4 overflow-y-auto flex-1 relative">
          <pre className="text-sm text-gray-300 whitespace-pre-wrap font-mono">{rawText}</pre>
        </div>
        <div className="p-3 bg-gray-900/50 border-t border-gray-700 flex justify-end">
          <button
            onClick={handleCopy}
            className="flex items-center gap-2 px-4 py-2 rounded-md bg-gray-600 text-white hover:bg-gray-500 transition-colors text-sm"
          >
            {isCopied ? (
              <>
                <i className="fa-solid fa-check text-green-400" aria-hidden="true"></i>
                <span>Copied!</span>
              </>
            ) : (
              <>
                <i className="fa-solid fa-copy" aria-hidden="true"></i>
                <span>Copy Raw Text</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
