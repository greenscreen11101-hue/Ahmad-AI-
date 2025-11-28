
import { GoogleGenAI, Type } from "@google/genai";
import type { Message, Skill, TaughtSkill, AISettings, ExecutionPlan, OfflineCache, Memory, ChatSession } from '../types';
import { getMemories, addMemory, offlineMemorySearch } from './memoryService';

// Initialize Gemini Client
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });

// --- DYNAMIC CACHE ---
let cachedOpenRouterModels: string[] = [];
let cachedHuggingFaceModels: string[] = [];
let lastDiscoveryTime = 0;
const CACHE_DURATION = 1000 * 60 * 60; 

// --- SAFETY FALLBACKS ---
const SAFETY_FALLBACK_OPENROUTER = [
    'deepseek/deepseek-r1:free',
    'google/gemini-2.0-flash-lite-preview-02-05:free',
    'meta-llama/llama-3.3-70b-instruct:free',
    'mistralai/mistral-7b-instruct:free',
    'microsoft/phi-3-medium-128k-instruct:free',
];

const SAFETY_FALLBACK_HF = [
    "HuggingFaceH4/zephyr-7b-beta",
    "mistralai/Mistral-7B-Instruct-v0.3"
];

// --- HELPER FUNCTIONS ---

const getOpenRouterKeys = (settings: AISettings): string[] => {
    if (!settings.openRouterApiKeys || settings.openRouterApiKeys.length === 0) return [];
    return settings.openRouterApiKeys;
}

const getHuggingFaceKeys = (settings: AISettings): string[] => {
    if (!settings.huggingFaceApiKeys || settings.huggingFaceApiKeys.length === 0) return [];
    return settings.huggingFaceApiKeys;
}

const sanitizeAndParseJson = (text: string): any => {
    try { 
        return JSON.parse(text); 
    } catch (e) {}

    // Improved Regex to catch JSON inside markdown blocks, even if nested
    const codeBlockMatch = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    if (codeBlockMatch) {
        try { 
            return JSON.parse(codeBlockMatch[1]); 
        } catch (e) {}
    }

    // Heuristic: Find the first { and last } to extract JSON object
    const start = text.indexOf('{');
    const end = text.lastIndexOf('}');
    
    if (start !== -1 && end !== -1 && end > start) {
         try { 
             const extracted = text.substring(start, end + 1);
             return JSON.parse(extracted); 
         } catch (e) {
             console.error("JSON extraction heuristic failed:", e);
         }
    }
    
    // Fallback: Find array brackets [ ]
    const startArr = text.indexOf('[');
    const endArr = text.lastIndexOf(']');
    if (startArr !== -1 && endArr !== -1 && endArr > startArr) {
        try {
            const extracted = text.substring(startArr, endArr + 1);
            return JSON.parse(extracted);
        } catch (e) {}
    }

    throw new Error("Could not parse valid JSON from the AI response. Response might be malformed or plain text.");
}

// --- DYNAMIC DISCOVERY ENGINES ---

const discoverFreeOpenRouterModels = async (): Promise<string[]> => {
    try {
        console.log("Dynamic Discovery: Scanning OpenRouter for free models...");
        const response = await fetch("https://openrouter.ai/api/v1/models");
        const data = await response.json();

        if (!data.data) throw new Error("Invalid OpenRouter response");

        const freeModels = data.data.filter((model: any) => {
            const promptPrice = parseFloat(model.pricing?.prompt || "1");
            const completionPrice = parseFloat(model.pricing?.completion || "1");
            return promptPrice === 0 && completionPrice === 0;
        });

        const sortedModels = freeModels.sort((a: any, b: any) => {
            const getScore = (m: any) => {
                let score = 0;
                const id = m.id.toLowerCase();
                if (id.includes('deepseek-r1')) score += 15; 
                if (id.includes('llama-3')) score += 10;
                if (id.includes('mistral')) score += 8;
                if (id.includes('gemini')) score += 8;
                if (id.includes('70b')) score += 5; 
                if (id.includes('free')) score += 1;
                return score;
            };
            return getScore(b) - getScore(a);
        });

        const modelIds = sortedModels.map((m: any) => m.id);
        console.log(`Discovery Complete: Found ${modelIds.length} free OpenRouter models.`);
        return modelIds.length > 0 ? modelIds : SAFETY_FALLBACK_OPENROUTER;

    } catch (error) {
        console.warn("OpenRouter Discovery failed, using fallback:", error);
        return SAFETY_FALLBACK_OPENROUTER;
    }
};

