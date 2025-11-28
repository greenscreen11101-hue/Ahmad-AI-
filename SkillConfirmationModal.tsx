

import React from 'react';
import type { Skill } from '../types';

interface SkillConfirmationModalProps {
  skill: Skill;
  onConfirm: () => void;
  onCancel: () => void;
}

export const SkillConfirmationModal: React.FC<SkillConfirmationModalProps> = ({ skill, onConfirm, onCancel }) => {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4" role="dialog" aria-modal="true" aria-labelledby="skill-modal-title">
      <div className="bg-gray-800 rounded-lg shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col">
        <div className="p-6 border-b border-gray-700">
          <h2 id="skill-modal-title" className="text-xl font-bold text-white flex items-center gap-3">
            <i className="fa-solid fa-lightbulb-on text-yellow-400" aria-hidden="true"></i>
            New Skill Proposal
          </h2>
          <p className="text-sm text-gray-400 mt-1">Ahmad AI wants to learn a new skill. Please review and approve.</p>
        </div>

        <div className="p-6 overflow-y-auto">
            <div className="mb-4">
                <h3 className="font-semibold text-primary-500">{skill.name}</h3>
                <p className="text-sm text-gray-300">{skill.description}</p>
            </div>
            <div className="bg-black p-4 rounded-md">
                <pre className="max-h-60 overflow-y-auto">
                    <code className="text-sm text-cyan-300 font-mono whitespace-pre-wrap">
                        {skill.code}
                    </code>
                </pre>
            </div>
            <div className="mt-4 p-3 bg-yellow-900/50 border border-yellow-700 text-yellow-300 text-xs rounded-md">
                <i className="fa-solid fa-triangle-exclamation mr-2" aria-hidden="true"></i>
                <strong>Security Warning:</strong> Generated code is for demonstration and is sandboxed. Do not execute untrusted code.
            </div>
        </div>

        <div className="p-4 bg-gray-900/50 border-t border-gray-700 flex justify-end gap-3">
          <button
            onClick={onCancel}
            className="px-4 py-2 rounded-md bg-gray-600 text-white hover:bg-gray-500 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 rounded-md bg-primary-500 text-white hover:bg-primary-600 transition-colors"
          >
            Approve & Add Skill
          </button>
        </div>
      </div>
    </div>
  );
};