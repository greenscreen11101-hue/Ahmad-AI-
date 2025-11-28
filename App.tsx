
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Header } from './components/Header';
import { ChatWindow } from './components/ChatWindow';
import { InputBar } from './components/InputBar';
import { SettingsScreen } from './components/SettingsScreen';
import { UpgradeCenter } from './components/UpgradeCenter';
import { useLocalStorage } from './hooks/useLocalStorage';
import { useUndoableLocalStorage } from './hooks/useUndoableLocalStorage';
import { 
  getChatResponse, 
  learnNewSkill, 
  learnSkillFromUrl, 
  initiateSelfUpgrade, 
  proposeSkillFromHistory, 
  findAndPrepareSkillExecution, 
  generateOfflineCache, 
  createMemoryFromChat,
  detectSessionSwitch,
  fixSkillCode,
  analyzeUrlContent,
  performDeepResearch
} from './services/geminiService';
// Only pure CRUD operations remain in memoryService
import { executeSkillInSandbox } from './services/sandboxService';
// Session management imports
import { saveSession, createNewSessionId, getSessions, getSessionById } from './services/sessionService';

import type { Message, Skill, TaughtSkill, Theme, View, AISettings, OfflineCache, ChatSession } from './types';
import { SkillConfirmationModal } from './components/SkillConfirmationModal';
import { TeachScreen } from './components/TeachScreen';
import { MemoryBank } from './components/MemoryBank';
import { ConfirmationModal } from './components/ConfirmationModal';
import { HistoryView } from './components/HistoryView';

/**
 * Converts a media File object to a base64 encoded string.
 */
const fileToBase64 = (file: File): Promise<{ mimeType: string, data: string, name: string }> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const result = reader.result as string;
      const base64Data = result.split(',')[1];
      if (base64Data) {
        resolve({
          mimeType: file.type || 'application/octet-stream',
          data: base64Data,
          name: file.name
        });
      } else {
        reject(new Error(`Failed to read file "${file.name}" as base64.`));
      }
    };
    reader.onerror = (error) => reject(error);
  });
};

/**
 * Reads any file as a plain text string.
 */
const readFileAsText = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsText(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (error) => reject(error);
  });
};

/**
 * Main application component for Ahmad AI.
 */
