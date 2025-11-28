
import React, { useState, useEffect, useRef } from 'react';
import type { Theme, AISettings } from '../types';

interface SettingsScreenProps {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  aiSettings: AISettings;
  setAiSettings: (settings: AISettings) => void;
  onClearData: () => void;
}

const ToggleSwitch: React.FC<{ isEnabled: boolean; onToggle: () => void; disabled?: boolean }> = ({ isEnabled, onToggle, disabled = false }) => (
    <button
      onClick={disabled ? undefined : onToggle}
      className={`relative inline-flex items-center h-6 rounded-full w-11 transition-colors ${
        isEnabled && !disabled ? 'bg-primary-500' : 'bg-gray-300 dark:bg-gray-600'
      } ${disabled ? 'cursor-not-allowed opacity-50' : ''}`}
      aria-checked={isEnabled}
      role="switch"
      disabled={disabled}
    >
      <span
        className={`inline-block w-4 h-4 transform bg-white rounded-full transition-transform ${
          isEnabled ? 'translate-x-6' : 'translate-x-1'
        }`}
      />
    </button>
);

const SettingRow: React.FC<{ icon: string; label: string; children: React.ReactNode; }> = ({ icon, label, children }) => (
    <div className="p-4 bg-white dark:bg-gray-800 rounded-lg flex items-center justify-between border border-gray-200 dark:border-gray-700 shadow-sm">
        <div className="flex items-center gap-3">
            <i className={`fa-solid ${icon} text-primary-500 w-5 text-center`} aria-hidden="true"></i>
            <span className="font-medium text-gray-800 dark:text-white">{label}</span>
        </div>
        <div>{children}</div>
    </div>
);

