import React, { useState, useEffect } from 'react';
import { Sparkles, Bot, X, MessageSquare } from 'lucide-react';
import Chatbox from './Chatbox';

export const FloatingChatWidget = () => {
  const [isOpen, setIsOpen] = useState(false);

  // Close on Escape key press
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end">
      {/* Expanded Popup Chatbox */}
      {isOpen && (
        <div className="mb-4 w-[420px] max-w-[calc(100vw-2rem)] h-[580px] max-h-[calc(100vh-6rem)] shadow-2xl rounded-2xl overflow-hidden border border-slate-700/50 animate-in fade-in slide-in-from-bottom-5 duration-200">
          <Chatbox
            isPopup={true}
            onClose={() => setIsOpen(false)}
            className="h-full w-full rounded-2xl"
          />
        </div>
      )}

      {/* Floating Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        aria-label={isOpen ? 'Close AI Chat' : 'Open AI Attendance Agent'}
        className={`group flex items-center space-x-2.5 px-4 py-3 rounded-full shadow-xl transition-all duration-300 transform hover:scale-105 active:scale-95 ${
          isOpen
            ? 'bg-slate-900 text-slate-300 hover:text-white border border-slate-700'
            : 'bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 text-white shadow-indigo-500/30'
        }`}
      >
        <div className="relative flex items-center justify-center">
          {isOpen ? (
            <X className="w-5 h-5 text-slate-300 group-hover:text-white" />
          ) : (
            <>
              <Sparkles className="w-5 h-5 text-white animate-pulse" />
              <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-emerald-400 border-2 border-indigo-600 rounded-full animate-ping"></span>
              <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-emerald-400 border-2 border-indigo-600 rounded-full"></span>
            </>
          )}
        </div>
        <span className="text-xs font-bold tracking-wide">
          {isOpen ? 'Close Agent' : 'Ask AI Agent'}
        </span>
      </button>
    </div>
  );
};

export default FloatingChatWidget;
