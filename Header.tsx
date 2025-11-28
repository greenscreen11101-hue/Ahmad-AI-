
import React, { useState, useRef, useEffect } from 'react';
import type { View, Theme } from '../types';

interface HeaderProps {
  currentView: View;
  setView: (view: View) => void;
  onNewChat: () => void;
  isOnline: boolean;
  onSearch: (query: string) => void;
  onUndo: () => void;
  onRedo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  theme: Theme;
  toggleTheme: () => void;
}

const NavButton: React.FC<{
  icon: string;
  label: string;
  isActive: boolean;
  onClick: () => void;
  isMobile?: boolean;
}> = ({ icon, label, isActive, onClick, isMobile }) => (
  <button
    onClick={onClick}
    className={`flex items-center gap-3 px-3 py-2 rounded-md font-medium transition-colors w-full text-left ${
        isMobile ? 'text-base' : 'text-sm'
    } ${
      isActive
        ? 'bg-primary-500 text-white'
        : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-white'
    }`}
    aria-label={`Switch to ${label} view`}
  >
    <i className={`fa-solid ${icon} w-5 h-5 text-center`} aria-hidden="true"></i>
    <span className={isMobile ? '' : 'hidden sm:inline'}>{label}</span>
  </button>
);

export const Header: React.FC<HeaderProps> = ({
  currentView,
  setView,
  onNewChat,
  isOnline,
  onSearch,
  onUndo,
  onRedo,
  canUndo,
  canRedo,
  theme,
  toggleTheme
}) => {
  const [isSearchVisible, setIsSearchVisible] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isSearchVisible) {
      (searchInputRef.current as any)?.focus();
    } else {
      onSearch(''); // Clear search when hiding the bar
    }
  }, [isSearchVisible, onSearch]);

  useEffect(() => {
    if (currentView !== 'chat' && isSearchVisible) {
      setIsSearchVisible(false);
    }
    setIsMobileMenuOpen(false);
  }, [currentView, isSearchVisible]);

  const handleNavClick = (view: View) => {
    setView(view);
    setIsMobileMenuOpen(false);
  };

  const MobileMenuButton: React.FC<{ onClick: () => void, className?: string, children: React.ReactNode }> = ({ onClick, children, className }) => (
    <button onClick={onClick} className={`w-full flex items-center gap-3 px-3 py-2 text-base rounded-md text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 ${className}`}>
        {children}
    </button>
  );

  return (
    <>
      <header className="flex items-center justify-between p-4 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 shadow-sm transition-colors duration-200">
        {isSearchVisible ? (
          <div className="flex items-center w-full transition-all">
              <i className="fa-solid fa-search text-gray-400 mx-3" aria-hidden="true"></i>
              <input
                  ref={searchInputRef}
                  type="text"
                  placeholder="Search in conversation..."
                  onChange={(e) => onSearch(e.currentTarget.value)}
                  className="w-full bg-transparent text-gray-900 dark:text-white focus:outline-none placeholder-gray-500"
                  aria-label="Search in conversation"
              />
              <button onClick={() => setIsSearchVisible(false)} className="px-4 py-2 text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white" aria-label="Close search">
                  <i className="fa-solid fa-times" aria-hidden="true"></i>
              </button>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-primary-500 to-cyan-400 flex items-center justify-center">
                      <i className="fa-solid fa-brain text-white text-lg" aria-hidden="true"></i>
                  </div>
                  <h1 className="text-xl font-bold text-gray-900 dark:text-white tracking-wider">Ahmad <span className="text-primary-500">AI</span></h1>
              </div>
              
              {!isOnline && (
                  <div className="flex items-center gap-2 text-yellow-600 dark:text-yellow-400 text-xs font-semibold bg-yellow-100 dark:bg-yellow-900/50 px-2 py-1 rounded-full">
                      <i className="fa-solid fa-wifi-slash" aria-hidden="true"></i>
                      <span className="hidden sm:inline">Offline</span>
                  </div>
              )}
            </div>
            
            <div className="flex items-center gap-2">
                {/* Desktop Navigation */}
                <div className="hidden md:flex items-center gap-4">
                    <nav className="flex items-center gap-1">
                        <NavButton icon="fa-comments" label="Chat" isActive={currentView === 'chat'} onClick={() => setView('chat')} />
                        <NavButton icon="fa-clock-rotate-left" label="History" isActive={currentView === 'history'} onClick={() => setView('history')} />
                        <NavButton icon="fa-microchip" label="Memory" isActive={currentView === 'memory'} onClick={() => setView('memory')} />
                        <NavButton icon="fa-chalkboard-user" label="Teach" isActive={currentView === 'teach'} onClick={() => setView('teach')} />
                        <NavButton icon="fa-arrow-up-right-dots" label="Upgrades" isActive={currentView === 'upgrades'} onClick={() => setView('upgrades')} />
                        <NavButton icon="fa-gear" label="Settings" isActive={currentView === 'settings'} onClick={() => setView('settings')} />
                    </nav>
                    {currentView === 'chat' && (
                        <div className="flex items-center gap-1 border-l border-gray-200 dark:border-gray-700 pl-4">
                            <button
                              onClick={onNewChat}
                              className="flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-white"
                              aria-label="Start a new topic" title="New Topic"
                            >
                              <i className="fa-solid fa-plus" aria-hidden="true"></i>
                              <span className="hidden lg:inline">New Topic</span>
                            </button>
                            <button onClick={onUndo} disabled={!canUndo} className="flex items-center justify-center w-8 h-8 rounded-md text-gray-500 dark:text-gray-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed hover:enabled:bg-gray-100 dark:hover:enabled:bg-gray-700 hover:enabled:text-gray-900 dark:hover:enabled:text-white" aria-label="Undo last action" title="Undo">
                              <i className="fa-solid fa-rotate-left" aria-hidden="true"></i>
                            </button>
                            <button onClick={onRedo} disabled={!canRedo} className="flex items-center justify-center w-8 h-8 rounded-md text-gray-500 dark:text-gray-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed hover:enabled:bg-gray-100 dark:hover:enabled:bg-gray-700 hover:enabled:text-gray-900 dark:hover:enabled:text-white" aria-label="Redo last action" title="Redo">
                              <i className="fa-solid fa-rotate-right" aria-hidden="true"></i>
                            </button>
                        </div>
                    )}
                </div>

                {/* Theme Toggle & Search (Visible on all) */}
                <button
                    onClick={toggleTheme}
                    className="flex items-center justify-center w-9 h-9 rounded-md text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-white transition-colors"
                    aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
                    title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
                >
                    <i className={`fa-solid ${theme === 'dark' ? 'fa-sun' : 'fa-moon'}`} aria-hidden="true"></i>
                </button>

                {currentView === 'chat' && (
                    <button
                        onClick={() => setIsSearchVisible(true)}
                        className="flex items-center justify-center w-9 h-9 rounded-md text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-white transition-colors"
                        aria-label="Search chat history"
                        title="Search chat history"
                    >
                        <i className="fa-solid fa-search" aria-hidden="true"></i>
                    </button>
                )}
                
                {/* Mobile Menu Button */}
                <button
                    onClick={() => setIsMobileMenuOpen(true)}
                    className="md:hidden flex items-center justify-center w-9 h-9 rounded-md text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-white transition-colors"
                    aria-label="Open menu"
                >
                    <i className="fa-solid fa-bars" aria-hidden="true"></i>
                </button>
            </div>
          </>
        )}
      </header>

      {/* Mobile Sidebar */}
      <div className={`fixed inset-0 bg-black/60 z-40 md:hidden ${isMobileMenuOpen ? 'block' : 'hidden'}`} onClick={() => setIsMobileMenuOpen(false)} aria-hidden="true"/>
      <aside 
        className={`fixed top-0 right-0 w-72 h-full bg-white dark:bg-gray-800 z-50 p-6 flex flex-col gap-6 transition-transform duration-300 ease-in-out md:hidden ${isMobileMenuOpen ? 'translate-x-0' : 'translate-x-full'}`}
        role="dialog" aria-modal="true" aria-labelledby="mobile-menu-title"
      >
        <div className="flex items-center justify-between">
            <h2 id="mobile-menu-title" className="text-lg font-bold text-gray-900 dark:text-white">Menu</h2>
            <button onClick={() => setIsMobileMenuOpen(false)} className="text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white" aria-label="Close menu">
                <i className="fa-solid fa-times text-2xl" />
            </button>
        </div>

        {currentView === 'chat' && (
            <div className="border-b border-gray-200 dark:border-gray-700 pb-6 space-y-3">
                <MobileMenuButton onClick={() => { onNewChat(); setIsMobileMenuOpen(false); }}>
                    <i className="fa-solid fa-plus w-5 text-center" />
                    <span>New Topic</span>
                </MobileMenuButton>
                <div className="flex items-center justify-around gap-2">
                    <button onClick={onUndo} disabled={!canUndo} className="flex-1 flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium rounded-md text-gray-500 dark:text-gray-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed hover:enabled:bg-gray-100 dark:hover:enabled:bg-gray-700 hover:enabled:text-gray-900 dark:hover:enabled:text-white">
                        <i className="fa-solid fa-rotate-left" /> Undo
                    </button>
                    <button onClick={onRedo} disabled={!canRedo} className="flex-1 flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium rounded-md text-gray-500 dark:text-gray-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed hover:enabled:bg-gray-100 dark:hover:enabled:bg-gray-700 hover:enabled:text-gray-900 dark:hover:enabled:text-white">
                        <i className="fa-solid fa-rotate-right" /> Redo
                    </button>
                </div>
            </div>
        )}

        <nav className="flex flex-col gap-2">
            <NavButton icon="fa-comments" label="Chat" isActive={currentView === 'chat'} onClick={() => handleNavClick('chat')} isMobile />
            <NavButton icon="fa-clock-rotate-left" label="History" isActive={currentView === 'history'} onClick={() => handleNavClick('history')} isMobile />
            <NavButton icon="fa-microchip" label="Memory" isActive={currentView === 'memory'} onClick={() => handleNavClick('memory')} isMobile />
            <NavButton icon="fa-chalkboard-user" label="Teach" isActive={currentView === 'teach'} onClick={() => handleNavClick('teach')} isMobile />
            <NavButton icon="fa-arrow-up-right-dots" label="Upgrades" isActive={currentView === 'upgrades'} onClick={() => handleNavClick('upgrades')} isMobile />
            <NavButton icon="fa-gear" label="Settings" isActive={currentView === 'settings'} onClick={() => handleNavClick('settings')} isMobile />
        </nav>
      </aside>
    </>
  );
};
