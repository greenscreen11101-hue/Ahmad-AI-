
import React from 'react';
import type { Message } from '../types';

interface ContextMenuProps {
  message: Message;
  isLastMessage: boolean;
  position: { x: number; y: number };
  onClose: () => void;
  onCopy: (message: Message) => void;
  onDelete: (messageId: number) => void;
  onRegenerate: () => void;
  onShowRaw: (message: Message) => void;
}

const MenuItem: React.FC<{ icon: string; label: string; onClick: () => void; disabled?: boolean; destructive?: boolean }> = ({ icon, label, onClick, disabled, destructive }) => (
  <button
    onClick={onClick}
    disabled={disabled}
    className={`w-full text-left px-3 py-2 text-sm flex items-center gap-3 transition-colors rounded ${
      destructive ? 'text-red-400 hover:bg-red-500/10' : 'text-gray-300 hover:bg-gray-700'
    } disabled:opacity-50 disabled:cursor-not-allowed`}
  >
    <i className={`fa-solid ${icon} w-4 text-center`} aria-hidden="true"></i>
    <span>{label}</span>
  </button>
);

export const ContextMenu: React.FC<ContextMenuProps> = ({
  message,
  isLastMessage,
  position,
  onCopy,
  onDelete,
  onRegenerate,
  onShowRaw,
}) => {
  const isAiMessage = message.sender === 'ai';

  return (
    <div
      style={{ top: position.y, left: position.x }}
      className="fixed bg-gray-800 border border-gray-700 rounded-lg shadow-2xl p-2 z-50 w-56"
    >
      <MenuItem icon="fa-copy" label="Copy Message" onClick={() => onCopy(message)} />
      {isAiMessage && (
        <MenuItem icon="fa-code" label="Show Raw Response" onClick={() => onShowRaw(message)} />
      )}
      <div className="my-1 border-t border-gray-700" />
      <MenuItem
        icon="fa-arrows-rotate"
        label="Regenerate Response"
        onClick={onRegenerate}
        disabled={!isAiMessage || !isLastMessage}
      />
      <MenuItem
        icon="fa-trash-can"
        label="Delete Message"
        onClick={() => onDelete(message.id)}
        destructive
      />
    </div>
  );
};
