
import React, { useState, FormEvent } from 'react';
import type { TaughtSkill } from '../types';

type TeachStep = 'NAME' | 'COMMAND' | 'OUTCOME' | 'PARAMS' | 'SUMMARY' | 'DONE';

interface TeachScreenProps {
  onSaveSkill: (skillData: Omit<TaughtSkill, 'id' | 'timestamp'>) => void;
}

const prompts: Record<TeachStep, string> = {
  NAME: "Hello! I'm ready to learn. What should we call this new skill? (e.g., 'Send Email', 'Set Timer')",
  COMMAND: "Great! What is an example command you would use to trigger this skill?",
  OUTCOME: "Got it. And what is the desired outcome or response I should provide after that command?",
  PARAMS: "Okay. What pieces of information (parameters) are needed for this task? Please list them, separated by commas. (e.g., recipient, subject, body)",
  SUMMARY: "Perfect! Here is a summary of the new skill. Does this look correct?",
  DONE: "Thank you! I've saved this new skill specification. I will use it for future learning."
};

export const TeachScreen: React.FC<TeachScreenProps> = ({ onSaveSkill }) => {
  const [step, setStep] = useState<TeachStep>('NAME');
  const [skillData, setSkillData] = useState<Partial<TaughtSkill>>({});
  const [currentInput, setCurrentInput] = useState('');
  const [history, setHistory] = useState<{ prompt: string, answer: string }[]>([]);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!currentInput.trim() && step !== 'SUMMARY') return;

    const newHistory = [...history, { prompt: prompts[step], answer: currentInput }];
    setHistory(newHistory);

    switch (step) {
      case 'NAME':
        setSkillData({ ...skillData, name: currentInput });
        setStep('COMMAND');
        break;
      case 'COMMAND':
        setSkillData({ ...skillData, commandExample: currentInput });
        setStep('OUTCOME');
        break;
      case 'OUTCOME':
        setSkillData({ ...skillData, outcome: currentInput });
        setStep('PARAMS');
        break;
      case 'PARAMS':
        setSkillData({
          ...skillData,
          parameters: currentInput.split(',').map(p => p.trim()).filter(Boolean)
        });
        setStep('SUMMARY');
        break;
      default:
        break;
    }
    setCurrentInput('');
  };
  
  const handleSave = () => {
    if (skillData.name && skillData.commandExample && skillData.outcome && skillData.parameters) {
      onSaveSkill({
        name: skillData.name,
        commandExample: skillData.commandExample,
        outcome: skillData.outcome,
        parameters: skillData.parameters,
      });
      setStep('DONE');
    }
  };
  
  const handleStartOver = () => {
    setStep('NAME');
    setSkillData({});
    setCurrentInput('');
    setHistory([]);
  };

  return (
    <div className="flex flex-col h-full bg-gray-50 dark:bg-gray-900 p-4 sm:p-6 transition-colors">
      <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Teach Ahmad AI a New Skill</h2>
      
      <div className="flex-1 overflow-y-auto space-y-4 mb-4">
        {history.map((item, index) => (
          <div key={index}>
            <p className="text-primary-600 dark:text-primary-400 mb-1">{item.prompt}</p>
            <p className="pl-4 border-l-2 border-gray-300 dark:border-gray-700 text-gray-600 dark:text-gray-300 italic">"{item.answer}"</p>
          </div>
        ))}
      </div>
      
      <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm">
        {step !== 'SUMMARY' && step !== 'DONE' && (
          <form onSubmit={handleSubmit}>
            <label htmlFor="teach-input" className="font-medium text-gray-800 dark:text-white block mb-2">{prompts[step]}</label>
            <div className="flex gap-3">
              <input
                id="teach-input"
                type="text"
                value={currentInput}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCurrentInput(e.currentTarget.value)}
                placeholder="Type your answer here..."
                className="flex-1 w-full px-4 py-2 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-gray-200 border border-gray-300 dark:border-gray-600 rounded-full focus:outline-none focus:ring-2 focus:ring-primary-500"
                autoFocus
              />
              <button type="submit" className="px-4 py-2 bg-primary-500 text-white rounded-full hover:bg-primary-600 transition-colors">
                Next <i className="fa-solid fa-arrow-right ml-1" aria-hidden="true"></i>
              </button>
            </div>
          </form>
        )}
        
        {step === 'SUMMARY' && (
          <div>
            <h3 className="font-medium text-gray-800 dark:text-white text-lg mb-3">{prompts.SUMMARY}</h3>
            <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg space-y-2 text-gray-700 dark:text-gray-200">
              <p><strong>Skill Name:</strong> {skillData.name}</p>
              <p><strong>Example Command:</strong> "{skillData.commandExample}"</p>
              <p><strong>Desired Outcome:</strong> {skillData.outcome}</p>
              <p>
                <strong>Parameters:</strong> 
                {skillData.parameters && skillData.parameters.length > 0
                  ? skillData.parameters.map(p => <span key={p} className="ml-2 bg-gray-200 dark:bg-gray-600 text-primary-700 dark:text-primary-300 text-xs font-mono px-2 py-1 rounded">{p}</span>)
                  : ' None'
                }
              </p>
            </div>
            <div className="flex justify-end gap-3 mt-4">
              <button onClick={handleStartOver} className="px-4 py-2 bg-gray-200 dark:bg-gray-600 text-gray-800 dark:text-white rounded-md hover:bg-gray-300 dark:hover:bg-gray-500">Start Over</button>
              <button onClick={handleSave} className="px-4 py-2 bg-primary-500 text-white rounded-md hover:bg-primary-600">Save Skill</button>
            </div>
          </div>
        )}
        
        {step === 'DONE' && (
          <div className="text-center">
            <i className="fa-solid fa-check-circle text-green-500 text-3xl mb-3" aria-hidden="true"></i>
            <p className="text-gray-800 dark:text-white font-medium">{prompts.DONE}</p>
          </div>
        )}
      </div>
    </div>
  );
};