const discoverTrendingHFModels = async (): Promise<string[]> => {
    try {
        console.log("Dynamic Discovery: Scanning Hugging Face for trending models...");
        const response = await fetch("https://huggingface.co/api/models?pipeline_tag=text-generation&sort=downloads&direction=-1&limit=20");
        const data = await response.json();

        if (!Array.isArray(data)) throw new Error("Invalid HF response");

        const filtered = data.filter((model: any) => {
            const id = model.modelId.toLowerCase();
            return !id.includes("gemma-7b"); 
        });

        const modelIds = filtered.map((m: any) => m.modelId);
        const merged = [...new Set([...SAFETY_FALLBACK_HF, ...modelIds])];
        
        console.log(`Discovery Complete: Found ${merged.length} HF models.`);
        return merged;

    } catch (error) {
        console.warn("HF Discovery failed, using fallback:", error);
        return SAFETY_FALLBACK_HF;
    }
};

const refreshModelCache = async () => {
    const now = Date.now();
    if (now - lastDiscoveryTime > CACHE_DURATION || cachedOpenRouterModels.length === 0) {
        const [orModels, hfModels] = await Promise.all([
            discoverFreeOpenRouterModels(),
            discoverTrendingHFModels()
        ]);
        cachedOpenRouterModels = orModels;
        cachedHuggingFaceModels = hfModels;
        lastDiscoveryTime = now;
    }
};

const selectSwarmModels = (prompt: string, availableModels: string[]): string[] => {
    if (!availableModels || availableModels.length === 0) return SAFETY_FALLBACK_OPENROUTER.slice(0, 3);

    const lowerPrompt = prompt.toLowerCase();
    const isCoding = lowerPrompt.includes('code') || lowerPrompt.includes('function') || lowerPrompt.includes('script') || lowerPrompt.includes('html');
    const isReasoning = lowerPrompt.includes('why') || lowerPrompt.includes('explain') || lowerPrompt.includes('solve') || lowerPrompt.includes('think');
    
    const codingModels = availableModels.filter(m => m.includes('coder') || m.includes('deepseek') || m.includes('flash'));
    const reasoningModels = availableModels.filter(m => m.includes('r1') || m.includes('llama') || m.includes('mistral'));

    let selected: Set<string> = new Set();

    if (isCoding) {
        codingModels.slice(0, 2).forEach(m => selected.add(m));
    } else if (isReasoning) {
        reasoningModels.slice(0, 2).forEach(m => selected.add(m));
    }

    availableModels.filter(m => m.includes('llama-3')).slice(0, 1).forEach(m => selected.add(m));
    availableModels.filter(m => m.includes('gemini')).slice(0, 1).forEach(m => selected.add(m));
    availableModels.filter(m => m.includes('mistral')).slice(0, 1).forEach(m => selected.add(m));

    let count = 0;
    for (const m of availableModels) {
        if (selected.size >= 5) break;
        selected.add(m);
        count++;
    }
    
    return Array.from(selected).slice(0, 5);
};

// --- CORE PROVIDER IMPLEMENTATIONS ---

const callGemini = async (
    model: string, 
    contents: any[], 
    config: any,
    onChunk?: (chunk: string) => void
): Promise<{ text: string }> => {
    if (onChunk) {
        const stream = await ai.models.generateContentStream({ model, contents, config });
        let fullResponse = '';
        for await (const chunk of stream) {
            const text = chunk.text;
            if (text) {
                onChunk(text);
                fullResponse += text;
            }
        }
        return { text: fullResponse };
    } else {
        const response = await ai.models.generateContent({ model, contents, config });
        
        let groundingText = "";
        if (response.candidates?.[0]?.groundingMetadata?.groundingChunks) {
            const chunks = response.candidates[0].groundingMetadata.groundingChunks;
            const sources = chunks
                .filter((c: any) => c.web?.uri)
                .map((c: any) => `[${c.web.title}](${c.web.uri})`);
            
            if (sources.length > 0) {
                groundingText = `\n\n**Sources:**\n${[...new Set(sources)].join('\n')}`;
            }
        }

        return { text: (response.text || '') + groundingText };
    }
};