const App: React.FC = () => {
  // --- STATE MANAGEMENT ---
  const [theme, setTheme] = useLocalStorage<Theme>('theme', 'dark');
  const [view, setView] = useState<View>('chat');
  
  // Current Session ID
  const [currentSessionId, setCurrentSessionId] = useLocalStorage<string>('currentSessionId', createNewSessionId);

  const {
    state: messages,
    setState: setMessages,
    resetState: resetMessages,
    undo: undoMessage,
    redo: redoMessage,
    canUndo: canUndoMessage,
    canRedo: canRedoMessage,
  } = useUndoableLocalStorage<Message[]>('chatHistory', []);
  
  const [skills, setSkills] = useLocalStorage<Skill[]>('learnedSkills', []);
  const [taughtSkills, setTaughtSkills] = useLocalStorage<TaughtSkill[]>('taughtSkills', []);
  const [offlineCache, setOfflineCache] = useLocalStorage<OfflineCache>('offlineCache', {});
  const [isLoading, setIsLoading] = useState(false);
  const [streamingMessage, setStreamingMessage] = useState<Message | null>(null);
  const [newSkill, setNewSkill] = useState<Skill | null>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [chatKey, setChatKey] = useState(Date.now()); // State to force re-mounting of ChatWindow
  const [searchQuery, setSearchQuery] = useState('');
  const [confirmation, setConfirmation] = useState({
    isOpen: false,
    title: '',
    message: '',
    confirmText: 'Confirm',
    onConfirm: () => {},
  });

  const [aiSettings, setAiSettings] = useLocalStorage<AISettings>('aiSettings', {
    provider: 'gemini',
    openRouterApiKeys: [],
    openRouterKeyIndex: 0,
    huggingFaceApiKeys: [],
    huggingFaceKeyIndex: 0,
    isComplexTaskMode: false,
  });

  // Ensure new fields exist for users with old localStorage data
  useEffect(() => {
    setAiSettings(prev => ({
        ...prev,
        huggingFaceApiKeys: prev.huggingFaceApiKeys || [],
        huggingFaceKeyIndex: prev.huggingFaceKeyIndex || 0
    }));
  }, [setAiSettings]);
  
  const isMounted = useRef(true);
  const isLearning = useRef(false);

  // --- LIFECYCLE & EFFECT HOOKS ---
  useEffect(() => {
    isMounted.current = true;
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      isMounted.current = false;
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // --- DARK MODE LOGIC (Robust Fix) ---
  useEffect(() => {
    const root = window.document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
      root.style.colorScheme = 'dark';
    } else {
      root.classList.remove('dark');
      root.style.colorScheme = 'light';
    }
  }, [theme]);
  
  const toggleTheme = useCallback(() => {
    setTheme(prev => prev === 'dark' ? 'light' : 'dark');
  }, [setTheme]);
  
  // --- SESSION AUTO-SAVE ---
  useEffect(() => {
    // Whenever messages change, save the session to the sidebar list
    if (messages.length > 0) {
        saveSession(currentSessionId, messages);
    }
  }, [messages, currentSessionId]);

  // --- CORE HELPER FUNCTIONS ---
  const addAiMessage = useCallback((text: string, isStreaming = false) => {
    const message: Message = {
      id: Date.now() + Math.random(),
      text,
      sender: 'ai',
    };
    if (isStreaming) {
      setStreamingMessage(message);
    } else {
      setMessages(prev => [...prev, message]);
    }
  }, [setMessages]);

  const rotateKey = useCallback(() => {
    if (aiSettings.provider === 'openrouter' && aiSettings.openRouterApiKeys.length > 0) {
      setAiSettings(prev => ({
        ...prev,
        openRouterKeyIndex: (prev.openRouterKeyIndex + 1) % prev.openRouterApiKeys.length,
      }));
    } else if (aiSettings.provider === 'huggingface' && aiSettings.huggingFaceApiKeys.length > 0) {
        setAiSettings(prev => ({
            ...prev,
            huggingFaceKeyIndex: (prev.huggingFaceKeyIndex + 1) % prev.huggingFaceApiKeys.length,
        }));
    }
  }, [aiSettings, setAiSettings]);

  // --- AUTOMATIC LEARNING ---
  useEffect(() => {
    const lastMessage = messages.length > 0 ? messages[messages.length - 1] : null;

    // Trigger analysis only after a user message, when idle, and not already learning.
    if (!lastMessage || lastMessage.sender !== 'user' || isLoading || isLearning.current) {
        return;
    }
    
    // This function encapsulates the learning logic.
    const performAutomaticLearning = async () => {
        isLearning.current = true;
        const recentHistory = messages.slice(-15);
        try {
            // The service will analyze the content and decide if a skill is genuinely needed.
            // It will return null if no good opportunity is found.
            const newSkillProposal = await proposeSkillFromHistory(recentHistory, skills, taughtSkills, aiSettings);
            rotateKey(); // We made an API call, so rotate the key.
            
            // Only proceed if a valid skill was proposed by the analysis.
            if (newSkillProposal && isMounted.current) {
                addAiMessage("Based on our conversation, I'm analyzing our chat to see if I can learn a new skill...");
                setNewSkill(newSkillProposal);
            }
        } catch (error) {
            console.error("Error during automatic learning analysis:", error);
            // Silently fail, as this is a background enhancement.
        } finally {
            if (isMounted.current) {
                isLearning.current = false;
            }
        }
    };

    // Use a timeout to avoid triggering on every keystroke if the user sends messages rapidly.
    const learningTimer = setTimeout(performAutomaticLearning, 3000); // Wait 3s after the user's last message

    return () => clearTimeout(learningTimer);

  }, [messages, skills, taughtSkills, aiSettings, isLoading, addAiMessage, rotateKey]);

  // --- OFFLINE MODE HANDLER ---
  const handleOfflineResponse = (query: string) => {
    addAiMessage(`I'm currently offline, but I'll check my local knowledge base for: "${query}"...`);

    const lowerQuery = query.toLowerCase();
    
    // 1. Search the structured cache for relevant keys.
    const cacheKeys = Object.keys(offlineCache);
    const matchingCacheKeys = cacheKeys.filter(key => 
      key.toLowerCase().includes(lowerQuery) || lowerQuery.includes(key.toLowerCase())
    );
    
    let responseText = "";

    if (matchingCacheKeys.length > 0) {
        responseText += "Based on my summarized knowledge, here's what I found:\n\n";
        responseText += matchingCacheKeys.map(key => `**Topic: ${key}**\n${offlineCache[key]}`).join('\n\n');
    }

    // 2. Search raw message history for keyword matches.
    const historyResults = messages.filter(m => m.type !== 'separator' && m.text.toLowerCase().includes(lowerQuery));

    if (historyResults.length > 0) {
        const uniqueResults = historyResults.filter(r => !Object.values(offlineCache).some(val => val.includes(r.text.slice(0, 50))));
        if (uniqueResults.length > 0) {
            responseText += responseText ? "\n\n---\n\n" : ""; 
            responseText += "I also found these related messages in our full chat history:\n\n";
            responseText += uniqueResults.slice(0, 5).map(r => `**${r.sender === 'user' ? 'You' : 'Ahmad AI'} said:**\n> ${r.text.split('\n').join('\n> ')}`).join('\n\n');
        }
    }
    
    if (responseText) {
        addAiMessage(responseText);
    } else {
        addAiMessage(`I couldn't find any information related to "${query}" in my local memory. Please connect to the internet for my full capabilities.`);
    }
  };

  // --- CORE AI HANDLERS ---
  const handleSelfUpgrade = useCallback(async () => {
    addAiMessage("Initiating self-upgrade analysis... This may take a moment.");
    setIsLoading(true);

    try {
        const newSkillProposal = await initiateSelfUpgrade(skills, taughtSkills, aiSettings);
        rotateKey();
        if (isMounted.current) setNewSkill(newSkillProposal);
    } catch (error) {
        console.error("Error during self-upgrade:", error);
        if (isMounted.current) addAiMessage(`I encountered an error during the self-upgrade process: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
        if (isMounted.current) setIsLoading(false);
    }
  }, [skills, taughtSkills, aiSettings, addAiMessage, rotateKey]);
  
  const handleSend = useCallback(async (text: string, filesToSend: File[]) => {
    if (!text.trim() && filesToSend.length === 0) return;

    // 1. Add User Message
    const userMessage: Message = {
      id: Date.now(),
      text,
      sender: 'user',
      attachments: filesToSend.map(f => ({ name: f.name, type: f.type })),
    };
    setMessages(prev => [...prev, userMessage]);
    setFiles([]);
    setIsLoading(true);
    setStreamingMessage(null);
    
    // --- OFFLINE LOGIC ---
    if (!isOnline) {
        handleOfflineResponse(text);
        setIsLoading(false);
        return;
    }
    
    // --- SESSION SWITCHING LOGIC (SMART CONTEXT) ---
    // Optimization: Only run detection on messages with sufficient length or keywords
    const switchingKeywords = ['switch', 'resume', 'back to', 'project', 'conversation', 'topic', 'previous'];
    const shouldCheckSwitch = text.split(' ').length > 3 || switchingKeywords.some(k => text.toLowerCase().includes(k));

    if (filesToSend.length === 0 && shouldCheckSwitch) {
        try {
            const availableSessions = getSessions();
            if (availableSessions.length > 1) {
                const targetSessionId = await detectSessionSwitch(text, availableSessions, aiSettings);
                
                if (targetSessionId && targetSessionId !== currentSessionId) {
                    const targetSession = getSessionById(targetSessionId);
                    if (targetSession) {
                        addAiMessage(`I understand. Switching context to your previous conversation about "**${targetSession.title}**"...`);
                        
                        setTimeout(() => {
                            setCurrentSessionId(targetSessionId);
                            setMessages(targetSession.messages);
                            setIsLoading(false); 
                        }, 1500); 
                        return; 
                    }
                }
            }
        } catch (err) {
            console.error("Session detection failed", err);
        }
    }

    
    // --- SPECIAL COMMANDS ---
    if (text.toLowerCase().trim() === 'upgrade yourself') {
        await handleSelfUpgrade(); 
        return;
    }

    // --- SKILL EXECUTION ATTEMPT (Text-only prompts) ---
    if (filesToSend.length === 0 && text.trim()) {
        const executionPlan = await findAndPrepareSkillExecution(text, skills, aiSettings);
        rotateKey();

        if (executionPlan) {
            addAiMessage(`I've identified that you want to use the \`${executionPlan.skillName}\` skill. Attempting to execute it now...`);
            
            try {
                const result = await executeSkillInSandbox(executionPlan.code, executionPlan.args);
                let resultString = (typeof result === 'object' || Array.isArray(result)) ? JSON.stringify(result, null, 2) : String(result);
                addAiMessage(`✅ **Skill Executed: \`${executionPlan.skillName}\`**\n\nI have successfully run the skill.\n\n**Result:**\n\`\`\`\n${resultString}\n\`\`\``);
            } catch (error) {
                // --- SELF HEALING (AUTO FIX) LOGIC ---
                const errorMessage = error instanceof Error ? error.message : String(error);
                addAiMessage(`⚠️ **Skill Error Detected: \`${executionPlan.skillName}\`**\n\nAttempting Self-Healing protocols to fix the code...`);
                
                try {
                    // 1. Ask AI to fix code
                    const fixedCode = await fixSkillCode(executionPlan.code, errorMessage, aiSettings);
                    
                    // 2. Update local storage with fixed skill
                    setSkills(prevSkills => prevSkills.map(s => 
                        s.name === executionPlan.skillName ? { ...s, code: fixedCode } : s
                    ));

                    // 3. Retry execution
                    const retryResult = await executeSkillInSandbox(fixedCode, executionPlan.args);
                    let retryResultString = (typeof retryResult === 'object' || Array.isArray(retryResult)) ? JSON.stringify(retryResult, null, 2) : String(retryResult);
                    
                    addAiMessage(`✅ **Self-Healing Successful!**\n\nI fixed the bug in \`${executionPlan.skillName}\` and re-ran it.\n\n**Result:**\n\`\`\`\n${retryResultString}\n\`\`\``);

                } catch (retryError) {
                    addAiMessage(`❌ **Self-Healing Failed**\n\nI tried to fix the skill but it failed again.\nError: ${retryError instanceof Error ? retryError.message : String(retryError)}`);
                }
            } finally {
                if (isMounted.current) setIsLoading(false);
            }
            return; 
        }
    }

    // --- MAIN AI RESPONSE BLOCK ---
    try {
        const urlRegex = /(https?:\/\/[^\s]+)/;
        const learnRegex = /learn|سیکھو/i;
        const analyzeRegex = /analyze|check|summary|read|what is in|report|research|دیکھو|تجزیہ/i;
        const urlMatch = text.match(urlRegex);

        // CASE 1: Learn Skill from URL
        if (urlMatch && learnRegex.test(text) && filesToSend.length === 0) {
            addAiMessage(`Okay, I'm analyzing the link you provided to see if I can learn a new skill from it. Please wait...`);
            const newSkill = await learnSkillFromUrl(text, aiSettings);
            rotateKey();
            if (isMounted.current) {
                setNewSkill(newSkill);
            }
            setIsLoading(false);
            return; 
        }

        // CASE 2: Analyze URL Content (Specific Link)
        if (urlMatch && analyzeRegex.test(text) && !learnRegex.test(text) && filesToSend.length === 0) {
            const url = urlMatch[0];
            addAiMessage(`I am accessing the web content to analyze this link: ${url} ...`);
            
            const analysis = await analyzeUrlContent(url, aiSettings);
            rotateKey();
            
            if (isMounted.current) {
                addAiMessage(analysis);
            }
            setIsLoading(false);
            return;
        }

        // CASE 3: Deep Research (Topic Analysis - No URL)
        if (!urlMatch && analyzeRegex.test(text) && !learnRegex.test(text) && filesToSend.length === 0) {
            const topic = text.replace(analyzeRegex, '').trim();
            if (topic.length > 2) {
                addAiMessage(`Initiating Deep Research on: "**${topic}**"...\n\nI am scanning multiple sources, reviews, and articles to generate a comprehensive report.`);
                
                const report = await performDeepResearch(topic, aiSettings);
                rotateKey();
                
                if (isMounted.current) {
                    addAiMessage(report);
                }
                setIsLoading(false);
                return;
            }
        }
      
      // --- GENERAL CHAT / FILE PROCESSING ---
      let processedTextContent = '';
      const mediaFilesForApi: { mimeType: string; data: string }[] = [];
      const textFileExtensions = /\.(txt|js|jsx|ts|tsx|py|rb|java|c|cpp|h|hpp|html|css|scss|json|md|xml|yaml|yml|sh|ps1)$/i;

      for (const file of filesToSend) {
        try {
          const lowerCaseName = file.name.toLowerCase();
          if (lowerCaseName.endsWith('.zip')) {
             addAiMessage(`Analyzing ZIP file: ${file.name}...`);
             const jszip = new (window as any).JSZip();
             const zip = await jszip.loadAsync(file);
             let zipContent = `\n--- START OF ZIP FILE ANALYSIS: ${file.name} ---\n`;
             for (const filename in zip.files) {
               if (!zip.files[filename].dir) {
                  const content = await zip.files[filename].async('string');
                  zipContent += `--- START OF FILE: ${filename} ---\n${content}\n--- END OF FILE: ${filename} ---\n\n`;
               }
             }
             zipContent += `--- END OF ZIP FILE ANALYSIS: ${file.name} ---\n`;
             processedTextContent += zipContent;
          } else if (textFileExtensions.test(lowerCaseName) || file.type.startsWith('text/')) {
             const content = await readFileAsText(file);
             processedTextContent += `\n--- START OF FILE: ${file.name} ---\n${content}\n--- END OF FILE: ${file.name} ---\n\n`;
          } else if (file.type && (file.type.startsWith('image/') || file.type.startsWith('video/') || file.type === 'application/pdf')) {
             const { mimeType, data } = await fileToBase64(file);
             mediaFilesForApi.push({ mimeType, data });
          } else {
             addAiMessage(`I can't directly process the content of the file: **${file.name}**. For code, please use standard text formats or ZIP archives.`);
          }
        } catch (fileError) {
          console.error(`Error processing file ${file.name}:`, fileError);
          addAiMessage(`I failed to process "${file.name}". It might be corrupt or in an unsupported format. I will skip it.`);
        }
      }
      
      const finalPrompt = processedTextContent ? `${text}\n\n${processedTextContent}`.trim() : text;
      
      const lastSeparatorIndex = messages.map(m => m.type).lastIndexOf('separator');
      const historyForApi = lastSeparatorIndex > -1 ? messages.slice(lastSeparatorIndex + 1) : messages;

      if (!finalPrompt && mediaFilesForApi.length === 0) {
          setIsLoading(false);
          return;
      }
      
      if ((text.toLowerCase().startsWith('ahmad, learn') || text.toLowerCase().startsWith('learn how to')) && filesToSend.length === 0) {
        const skill = await learnNewSkill(text, aiSettings);
        rotateKey();
        if (isMounted.current) setNewSkill(skill);
      } else {
        const streamMessageId = Date.now();
        let accumulatedResponse = "";
        let finalResponseText = "";
        
        if ((aiSettings.provider === 'hybrid' || aiSettings.isComplexTaskMode) && filesToSend.length === 0 && aiSettings.provider !== 'huggingface') {
             addAiMessage("Unified Intelligence Active: Querying connected models (Gemini, OpenRouter, Hugging Face) to synthesize the best response...");
        }

        const response = await getChatResponse(
            finalPrompt,
            historyForApi,
            aiSettings,
            mediaFilesForApi,
            (chunk: string) => {
                if (!isMounted.current) return;
                accumulatedResponse += chunk;
                setStreamingMessage({
                    id: streamMessageId,
                    text: accumulatedResponse,
                    sender: 'ai'
                });
            }
        );
        
        finalResponseText = response.text;
        rotateKey();

        if (isMounted.current && finalResponseText) {
            const finalMessage: Message = {
                id: streamMessageId,
                text: finalResponseText,
                sender: 'ai',
            };
            setMessages(prev => [...prev, finalMessage]);
        }
      }
    } catch (error) {
      console.error("Error processing request:", error);
      if (isMounted.current) addAiMessage(`Sorry, I encountered an error: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      if (isMounted.current) {
        setIsLoading(false);
        setStreamingMessage(null);
      }
    }
  }, [messages, aiSettings, isOnline, handleSelfUpgrade, rotateKey, addAiMessage, skills, taughtSkills, setMessages, offlineCache, streamingMessage, currentSessionId, setCurrentSessionId]);

  // --- CONTEXT MENU HANDLERS ---
  const handleDeleteMessage = useCallback((messageId: number) => {
    setMessages(prev => prev.filter(m => m.id !== messageId));
  }, [setMessages]);

  const handleRateMessage = useCallback((messageId: number, rating: 'up' | 'down') => {
    setMessages(prev => prev.map(msg => {
        if (msg.id === messageId) {
            const newRating = msg.rating === rating ? undefined : rating;
            return { ...msg, rating: newRating };
        }
        return msg;
    }));
  }, [setMessages]);

  const handleRegenerateResponse = useCallback(async () => {
    const lastMessage = messages[messages.length - 1];
    const secondLastMessage = messages[messages.length - 2];
    
    if (messages.length < 2 || lastMessage.sender !== 'ai' || secondLastMessage.sender !== 'user') {
        addAiMessage("I can only regenerate my most recent response to your last prompt.");
        return;
    }

    setMessages(prev => prev.slice(0, -1));

    setTimeout(() => {
        handleSend(secondLastMessage.text, []); 
    }, 100);

  }, [messages, setMessages, addAiMessage, handleSend]);
  
  // --- SKILL MANAGEMENT ---
  const handleSkillConfirm = () => {
    if (newSkill) {
      setSkills(prev => [...prev, newSkill]);
      addAiMessage(`I have learned a new skill: "${newSkill.name}". You can view it in the Upgrade Center.`);
      setNewSkill(null);
    }
  };

  const handleSkillCancel = () => {
    setNewSkill(null);
    addAiMessage("Okay, I won't add that skill for now.");
  };

  const handleSaveTaughtSkill = (skillData: Omit<TaughtSkill, 'id' | 'timestamp'>) => {
      const newTaughtSkill: TaughtSkill = { ...skillData, id: `ts-${Date.now()}`, timestamp: new Date().toISOString() };
      setTaughtSkills(prev => [...prev, newTaughtSkill]);
      addAiMessage(`Thank you for teaching me! I've saved the new skill specification for "${skillData.name}".`);
      setView('chat');
  };
  
  // --- UI & DATA MANAGEMENT ---
  const updateOfflineCache = useCallback(async () => {
    const lastSeparatorIndex = messages.map(m => m.type).lastIndexOf('separator');
    const conversationToCache = messages.slice(lastSeparatorIndex + 1);

    if (conversationToCache.length > 1) { 
        try {
          const newCacheData = await generateOfflineCache(conversationToCache, aiSettings);
          if (newCacheData && Object.keys(newCacheData).length > 0) {
              setOfflineCache(prevCache => ({ ...prevCache, ...newCacheData }));
          }

          const newMemory = await createMemoryFromChat(conversationToCache, aiSettings);
          if (newMemory) {
              console.log("New Long-Term Memory created:", newMemory.title);
          }

        } catch (error) {
           console.error("Background memory generation failed:", error);
        }
    }
  }, [messages, aiSettings, setOfflineCache]);

  const processAndCachePreviousTopic = useCallback(async () => {
    const lastSeparatorIndex = messages.map(m => m.type).lastIndexOf('separator');
    const conversationToCache = messages.slice(lastSeparatorIndex + 1);
    
    if (conversationToCache.length <= 1) {
        return;
    }

    await updateOfflineCache();

  }, [messages, updateOfflineCache]);

  const handleNewChatRequest = () => {
    processAndCachePreviousTopic();
    const newSessionId = createNewSessionId();
    setCurrentSessionId(newSessionId);
    resetMessages([]);
    isLearning.current = false;
    setChatKey(Date.now());
    setView('chat');
  };
  
  const handleSessionSelect = (session: ChatSession) => {
      setCurrentSessionId(session.id);
      setMessages(session.messages);
      setView('chat');
  };

  const handleClearDataRequest = useCallback(() => {
    setConfirmation({
      isOpen: true,
      title: 'DANGER: Clear All Data',
      message: 'This will permanently delete all chat history, learned skills, taught skills, and the offline knowledge base. Are you absolutely sure?',
      confirmText: 'Clear All Data',
      onConfirm: () => {
        resetMessages([]);
        setSkills([]);
        setTaughtSkills([]);
        setOfflineCache({});
        localStorage.removeItem('ahmad_ai_long_term_memory'); 
        localStorage.removeItem('ahmad_ai_chat_sessions');
        setChatKey(Date.now());
        setSearchQuery('');
        setView('chat');
        setConfirmation({ ...confirmation, isOpen: false });
      }
    });
  }, [resetMessages, setSkills, setTaughtSkills, setOfflineCache, confirmation]);

  const handleCancelConfirmation = () => {
    setConfirmation({ ...confirmation, isOpen: false });
  };

  const renderContent = () => {
    switch (view) {
      case 'settings':
        return <SettingsScreen
                  theme={theme}
                  setTheme={setTheme}
                  aiSettings={aiSettings}
                  setAiSettings={setAiSettings}
                  onClearData={handleClearDataRequest}
                />;
      case 'upgrades':
        return <UpgradeCenter skills={skills} taughtSkills={taughtSkills} />;
      case 'teach':
        return <TeachScreen onSaveSkill={handleSaveTaughtSkill} />;
      case 'memory':
        return <MemoryBank />;
      case 'history':
        return <HistoryView onSelectSession={handleSessionSelect} />;
      case 'chat':
      default:
        return (
          <>
            <ChatWindow
              key={chatKey}
              messages={messages}
              isLoading={isLoading}
              searchQuery={searchQuery}
              streamingMessage={streamingMessage}
              onDeleteMessage={handleDeleteMessage}
              onRegenerateResponse={handleRegenerateResponse}
              onRateMessage={handleRateMessage}
            />
            <InputBar 
              onSend={handleSend} 
              isLoading={isLoading}
              isOnline={isOnline}
              files={files}
              onFilesChange={setFiles}
             />
          </>
        );
    }
  };

  return (
    <div className="flex flex-col h-[100dvh] bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-200 font-sans transition-colors duration-200">
      <Header
        currentView={view}
        setView={setView}
        onNewChat={handleNewChatRequest}
        isOnline={isOnline}
        onSearch={setSearchQuery}
        onUndo={undoMessage}
        onRedo={redoMessage}
        canUndo={canUndoMessage}
        canRedo={canRedoMessage}
        theme={theme}
        toggleTheme={toggleTheme}
      />
      <main className="flex-1 flex flex-col overflow-hidden">
        {renderContent()}
      </main>
      {newSkill && (
        <SkillConfirmationModal 
          skill={newSkill} 
          onConfirm={handleSkillConfirm} 
          onCancel={handleSkillCancel} 
        />
      )}
      <ConfirmationModal
        isOpen={confirmation.isOpen}
        title={confirmation.title}
        message={confirmation.message}
        confirmText={confirmation.confirmText}
        onConfirm={confirmation.onConfirm}
        onCancel={handleCancelConfirmation}
      />
    </div>
  );
};

export default App;
