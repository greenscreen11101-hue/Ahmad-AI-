
import React from 'react';

interface ConfirmationModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export const ConfirmationModal: React.FC<ConfirmationModalProps> = ({ 
  isOpen, 
  title, 
  message, 
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  onConfirm, 
  onCancel 
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4" role="dialog" aria-modal="true" aria-labelledby="confirm-modal-title">
      <div className="bg-gray-800 rounded-lg shadow-2xl max-w-md w-full">
        <div className="p-6 border-b border-gray-700">
          <h2 id="confirm-modal-title" className="text-xl font-bold text-white flex items-center gap-3">
            <i className="fa-solid fa-triangle-exclamation text-yellow-400" aria-hidden="true"></i>
            {title}
          </h2>
        </div>

        <div className="p-6">
            <p className="text-gray-300">{message}</p>
        </div>

        <div className="p-4 bg-gray-900/50 border-t border-gray-700 flex justify-end gap-3">
          <button
            onClick={onCancel}
            className="px-4 py-2 rounded-md bg-gray-600 text-white hover:bg-gray-500 transition-colors"
          >
            {cancelText}
          </button>
          <button
            onClick={onConfirm}
            className={`px-4 py-2 rounded-md text-white transition-colors ${title.toLowerCase().includes('danger') ? 'bg-red-600 hover:bg-red-700' : 'bg-primary-500 hover:bg-primary-600'}`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};