const callOpenRouter = async (
    messages: any[],
    apiKeys: string[],
    onChunk?: (chunk: string) => void,
    specificModel?: string 
): Promise<{ text: string }> => {
    
    if (cachedOpenRouterModels.length === 0) await refreshModelCache();

    let modelsToTry = specificModel ? [specificModel] : [...cachedOpenRouterModels];
    
    if (!specificModel) {
        const isCoding = messages.some((m: any) => m.content.includes('code') || m.content.includes('function'));
        if (isCoding) {
            modelsToTry.sort((a, b) => {
                const aCode = a.includes('coder') || a.includes('deepseek') ? 1 : 0;
                const bCode = b.includes('coder') || b.includes('deepseek') ? 1 : 0;
                return bCode - aCode;
            });
        }
    }

    let lastError;

    for (const modelName of modelsToTry) {
        for (const apiKey of apiKeys) {
            try {
                const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
                    method: "POST",
                    headers: {
                        "Authorization": `Bearer ${apiKey}`,
                        "Content-Type": "application/json",
                        "HTTP-Referer": "https://aistudio.google.com", 
                        "X-Title": "Ahmad AI", 
                    },
                    body: JSON.stringify({
                        model: modelName,
                        messages: messages,
                        stream: !!onChunk, 
                    })
                });

                if (!response.ok) {
                    if (response.status === 401 || response.status === 402 || response.status === 429) {
                         console.warn(`OpenRouter Key failed (${response.status}) for model ${modelName}.`);
                         continue; 
                    }
                    break; 
                }

                if (onChunk && response.body) {
                    const reader = response.body.getReader();
                    const decoder = new TextDecoder();
                    let fullResponse = '';
                    let buffer = '';

                    while (true) {
                        const { done, value } = await reader.read();
                        if (done) break;
                        buffer += decoder.decode(value, { stream: true });
                        const lines = buffer.split('\n');
                        buffer = lines.pop() || '';
                        for (const line of lines) {
                            if (line.startsWith('data: ')) {
                                const dataStr = line.substring(6);
                                if (dataStr.trim() === '[DONE]') continue;
                                try {
                                    const data = JSON.parse(dataStr);
                                    const chunk = data.choices[0]?.delta?.content;
                                    if (chunk) {
                                        onChunk(chunk);
                                        fullResponse += chunk;
                                    }
                                } catch (e) {}
                            }
                        }
                    }
                    return { text: fullResponse };
                } else {
                    const data = await response.json();
                    return { text: data.choices[0].message.content };
                }

            } catch (error) {
                lastError = error;
                continue;
            }
        }
    }

    throw new Error(`OpenRouter failed for model ${specificModel || 'auto'}. Last error: ${lastError}`);
};

