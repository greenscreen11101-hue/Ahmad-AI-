
import React, { useState, useEffect } from 'react';

interface CodeBlockProps {
  language: string;
  code: string;
}

export const CodeBlock: React.FC<CodeBlockProps> = ({ language, code }) => {
  const [isCopied, setIsCopied] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined' && (window as any).Prism) {
      (window as any).Prism.highlightAll();
    }
  }, [code, language]);

  const handleCopy = () => {
    if (isCopied) return;
    window.navigator.clipboard.writeText(code).then(() => {
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    }).catch(err => {
      console.error('Failed to copy code to clipboard:', err);
    });
  };

  return (
    <div className="bg-gray-900 rounded-lg overflow-hidden my-4 text-sm border border-gray-700 shadow-sm w-full max-w-full">
      <div className="flex justify-between items-center px-4 py-2 bg-gray-800 border-b border-gray-700">
        <span className="text-xs font-mono text-gray-400 uppercase">{language || 'text'}</span>
        <button
          onClick={handleCopy}
          className="flex items-center gap-2 text-xs text-gray-400 hover:text-white transition-colors"
        >
          {isCopied ? (
            <>
              <i className="fa-solid fa-check text-green-400" aria-hidden="true"></i>
              <span>Copied</span>
            </>
          ) : (
            <>
              <i className="fa-solid fa-copy" aria-hidden="true"></i>
              <span>Copy</span>
            </>
          )}
        </button>
      </div>
      <div className="overflow-x-auto w-full">
          <pre key={code} className="!p-4 !m-0 min-w-full float-left">
            <code className={`language-${language} font-mono text-gray-200 leading-normal`}>
              {code}
            </code>
          </pre>
      </div>
    </div>
  );
};
