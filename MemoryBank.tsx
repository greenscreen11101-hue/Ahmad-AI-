
import React, { useEffect, useState } from 'react';
import { getMemories, deleteMemory } from '../services/memoryService';
import type { Memory } from '../types';

export const MemoryBank: React.FC = () => {
    const [memories, setMemories] = useState<Memory[]>([]);

    useEffect(() => {
        setMemories(getMemories());
    }, []);

    const handleDelete = (id: string) => {
        deleteMemory(id);
        setMemories(getMemories());
    };

    return (
        <div className="p-4 sm:p-6 bg-gray-50 dark:bg-gray-900 flex-1 overflow-y-auto transition-colors">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-3">
                <i className="fa-solid fa-microchip text-pink-600 dark:text-pink-500"></i>
                Long-Term Memory Bank
            </h2>

            {memories.length === 0 ? (
                <div className="text-center py-12 px-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm">
                    <i className="fa-solid fa-brain text-5xl text-gray-300 dark:text-gray-700 mb-4"></i>
                    <h3 className="text-xl font-semibold text-gray-800 dark:text-white">Memory Empty</h3>
                    <p className="text-gray-500 dark:text-gray-400 mt-2">
                        Start chatting! I will automatically analyze our conversations and store important facts here.
                    </p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {memories.slice().reverse().map(memory => (
                        <div key={memory.id} className="bg-white dark:bg-gray-800 rounded-lg p-5 border border-gray-200 dark:border-gray-700 hover:border-pink-400 dark:hover:border-pink-500/50 transition-colors shadow-sm dark:shadow-lg">
                            <div className="flex justify-between items-start mb-3">
                                <h3 className="font-bold text-lg text-gray-900 dark:text-white truncate pr-2" title={memory.title}>
                                    {memory.title}
                                </h3>
                                <div className="flex items-center gap-2">
                                    <span className="text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 px-2 py-1 rounded-full">
                                        Imp: {memory.importance}/10
                                    </span>
                                    <button 
                                        onClick={() => handleDelete(memory.id)}
                                        className="text-gray-400 dark:text-gray-500 hover:text-red-500 dark:hover:text-red-400 transition-colors"
                                        title="Forget this memory"
                                    >
                                        <i className="fa-solid fa-trash"></i>
                                    </button>
                                </div>
                            </div>
                            
                            <p className="text-gray-700 dark:text-gray-300 text-sm mb-4 line-clamp-4 h-20">
                                {memory.content}
                            </p>

                            <div className="flex flex-wrap gap-2 mb-3">
                                {memory.tags.map(tag => (
                                    <span key={tag} className="text-xs text-pink-700 dark:text-pink-300 bg-pink-100 dark:bg-pink-900/30 px-2 py-0.5 rounded">
                                        #{tag}
                                    </span>
                                ))}
                            </div>

                            <div className="text-xs text-gray-500 pt-3 border-t border-gray-100 dark:border-gray-700 flex justify-between items-center">
                                <span>{new Date(memory.timestamp).toLocaleDateString()}</span>
                                <span className="text-gray-400 dark:text-gray-600 font-mono text-[10px]">{memory.id.slice(-6)}</span>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};