const callHuggingFace = async (
    prompt: string, 
    apiKeys: string[],
    systemInstruction?: string
): Promise<{ text: string }> => {
    
    if (cachedHuggingFaceModels.length === 0) await refreshModelCache();

    const fullPrompt = systemInstruction 
        ? `<|system|>\n${systemInstruction}</s>\n<|user|>\n${prompt}</s>\n<|assistant|>` 
        : `<|user|>\n${prompt}</s>\n<|assistant|>`;

    let lastError;

    for (const model of cachedHuggingFaceModels) {
        for (const apiKey of apiKeys) {
            try {
                const response = await fetch(`https://api-inference.huggingface.co/models/${model}`, {
                    method: "POST",
                    headers: {
                        "Authorization": `Bearer ${apiKey}`,
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({ 
                        inputs: fullPrompt,
                        parameters: { 
                            max_new_tokens: 1024, 
                            temperature: 0.7,
                            return_full_text: false 
                        } 
                    })
                });

                if (!response.ok) {
                    if (response.status === 401 || response.status === 429) {
                        continue; 
                    }
                    break; 
                }

                const data = await response.json();
                
                // IMPORTANT FIX: If model is loading, do NOT break the loop. 
                // Treat it as an error so we try the next model.
                if (data.error && data.error.includes("loading")) {
                    console.warn(`HF Model ${model} is loading. Skipping...`);
                    throw new Error("Model loading");
                }

                let generatedText = Array.isArray(data) ? data[0].generated_text : (data.generated_text || "");
                if (typeof data === 'string') generatedText = data;

                if (!generatedText) throw new Error("Empty response");

                return { text: generatedText };

            } catch (error) {
                lastError = error;
            }
        }
    }

    throw new Error(`Hugging Face failed. Checked models with all keys. Last error: ${lastError}`);
};

const executeOpenRouterSwarm = async (
    prompt: string,
    history: Message[],
    settings: AISettings,
    onChunk?: (chunk: string) => void
): Promise<{ text: string }> => {
    
    const apiKeys = getOpenRouterKeys(settings);
    if (apiKeys.length === 0) throw new Error("Swarm mode requires OpenRouter Keys");

    await refreshModelCache();
    const swarmModels = selectSwarmModels(prompt, cachedOpenRouterModels);
    
    console.log(`Swarm Activated: Querying ${swarmModels.length} models: ${swarmModels.join(', ')}`);
    if (onChunk) onChunk(`🧠 **Swarm Activated**\nQuerying ${swarmModels.length} distinct AI models in parallel for maximum accuracy...\n\n`);

    const messages = [
        { role: 'system', content: "You are an expert AI. Answer the user's prompt accurately." },
        ...history.map(msg => ({ role: msg.sender === 'user' ? 'user' : 'assistant', content: msg.text })),
        { role: 'user', content: prompt }
    ];

    const promises = swarmModels.map(model => 
        callOpenRouter(messages, apiKeys, undefined, model)
            .then(res => ({ model, text: res.text, success: true }))
            .catch(err => ({ model, text: `Failed: ${err.message}`, success: false }))
    );

    const results = await Promise.all(promises);
    const successfulResponses = results.filter(r => r.success && r.text);

    if (successfulResponses.length === 0) {
        throw new Error("Swarm failed: All models returned errors.");
    }

    if (onChunk) onChunk(`\n✅ Received ${successfulResponses.length} responses. Synthesizing final answer...\n\n`);

    const synthesisPrompt = `
    You are a Super-Intelligence Consensus Engine.
    I have queried ${successfulResponses.length} different AI models about the following prompt: "${prompt}".
    
    Here are their responses:
    ${successfulResponses.map((r, i) => `--- MODEL ${i+1}: ${r.model} ---\n${r.text}`).join('\n\n')}
    
    TASK:
    1. Analyze all responses.
    2. Identify the most correct, detailed, and logical information.
    3. Resolve any conflicts between models using your own superior reasoning.
    4. Generate ONE perfect, comprehensive response that combines the strengths of all models.
    5. Do not explicitly mention "Model 1 said this", just give the final answer.
    `;

    return executeWithFallback({
        prompt: synthesisPrompt,
        history: [], 
        settings: { ...settings, isComplexTaskMode: false, provider: 'gemini' }, 
        systemInstruction: "You are the Chief Intelligence Synthesizer.",
        onChunk
    });
};


const executeWithFallback = async (
    params: {
        prompt: string,
        history: Message[],
        settings: AISettings,
        systemInstruction?: string,
        jsonMode?: boolean,
        files?: { mimeType: string; data: string }[],
        useTools?: boolean, 
        onChunk?: (chunk: string) => void
    }
): Promise<{ text: string }> => {
    const { prompt, history, settings, systemInstruction, jsonMode, files = [], useTools, onChunk } = params;
    
    refreshModelCache().catch(console.error);

    const hasOpenRouter = getOpenRouterKeys(settings).length > 0;
    if (settings.isComplexTaskMode && hasOpenRouter && files.length === 0 && !jsonMode) {
        try {
            return await executeOpenRouterSwarm(prompt, history, settings, onChunk);
        } catch (e) {
            console.warn("Swarm failed, falling back to standard singular model execution.", e);
        }
    }

    const providers = [];
    providers.push(settings.provider);
    if (settings.provider !== 'gemini') providers.push('gemini');
    
    const openRouterKeys = getOpenRouterKeys(settings);
    if (settings.provider !== 'openrouter' && openRouterKeys.length > 0) providers.push('openrouter');
    
    const hfKeys = getHuggingFaceKeys(settings);
    if (settings.provider !== 'huggingface' && hfKeys.length > 0) providers.push('huggingface');

    let lastError: any = null;

    for (const currentProvider of providers) {
        try {
            if (currentProvider === 'hybrid') {
                return await getMultiModelResponse(prompt, history, settings, onChunk || (() => {}));
            }

            if (currentProvider === 'gemini') {
                let model = 'gemini-2.5-flash'; 
                const config: any = { systemInstruction };

                if (settings.isComplexTaskMode) {
                    model = 'gemini-3-pro-preview';
                    config.thinkingConfig = { thinkingBudget: 32768 };
                } else if (files.length > 0) {
                     model = 'gemini-2.5-flash';
                }

                if (jsonMode) {
                    config.responseMimeType = "application/json";
                }
                
                if (useTools && !jsonMode) {
                     config.tools = [{ googleSearch: {} }];
                }

                const userParts: any[] = [{ text: prompt }];
                files.forEach(f => userParts.push({ inlineData: { mimeType: f.mimeType, data: f.data } }));
                
                const contents = [
                    ...history.map(msg => ({ role: msg.sender === 'user' ? 'user' : 'model', parts: [{ text: msg.text }] })),
                    { role: 'user', parts: userParts }
                ];

                return await callGemini(model, contents, config, onChunk);
            }

            if (currentProvider === 'openrouter') {
                const apiKeys = getOpenRouterKeys(settings);
                if (apiKeys.length === 0) throw new Error("No OpenRouter Keys");
                
                const messages = [
                    { role: 'system', content: systemInstruction || "You are a helpful AI assistant." },
                    ...history.map(msg => ({ role: msg.sender === 'user' ? 'user' : 'assistant', content: msg.text })),
                    { role: 'user', content: prompt }
                ];
                
                if (jsonMode) {
                    messages[messages.length - 1].content += "\n\nIMPORTANT: Respond with valid JSON only. Do not add Markdown blocks.";
                }

                return await callOpenRouter(messages, apiKeys, onChunk, undefined);
            }

            if (currentProvider === 'huggingface') {
                const apiKeys = getHuggingFaceKeys(settings);
                if (apiKeys.length === 0) throw new Error("No Hugging Face Keys");

                const promptWithContext = history.map(m => `${m.sender}: ${m.text}`).join('\n') + `\nUser: ${prompt}`;
                const finalPrompt = jsonMode ? `${promptWithContext}\n\nRespond with valid JSON only.` : promptWithContext;

                return await callHuggingFace(finalPrompt, apiKeys, systemInstruction);
            }

        } catch (error) {
            console.warn(`${currentProvider} failed:`, error);
            lastError = error;
        }
    }

    throw new Error(`All AI providers failed. Last error: ${lastError instanceof Error ? lastError.message : String(lastError)}`);
};

export const analyzeUrlContent = async (url: string, settings: AISettings): Promise<string> => {
    const systemInstruction = `You are a Web Content Analyst. 
    1. If the input is a URL, use your internal knowledge and search tools to understand its content.
    2. Provide a concise summary of what the page is about.
    3. List key points or topics covered.
    4. If it's a technical article, explain the concepts simply.
    5. Do NOT generate code unless asked. Focus on analysis.`;

    const prompt = `Analyze this URL: ${url}\n\nPlease summarize the content, identifying the main topic, author (if known), and key takeaways.`;

    const response = await executeWithFallback({
        prompt,
        history: [],
        settings: { ...settings, provider: 'gemini' }, 
        systemInstruction,
        useTools: true 
    });

    return response.text;
};

export const performDeepResearch = async (topic: string, settings: AISettings): Promise<string> => {
    const systemInstruction = `You are a Senior Market Research Analyst and Tech Reviewer.
    1. Perform deep research on the provided topic/product.
    2. Look for the latest articles, reviews, specifications, and user sentiment.
    3. Synthesize multiple sources into a comprehensive report.
    4. Structure the report with: Executive Summary, Key Features/Facts, Pros & Cons, Market Sentiment, and Conclusion.
    5. Be objective and factual.
    `;

    const prompt = `Conduct a comprehensive analysis and report on: "${topic}".
    Find recent information, compare it with competitors if relevant, and analyze the general public/expert consensus.`;

    const response = await executeWithFallback({
        prompt,
        history: [],
        settings: { ...settings, provider: 'gemini' }, 
        systemInstruction,
        useTools: true
    });

    return response.text;
};

export const detectSessionSwitch = async (
    userPrompt: string, 
    sessions: ChatSession[], 
    settings: AISettings
): Promise<string | null> => {
    if (sessions.length === 0) return null;

    const sessionSummaries = sessions.map(s => ({
        id: s.id,
        title: s.title,
        lastMessage: s.messages[s.messages.length - 1]?.text?.slice(0, 50)
    }));

    const systemInstruction = `
    Session Manager.
    User Prompt: "${userPrompt}".
    Available Sessions: ${JSON.stringify(sessionSummaries)}.
    
    Does the user explicitly want to switch to or resume one of these specific sessions?
    If yes, return JSON { "switch": true, "sessionId": "..." }.
    If they are just asking a question or starting a generic new topic, return { "switch": false }.
    Only switch if the intent is clear (e.g., "back to the project about...", "continue the python code").
    `;

    try {
        const response = await executeWithFallback({
            prompt: "Analyze intent.",
            history: [],
            settings,
            systemInstruction,
            jsonMode: true
        });

        const result = sanitizeAndParseJson(response.text);
        if (result.switch && result.sessionId) {
            return result.sessionId;
        }
        return null;
    } catch (e) {
        console.warn("Session detect failed", e);
        return null;
    }
};

export const retrieveRelevantMemories = async (query: string, settings: AISettings): Promise<string[]> => {
    const memories = getMemories();
    if (memories.length === 0) return [];

    const memoryIndex = memories.map(m => ({
        id: m.id,
        title: m.title,
        tags: m.tags.join(', ')
    }));

    const systemInstruction = `Semantic Memory Retriever. Return JSON array of relevant IDs: ["id1"].`;

    try {
        const response = await executeWithFallback({
            prompt: `Query: "${query}"\nMemories: ${JSON.stringify(memoryIndex)}\nReturn JSON array.`,
            history: [],
            settings,
            systemInstruction,
            jsonMode: true
        });

        const relevantIds: string[] = sanitizeAndParseJson(response.text);
        return memories.filter(m => relevantIds.includes(m.id)).map(m => `[Memory: ${m.title}]\n${m.content}`);
    } catch (error) {
        return offlineMemorySearch(query, memories);
    }
};

export const getChatResponse = async (
    prompt: string, 
    history: Message[], 
    settings: AISettings,
    files: { mimeType: string; data: string }[] = [],
    onChunk?: (chunk: string) => void,
    onModelSelect?: (modelName: string) => void
): Promise<{ text: string }> => {

    let memoryContext = "";
    try {
        if (files.length === 0) {
            const relevantMemories = await retrieveRelevantMemories(prompt, settings);
            if (relevantMemories.length > 0) {
                memoryContext = `\n\n[LONG-TERM MEMORY CONTEXT]:\n${relevantMemories.join('\n')}\n`;
            }
        }
    } catch (e) {}

    const finalPrompt = memoryContext ? `${memoryContext}\n${prompt}` : prompt;
    const systemInstruction = "You are Ahmad AI, an expert software engineer and helpful personal assistant. Respond in Markdown.";

    return executeWithFallback({
        prompt: finalPrompt,
        history,
        settings,
        systemInstruction,
        files,
        onChunk
    });
};

export const getMultiModelResponse = async (
    prompt: string,
    history: Message[],
    settings: AISettings,
    onChunk: (chunk: string) => void
): Promise<{ text: string }> => {
    
    await refreshModelCache();

    if ((!settings.openRouterApiKeys?.length) && (!settings.huggingFaceApiKeys?.length)) {
        return getChatResponse(prompt, history, { ...settings, provider: 'gemini' }, [], onChunk);
    }

    console.log("Hybrid Mode: Synthesizing multiple models...");

    const promises: Promise<{ text: string, source: string } | null>[] = [];
    
    promises.push(
        callGemini('gemini-2.5-pro', [{role:'user', parts:[{text: prompt}]}], {})
        .then(res => ({ text: res.text, source: 'Gemini' }))
        .catch(() => null)
    );

    const orKeys = getOpenRouterKeys(settings);
    if (orKeys.length > 0) {
        promises.push(
            callOpenRouter([{role:'user', content: prompt}], orKeys, undefined, undefined) 
            .then(res => ({ text: res.text, source: 'OpenRouter (Dynamic)' }))
            .catch(() => null)
        );
    }

    const hfKeys = getHuggingFaceKeys(settings);
    if (hfKeys.length > 0) {
        promises.push(
            callHuggingFace(prompt, hfKeys)
            .then(res => ({ text: res.text, source: 'HuggingFace (Dynamic)' }))
            .catch(() => null)
        );
    }

    const results = await Promise.all(promises);
    const validResults = results.filter(r => r !== null) as { text: string, source: string }[];

    if (validResults.length === 0) throw new Error("Hybrid synthesis failed: All models failed.");

    const synthesisPrompt = `Synthesize these AI responses into one perfect answer:\n\n${validResults.map(r => `--- ${r.source} ---\n${r.text}`).join('\n\n')}`;
    
    return executeWithFallback({
        prompt: synthesisPrompt,
        history: [],
        settings,
        systemInstruction: "You are a Super-Intelligence Synthesis Engine."
    });
};

export const learnNewSkill = async (prompt: string, settings: AISettings): Promise<Skill> => {
    const systemInstruction = `You are a Self-Upgrade AI Module. Return JSON { "skillName": "", "description": "", "code": "" }.`;
    const response = await executeWithFallback({ prompt, history: [], settings, systemInstruction, jsonMode: true });
    
    const jsonResponse = sanitizeAndParseJson(response.text);
    return { name: jsonResponse.skillName, description: jsonResponse.description, code: jsonResponse.code, timestamp: new Date().toISOString() };
};

export const createMemoryFromChat = async (messages: Message[], settings: AISettings): Promise<Memory | null> => {
  if (messages.length < 3) return null; 
  const conversationText = messages.map(m => `${m.sender.toUpperCase()}: ${m.text}`).join('\n');
  const systemInstruction = `Memory Encoder. Return JSON { "worthy": boolean, "title": string, "content": string, "tags": string[], "importance": number }.`;
  try {
    const response = await executeWithFallback({ prompt: `Analyze:\n${conversationText}`, history: [], settings, systemInstruction, jsonMode: true });
    const result = sanitizeAndParseJson(response.text);
    if (!result.worthy) return null;
    const newMemory: Memory = { id: Date.now().toString(), title: result.title, content: result.content, tags: result.tags || [], importance: result.importance || 1, timestamp: new Date().toISOString() };
    addMemory(newMemory);
    return newMemory;
  } catch (error) { return null; }
};

export const generateOfflineCache = async (history: Message[], settings: AISettings): Promise<OfflineCache | null> => {
    if (history.length < 2) return null;
    const conversationText = history.filter(m => m.type !== 'separator').map(m => `${m.sender}: ${m.text}`).join('\n');
    try {
        const response = await executeWithFallback({ prompt: `Summarize to JSON key-value:\n${conversationText}`, history: [], settings, jsonMode: true });
        return sanitizeAndParseJson(response.text);
    } catch (error) { return null; }
};

export const learnSkillFromUrl = async (promptWithUrl: string, settings: AISettings): Promise<Skill> => {
     const isYouTube = promptWithUrl.includes('youtube.com') || promptWithUrl.includes('youtu.be');
     const isGithub = promptWithUrl.includes('github.com');
     
     let specificPrompt = promptWithUrl;
     if (isYouTube) {
         specificPrompt = `
         Analyze this YouTube video URL context: "${promptWithUrl}".
         Infer the technical skill or coding task described or demonstrated in this video title/context.
         Create a JavaScript function (skill) that performs this task.
         If the video is a tutorial, write code that implements the tutorial's outcome.
         Return JSON { "skillName": "", "description": "", "code": "" }.
         `;
     } else if (isGithub) {
         specificPrompt = `
         Analyze this GitHub URL: "${promptWithUrl}".
         1. If it matches a well-known library or file, infer the code logic from your training data.
         2. If it is a repository link, create a skill that implements the *primary feature* of that repo as a standalone function (simulated).
         3. If it is a specific blob/file link, infer the logic of that file and recreate it as a function.
         4. Return JSON { "skillName": "", "description": "", "code": "" }.
         `;
     } else {
         specificPrompt = `
         Analyze this Website/Article URL context: "${promptWithUrl}".
         1. Identify the core technical tutorial, algorithm, or task described in this link.
         2. Use your internal knowledge base regarding this specific URL or the topic it likely covers based on the slug.
         3. Create a JavaScript function (skill) that implements the technique described.
         4. Return JSON { "skillName": "", "description": "", "code": "" }.
         `;
     }

     const systemInstruction = `You are an Advanced Learning Module. You extract skills from URLs (Videos, GitHub Repos, Documentation, Articles) and convert them into executable JavaScript code. Return strictly JSON.`;
     
     const response = await executeWithFallback({ 
         prompt: specificPrompt, 
         history: [], 
         settings, 
         systemInstruction, 
         jsonMode: true 
     });
     
     const jsonResponse = sanitizeAndParseJson(response.text);
     return { name: jsonResponse.skillName, description: jsonResponse.description, code: jsonResponse.code, timestamp: new Date().toISOString() };
};

export const initiateSelfUpgrade = async (skills: Skill[], taughtSkills: TaughtSkill[], settings: AISettings): Promise<Skill> => {
    const response = await executeWithFallback({ prompt: `Propose skill from: ${JSON.stringify(skills.map(s => s.name))}. Return string "learn how to...".`, history: [], settings });
    const learnPrompt = response.text.trim();
    if (!learnPrompt.toLowerCase().startsWith('learn how to')) throw new Error("Invalid proposal");
    return learnNewSkill(learnPrompt, settings);
};

export const proposeSkillFromHistory = async (history: Message[], skills: Skill[], taughtSkills: TaughtSkill[], settings: AISettings): Promise<Skill | null> => {
    try {
        const response = await executeWithFallback({ prompt: `Suggest skill from chat? Return "learn how to..." or "NO".\n${history.slice(-5).map(m => m.text).join('\n')}`, history: [], settings });
        if (response.text.includes("NO") || !response.text.toLowerCase().startsWith('learn how to')) return null;
        return learnNewSkill(response.text, settings);
    } catch (e) { return null; }
};

export const areTopicsRelated = async (history: Message[], cache: OfflineCache, settings: AISettings): Promise<boolean> => {
    try {
        const response = await executeWithFallback({ prompt: `Related? "true" or "false".\nCache: ${Object.keys(cache)}\nChat: ${history.slice(-3).map(m => m.text)}`, history: [], settings });
        return response.text.toLowerCase().includes('true');
    } catch (e) { return true; }
};

export const findAndPrepareSkillExecution = async (prompt: string, skills: Skill[], settings: AISettings): Promise<ExecutionPlan | null> => {
    if (skills.length === 0) return null;
    try {
        const response = await executeWithFallback({ 
            prompt: `Match skill: "${prompt}"\nSkills: ${JSON.stringify(skills.map(s => s.name))}\nReturn JSON { "match": true, "skillName": "", "args": [] }`, 
            history: [], settings, jsonMode: true 
        });
        const result = sanitizeAndParseJson(response.text);
        if (result.match) {
            const skill = skills.find(s => s.name === result.skillName);
            if (skill) return { skillName: skill.name, code: skill.code, args: result.args || [] };
        }
        return null;
    } catch (error) { return null; }
};

export const fixSkillCode = async (
    brokenCode: string, 
    errorMessage: string, 
    settings: AISettings
): Promise<string> => {
    const systemInstruction = `You are an AI Code Doctor. Fix the JavaScript code based on the error. Return ONLY the fixed code string. Do NOT use Markdown formatting like \`\`\`. Do NOT explain. Just the code.`;
    const prompt = `
    THE CODE FAILED.
    ERROR: "${errorMessage}"
    
    BROKEN CODE:
    ${brokenCode}
    
    Fix it so it runs in a Web Worker (no DOM access).
    `;

    const response = await executeWithFallback({
        prompt,
        history: [],
        settings,
        systemInstruction
    });
    
    let fixedCode = response.text;
    const codeBlockMatch = fixedCode.match(/```(?:javascript|js)?\n([\s\S]*?)```/);
    if (codeBlockMatch) {
        fixedCode = codeBlockMatch[1];
    }
    
    return fixedCode.replace(/```/g, '').trim();
};