export const SettingsScreen: React.FC<SettingsScreenProps> = ({ 
    theme, setTheme, 
    aiSettings, setAiSettings,
    onClearData
}) => {
  const [localSettings, setLocalSettings] = useState(aiSettings);
  const [newOpenRouterKey, setNewOpenRouterKey] = useState('');
  const [newHuggingFaceKey, setNewHuggingFaceKey] = useState('');
  const [showSaved, setShowSaved] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setLocalSettings(aiSettings);
  }, [aiSettings]);

  const handleSave = () => {
    const safeOpenRouterIndex = (localSettings.openRouterApiKeys.length > 0 && localSettings.openRouterKeyIndex >= 0 && localSettings.openRouterKeyIndex < localSettings.openRouterApiKeys.length) 
        ? localSettings.openRouterKeyIndex 
        : 0;
        
    const safeHuggingFaceIndex = (localSettings.huggingFaceApiKeys.length > 0 && localSettings.huggingFaceKeyIndex >= 0 && localSettings.huggingFaceKeyIndex < (localSettings.huggingFaceApiKeys?.length || 0)) 
        ? localSettings.huggingFaceKeyIndex 
        : 0;

    setAiSettings({ 
        ...localSettings, 
        openRouterKeyIndex: safeOpenRouterIndex, 
        huggingFaceKeyIndex: safeHuggingFaceIndex 
    });
    setShowSaved(true);
    setTimeout(() => setShowSaved(false), 2000);
  };
  
  const handleAddOpenRouterKey = () => {
    if (newOpenRouterKey.trim() && !localSettings.openRouterApiKeys.includes(newOpenRouterKey.trim())) {
      setLocalSettings(prev => ({
        ...prev,
        openRouterApiKeys: [...prev.openRouterApiKeys, newOpenRouterKey.trim()]
      }));
      setNewOpenRouterKey('');
    }
  };
  
  const handleRemoveOpenRouterKey = (keyToRemove: string) => {
    setLocalSettings(prev => {
        const newKeys = prev.openRouterApiKeys.filter(key => key !== keyToRemove);
        let newIndex = prev.openRouterKeyIndex;
        if (newIndex >= newKeys.length) newIndex = Math.max(0, newKeys.length - 1);
        
        return {
            ...prev,
            openRouterApiKeys: newKeys,
            openRouterKeyIndex: newIndex
        };
    });
  };

  const handleAddHuggingFaceKey = () => {
    if (newHuggingFaceKey.trim() && !(localSettings.huggingFaceApiKeys || []).includes(newHuggingFaceKey.trim())) {
      setLocalSettings(prev => ({
        ...prev,
        huggingFaceApiKeys: [...(prev.huggingFaceApiKeys || []), newHuggingFaceKey.trim()]
      }));
      setNewHuggingFaceKey('');
    }
  };
  
  const handleRemoveHuggingFaceKey = (keyToRemove: string) => {
    setLocalSettings(prev => {
        const newKeys = (prev.huggingFaceApiKeys || []).filter(key => key !== keyToRemove);
        let newIndex = prev.huggingFaceKeyIndex;
        if (newIndex >= newKeys.length) newIndex = Math.max(0, newKeys.length - 1);

        return {
            ...prev,
            huggingFaceApiKeys: newKeys,
            huggingFaceKeyIndex: newIndex
        };
    });
  };

  // --- BACKUP & RESTORE LOGIC ---
  const handleExportData = () => {
    const dataToExport = {
        chatHistory: localStorage.getItem('chatHistory'),
        learnedSkills: localStorage.getItem('learnedSkills'),
        taughtSkills: localStorage.getItem('taughtSkills'),
        offlineCache: localStorage.getItem('offlineCache'),
        aiSettings: localStorage.getItem('aiSettings'),
        ahmad_ai_long_term_memory: localStorage.getItem('ahmad_ai_long_term_memory'),
        ahmad_ai_chat_sessions: localStorage.getItem('ahmad_ai_chat_sessions'),
        timestamp: new Date().toISOString()
    };
    
    const blob = new Blob([JSON.stringify(dataToExport, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `ahmad-ai-backup-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleImportData = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const content = e.target?.result as string;
            const data = JSON.parse(content);
            
            // Basic Schema Validation
            if (data.chatHistory && !Array.isArray(JSON.parse(data.chatHistory))) throw new Error("Invalid chat history");
            if (data.learnedSkills && !Array.isArray(JSON.parse(data.learnedSkills))) throw new Error("Invalid skills");

            if (data.chatHistory) localStorage.setItem('chatHistory', data.chatHistory);
            if (data.learnedSkills) localStorage.setItem('learnedSkills', data.learnedSkills);
            if (data.taughtSkills) localStorage.setItem('taughtSkills', data.taughtSkills);
            if (data.offlineCache) localStorage.setItem('offlineCache', data.offlineCache);
            if (data.aiSettings) localStorage.setItem('aiSettings', data.aiSettings);
            if (data.ahmad_ai_long_term_memory) localStorage.setItem('ahmad_ai_long_term_memory', data.ahmad_ai_long_term_memory);
            if (data.ahmad_ai_chat_sessions) localStorage.setItem('ahmad_ai_chat_sessions', data.ahmad_ai_chat_sessions);
            
            alert('Data restored successfully! The application will now reload.');
            window.location.reload();
        } catch (error) {
            alert('Failed to restore data. The file appears to be corrupted or incompatible.');
            console.error(error);
        }
    };
    reader.readAsText(file);
    // Reset input
    event.target.value = '';
  };

  const maskApiKey = (key: string) => {
    if (key.length < 12) return '***';
    return `${key.slice(0, 8)}...${key.slice(-4)}`;
  }

  const showOpenRouterSettings = localSettings.provider === 'openrouter' || localSettings.provider === 'hybrid';
  const showHuggingFaceSettings = localSettings.provider === 'huggingface' || localSettings.provider === 'hybrid';

  return (
    <div className="p-4 sm:p-6 bg-gray-50 dark:bg-gray-900 flex-1 overflow-y-auto transition-colors">
      <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Settings</h2>
      <div className="max-w-xl mx-auto space-y-6">
        
        <section>
            <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-3">General</h3>
            <div className="space-y-2">
                <SettingRow icon="fa-moon" label="Dark Theme">
                    <ToggleSwitch isEnabled={theme === 'dark'} onToggle={() => setTheme(theme === 'light' ? 'dark' : 'light')} />
                </SettingRow>
            </div>
        </section>
        
        <section>
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-3">Data Management</h3>
          <div className="bg-white dark:bg-gray-800 rounded-lg p-4 space-y-4 border border-gray-200 dark:border-gray-700 shadow-sm">
              <div className="flex justify-between items-center">
                  <div>
                      <h4 className="font-semibold text-gray-800 dark:text-white">Backup Brain</h4>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Download all memories and skills.</p>
                  </div>
                  <button onClick={handleExportData} className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm transition-colors">
                      <i className="fa-solid fa-download mr-2"></i>Export
                  </button>
              </div>
              <div className="border-t border-gray-200 dark:border-gray-700 pt-4 flex justify-between items-center">
                  <div>
                      <h4 className="font-semibold text-gray-800 dark:text-white">Restore Brain</h4>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Restore from a backup file.</p>
                  </div>
                  <input 
                    type="file" 
                    ref={fileInputRef} 
                    onChange={handleImportData} 
                    accept=".json" 
                    className="hidden" 
                  />
                  <button onClick={() => fileInputRef.current?.click()} className="px-3 py-2 bg-gray-200 dark:bg-gray-600 hover:bg-gray-300 dark:hover:bg-gray-500 text-gray-800 dark:text-white rounded text-sm transition-colors">
                      <i className="fa-solid fa-upload mr-2"></i>Import
                  </button>
              </div>
          </div>
        </section>
        
        <section>
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-3">AI Engine</h3>
          <div className="bg-white dark:bg-gray-800 rounded-lg p-4 space-y-4 border border-gray-200 dark:border-gray-700 shadow-sm">
            <div>
              <label htmlFor="ai-provider-select" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">AI Provider</label>
              <select
                id="ai-provider-select"
                value={localSettings.provider}
                onChange={(e) => setLocalSettings({...localSettings, provider: e.currentTarget.value as any })}
                className="w-full bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white px-3 py-2 rounded-md border border-gray-300 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="gemini">Google Gemini (Default)</option>
                <option value="openrouter">OpenRouter (Free Models)</option>
                <option value="huggingface">Hugging Face</option>
                <option value="hybrid">Hybrid (Unified Intelligence)</option>
              </select>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                {localSettings.provider === 'hybrid' 
                    ? "Activates Consensus Engine: Queries 5 distinct OpenRouter models + Gemini + Hugging Face simultaneously and merges their best insights."
                    : "Select which AI service handles your requests."}
              </p>
            </div>

            {localSettings.provider !== 'hybrid' && (
                <div>
                    <div className="flex items-center justify-between">
                        <div>
                            <label className="font-medium text-gray-800 dark:text-white">Deep Thinking Mode (Gemini 3 Pro)</label>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                Enables advanced reasoning with chain-of-thought processing.
                            </p>
                        </div>
                        <ToggleSwitch
                            isEnabled={localSettings.isComplexTaskMode}
                            onToggle={() =>
                                setLocalSettings(prev => ({ ...prev, isComplexTaskMode: !prev.isComplexTaskMode }))
                            }
                        />
                    </div>
                </div>
            )}
            
            {showOpenRouterSettings && (
              <div className="border-t border-gray-200 dark:border-gray-700 pt-4 mt-4">
                <div className="bg-gray-100 dark:bg-gray-700 p-3 rounded-md text-sm text-gray-700 dark:text-gray-300 flex items-start gap-3 mb-4">
                  <i className="fa-solid fa-network-wired mt-1 text-primary-500 dark:text-primary-400" aria-hidden="true"></i>
                  <div>
                    <h4 className="font-semibold text-gray-900 dark:text-white">OpenRouter Configuration</h4>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Ahmad AI uses free models like DeepSeek-R1 and Llama 3.3 via OpenRouter.</p>
                  </div>
                </div>
                
                <div>
                  <label id="openrouter-keys-label" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">OpenRouter API Keys</label>
                  <div className="space-y-2">
                    {localSettings.openRouterApiKeys.map((key, index) => (
                      <div 
                        key={index} 
                        className={`flex items-center justify-between px-3 py-2 rounded-md transition-colors ${
                            localSettings.openRouterKeyIndex === index 
                            ? 'bg-primary-50 dark:bg-primary-900/20 border border-primary-200 dark:border-primary-500/50' 
                            : 'bg-gray-50 dark:bg-gray-700 border border-transparent'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                            <button
                                onClick={() => setLocalSettings(prev => ({ ...prev, openRouterKeyIndex: index }))}
                                className={`flex-shrink-0 w-4 h-4 rounded-full border flex items-center justify-center transition-all ${
                                    localSettings.openRouterKeyIndex === index 
                                    ? 'border-primary-500 bg-primary-500' 
                                    : 'border-gray-400 dark:border-gray-500 hover:border-primary-400'
                                }`}
                                aria-label={localSettings.openRouterKeyIndex === index ? "Active key" : "Set as active key"}
                                title={localSettings.openRouterKeyIndex === index ? "Active key" : "Set as active key"}
                            >
                                {localSettings.openRouterKeyIndex === index && <div className="w-1.5 h-1.5 bg-white rounded-full" />}
                            </button>
                            <span className={`font-mono text-sm truncate max-w-[150px] sm:max-w-[200px] ${localSettings.openRouterKeyIndex === index ? 'text-gray-900 dark:text-white font-semibold' : 'text-gray-600 dark:text-gray-300'}`}>
                                {maskApiKey(key)}
                            </span>
                            {localSettings.openRouterKeyIndex === index && (
                                <span className="hidden sm:inline-block text-xs text-primary-600 dark:text-primary-400 font-medium px-1.5 py-0.5 bg-primary-100 dark:bg-primary-900/50 rounded ml-2">Active</span>
                            )}
                        </div>
                        <button onClick={() => handleRemoveOpenRouterKey(key)} className="text-red-500 dark:text-red-400 hover:text-red-600 dark:hover:text-red-300 text-xs flex-shrink-0" aria-label={`Remove API key ending in ${key.slice(-4)}`}>
                           <i className="fa-solid fa-trash-can mr-1" aria-hidden="true"></i> Remove
                        </button>
                      </div>
                    ))}
                  </div>
                  <div className="flex items-center gap-2 mt-3">
                    <label htmlFor="add-openrouter-key-input" className="sr-only">Add a new OpenRouter API key</label>
                    <input
                      id="add-openrouter-key-input"
                      type="password"
                      placeholder="Add a new OpenRouter key"
                      value={newOpenRouterKey}
                      onChange={(e) => setNewOpenRouterKey(e.currentTarget.value)}
                      className="flex-1 w-full bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white px-3 py-2 rounded-md border border-gray-300 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-primary-500"
                      aria-labelledby="openrouter-keys-label"
                    />
                    <button onClick={handleAddOpenRouterKey} className="px-3 py-2 bg-gray-200 dark:bg-gray-600 text-gray-800 dark:text-white rounded-md hover:bg-gray-300 dark:hover:bg-gray-500 transition-colors" aria-label="Add new API key">
                      <i className="fa-solid fa-plus" aria-hidden="true"></i> Add
                    </button>
                  </div>
                </div>
              </div>
            )}

            {showHuggingFaceSettings && (
              <div className="border-t border-gray-200 dark:border-gray-700 pt-4 mt-4">
                <div className="bg-gray-100 dark:bg-gray-700 p-3 rounded-md text-sm text-gray-700 dark:text-gray-300 flex items-start gap-3 mb-4">
                  <i className="fa-solid fa-robot mt-1 text-primary-500 dark:text-primary-400" aria-hidden="true"></i>
                  <div>
                    <h4 className="font-semibold text-gray-900 dark:text-white">Hugging Face Configuration</h4>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Connects to Hugging Face models (defaults to Mistral 7B Instruct).</p>
                  </div>
                </div>
                
                <div>
                  <label id="huggingface-keys-label" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Hugging Face API Keys</label>
                  <div className="space-y-2">
                    {(localSettings.huggingFaceApiKeys || []).map((key, index) => (
                      <div 
                        key={index} 
                        className={`flex items-center justify-between px-3 py-2 rounded-md transition-colors ${
                            localSettings.huggingFaceKeyIndex === index 
                            ? 'bg-primary-50 dark:bg-primary-900/20 border border-primary-200 dark:border-primary-500/50' 
                            : 'bg-gray-50 dark:bg-gray-700 border border-transparent'
                        }`}
                      >
                         <div className="flex items-center gap-3">
                            <button
                                onClick={() => setLocalSettings(prev => ({ ...prev, huggingFaceKeyIndex: index }))}
                                className={`flex-shrink-0 w-4 h-4 rounded-full border flex items-center justify-center transition-all ${
                                    localSettings.huggingFaceKeyIndex === index 
                                    ? 'border-primary-500 bg-primary-500' 
                                    : 'border-gray-400 dark:border-gray-500 hover:border-primary-400'
                                }`}
                                aria-label={localSettings.huggingFaceKeyIndex === index ? "Active key" : "Set as active key"}
                                title={localSettings.huggingFaceKeyIndex === index ? "Active key" : "Set as active key"}
                            >
                                {localSettings.huggingFaceKeyIndex === index && <div className="w-1.5 h-1.5 bg-white rounded-full" />}
                            </button>
                            <span className={`font-mono text-sm truncate max-w-[150px] sm:max-w-[200px] ${localSettings.huggingFaceKeyIndex === index ? 'text-gray-900 dark:text-white font-semibold' : 'text-gray-600 dark:text-gray-300'}`}>
                                {maskApiKey(key)}
                            </span>
                            {localSettings.huggingFaceKeyIndex === index && (
                                <span className="hidden sm:inline-block text-xs text-primary-600 dark:text-primary-400 font-medium px-1.5 py-0.5 bg-primary-100 dark:bg-primary-900/50 rounded ml-2">Active</span>
                            )}
                        </div>
                        <button onClick={() => handleRemoveHuggingFaceKey(key)} className="text-red-500 dark:text-red-400 hover:text-red-600 dark:hover:text-red-300 text-xs flex-shrink-0" aria-label={`Remove API key ending in ${key.slice(-4)}`}>
                           <i className="fa-solid fa-trash-can mr-1" aria-hidden="true"></i> Remove
                        </button>
                      </div>
                    ))}
                  </div>
                  <div className="flex items-center gap-2 mt-3">
                    <label htmlFor="add-huggingface-key-input" className="sr-only">Add a new Hugging Face API key</label>
                    <input
                      id="add-huggingface-key-input"
                      type="password"
                      placeholder="Add a new Hugging Face key"
                      value={newHuggingFaceKey}
                      onChange={(e) => setNewHuggingFaceKey(e.currentTarget.value)}
                      className="flex-1 w-full bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white px-3 py-2 rounded-md border border-gray-300 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-primary-500"
                      aria-labelledby="huggingface-keys-label"
                    />
                    <button onClick={handleAddHuggingFaceKey} className="px-3 py-2 bg-gray-200 dark:bg-gray-600 text-gray-800 dark:text-white rounded-md hover:bg-gray-300 dark:hover:bg-gray-500 transition-colors" aria-label="Add new API key">
                      <i className="fa-solid fa-plus" aria-hidden="true"></i> Add
                    </button>
                  </div>
                </div>
              </div>
            )}

            <div className="flex justify-end items-center gap-3 pt-2">
                {showSaved && <span className="text-sm text-green-500 dark:text-green-400 transition-opacity">Saved!</span>}
                <button
                    onClick={handleSave}
                    className="px-4 py-2 bg-primary-500 text-white rounded-md hover:bg-primary-600 transition-colors"
                >
                    Save AI Settings
                </button>
            </div>
          </div>
        </section>

        <section>
            <h3 className="text-lg font-semibold text-red-600 dark:text-red-500 mb-3">Danger Zone</h3>
            <div className="bg-white dark:bg-gray-800 rounded-lg p-4 flex justify-between items-center border border-gray-200 dark:border-gray-700 shadow-sm">
                <div>
                    <h4 className="font-semibold text-gray-900 dark:text-white">Clear All Data</h4>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">This will permanently delete all messages and skills.</p>
                </div>
                <button
                    onClick={onClearData}
                    className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
                >
                    Clear Data
                </button>
            </div>
        </section>
      </div>
    </div>
  );
};
