import React, { useState, useEffect, useRef } from 'react';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import AgentMessageRenderer from './AgentMessageRenderer';
import {
  Sparkles,
  Send,
  Trash2,
  Bot,
  User,
  AlertCircle,
  HelpCircle,
  ChevronRight,
  ShieldCheck,
  Database,
  ArrowRight,
  RefreshCw,
  Copy,
  Check,
  Maximize2,
  Minimize2,
  X,
} from 'lucide-react';

export const Chatbox = ({
  embedded = false,
  isPopup = false,
  onClose = null,
  initialQuery = '',
  className = '',
}) => {
  const { user } = useAuth();
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const [sessionId] = useState(() => `session_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`);
  const [copiedIndex, setCopiedIndex] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);
  const [activeStudentContext, setActiveStudentContext] = useState(null);
  const [activeSectionContext, setActiveSectionContext] = useState(null);

  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  // Auto scroll to bottom of chat
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  // Fetch initial role suggestions on mount
  useEffect(() => {
    const fetchSuggestions = async () => {
      try {
        const res = await api.get('/agent/suggestions');
        if (res.data?.success && res.data.data?.suggestions) {
          setSuggestions(res.data.data.suggestions);
        }
      } catch (err) {
        // Fallback default suggestions
        const defaultRoleSuggestions = {
          HOD: [
            'Show students below 75%',
            'Which students are at risk?',
            'Show Section A attendance',
            'Compare Section A and Section B',
            'Show faculty details',
            'Generate an attendance report for Section A',
          ],
          FACULTY: [
            'Show my section attendance',
            'Which students are below 75%?',
            'Show students at risk',
            'Which student has the lowest attendance?',
            'Which students are improving?',
          ],
          STAFF: [
            'Show my section attendance',
            'Which students are below 75%?',
            'Show students at risk',
          ],
          STUDENT: [
            'What is my attendance?',
            'Show my subject-wise attendance',
            'Which subject has my lowest attendance?',
            'Am I at risk?',
            'How many classes do I need to attend to reach 75%?',
            'Show my attendance trend',
          ],
          PARENT: [
            'What is my child\'s attendance?',
            'Show my child\'s subject-wise attendance',
            'Is my child at risk?',
            'Which subject needs improvement?',
            'Show my child\'s attendance trend',
          ],
        };
        setSuggestions(defaultRoleSuggestions[user?.role] || []);
      }
    };
    fetchSuggestions();
  }, [user?.role]);

  // Handle auto-executing initial query if passed as prop
  useEffect(() => {
    if (initialQuery && initialQuery.trim() && messages.length === 0) {
      handleSendMessage(initialQuery.trim());
    }
  }, [initialQuery]);

  const handleSendMessage = async (textToSend) => {
    const query = (textToSend || inputValue).trim();
    if (!query || loading) return;

    setErrorMsg(null);
    setInputValue('');

    // Append user message immediately
    const userMsg = {
      id: `usr_${Date.now()}`,
      role: 'user',
      content: query,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setLoading(true);

    try {
      const res = await api.post('/agent/chat', {
        message: query,
        sessionId,
      });

      if (res.data?.success && res.data.data) {
        const { message, suggestions: newSuggestions, ambiguousStudents, activeStudent, activeSection } = res.data.data;

        if (activeStudent) setActiveStudentContext(activeStudent);
        if (activeSection) setActiveSectionContext(activeSection);

        const agentMsg = {
          id: `agt_${Date.now()}`,
          role: 'agent',
          content: message,
          ambiguousStudents: ambiguousStudents || null,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        };

        setMessages((prev) => [...prev, agentMsg]);

        if (newSuggestions && newSuggestions.length > 0) {
          setSuggestions(newSuggestions);
        }
      } else {
        throw new Error(res.data?.message || 'Failed to process inquiry');
      }
    } catch (err) {
      console.error('Agent chat error:', err);
      const errMsg = err.response?.data?.message || err.message || 'Unable to communicate with Attendance Agent.';
      setErrorMsg(errMsg);
      setMessages((prev) => [
        ...prev,
        {
          id: `err_${Date.now()}`,
          role: 'system_error',
          content: `⚠️ ${errMsg}`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    } finally {
      setLoading(false);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleClearChat = async () => {
    try {
      await api.post('/agent/clear', { sessionId });
    } catch (err) {
      // Best-effort context clearing
    }
    setMessages([]);
    setErrorMsg(null);
    setActiveStudentContext(null);
    setActiveSectionContext(null);
  };

  const handleCopyMessage = (content, index) => {
    navigator.clipboard.writeText(content);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const getRoleBadge = () => {
    switch (user?.role) {
      case 'HOD':
        return { label: 'HOD Executive Clearance', color: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/60 dark:text-indigo-300' };
      case 'FACULTY':
      case 'STAFF':
        return { label: 'Faculty Scope', color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/60 dark:text-blue-300' };
      case 'STUDENT':
        return { label: 'Student Personal Assistant', color: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-300' };
      case 'PARENT':
        return { label: 'Parent Ward Portal', color: 'bg-teal-100 text-teal-800 dark:bg-teal-900/60 dark:text-teal-300' };
      default:
        return { label: 'Verified User', color: 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300' };
    }
  };

  const roleBadge = getRoleBadge();

  return (
    <div
      className={`flex flex-col bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl overflow-hidden ${
        embedded ? 'h-full w-full border-none shadow-none rounded-none' : 'h-[620px] max-h-[85vh] w-full'
      } ${className}`}
    >
      {/* 1. Header Bar */}
      <div className="flex items-center justify-between px-5 py-3.5 bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 text-white border-b border-slate-800 flex-shrink-0">
        <div className="flex items-center space-x-3">
          <div className="relative">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/30">
              <Sparkles className="w-5 h-5 text-white animate-pulse" />
            </div>
            <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-500 border-2 border-slate-900 rounded-full"></span>
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h2 className="text-sm font-black tracking-wide text-white uppercase">
                AI Attendance Agent
              </h2>
              <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full ${roleBadge.color}`}>
                {roleBadge.label}
              </span>
            </div>
            <p className="text-[11px] text-slate-300 flex items-center space-x-1 font-medium">
              <Database className="w-3 h-3 text-emerald-400" />
              <span>Ground Truth: University Database</span>
              {activeStudentContext && (
                <span className="text-blue-300 ml-1 font-semibold">
                  • Focus: {activeStudentContext.name}
                </span>
              )}
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          {messages.length > 0 && (
            <button
              onClick={handleClearChat}
              title="Clear Conversation"
              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-300 hover:bg-slate-800 transition-colors"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}

          {isPopup && onClose && (
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              title="Close Chat"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* 2. Chat Stream / Message Window */}
      <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4 bg-slate-50/50 dark:bg-slate-950/40">
        {/* Welcome Empty State */}
        {messages.length === 0 && (
          <div className="h-full flex flex-col items-center justify-center text-center p-4 max-w-md mx-auto my-auto space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-blue-500 to-indigo-600 flex items-center justify-center text-white shadow-xl shadow-indigo-500/20">
              <Bot className="w-8 h-8" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                How can I assist your attendance analysis?
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                Ask natural questions about attendance rates, threshold alerts (75%), calculations for required classes, or section breakdowns.
              </p>
            </div>

            {/* Quick Suggestions Cards */}
            {suggestions.length > 0 && (
              <div className="w-full space-y-2 pt-2">
                <p className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider text-left">
                  Suggested Inquiries
                </p>
                <div className="grid grid-cols-1 gap-2 text-left">
                  {suggestions.slice(0, 4).map((item, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleSendMessage(item)}
                      className="group flex items-center justify-between p-2.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-blue-500 dark:hover:border-blue-500 shadow-xs hover:shadow-md transition-all text-xs font-medium text-slate-700 dark:text-slate-200 hover:text-blue-600 dark:hover:text-blue-400"
                    >
                      <span className="truncate pr-2">{item}</span>
                      <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-blue-500 group-hover:translate-x-0.5 transition-all flex-shrink-0" />
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Message History */}
        {messages.map((msg, index) => {
          if (msg.role === 'user') {
            return (
              <div key={msg.id || index} className="flex justify-end items-end space-x-2">
                <div className="max-w-[85%] md:max-w-[75%] rounded-2xl rounded-br-sm bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-4 py-3 shadow-md">
                  <p className="text-xs md:text-sm leading-relaxed whitespace-pre-wrap font-medium">
                    {msg.content}
                  </p>
                  <span className="block text-[10px] text-blue-200 text-right mt-1 font-mono">
                    {msg.timestamp}
                  </span>
                </div>
                <div className="w-7 h-7 rounded-full bg-indigo-700 flex items-center justify-center text-white text-[11px] font-bold flex-shrink-0 mb-1">
                  {(user?.name || user?.identifier || 'U').slice(0, 1).toUpperCase()}
                </div>
              </div>
            );
          }

          if (msg.role === 'system_error') {
            return (
              <div key={msg.id || index} className="flex items-start space-x-3 p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-800 dark:text-rose-300 text-xs">
                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5 text-rose-600 dark:text-rose-400" />
                <div className="flex-1">
                  <p className="font-semibold">{msg.content}</p>
                  <button
                    onClick={() => handleSendMessage()}
                    className="mt-2 inline-flex items-center space-x-1 text-[11px] font-bold text-rose-700 dark:text-rose-300 hover:underline"
                  >
                    <RefreshCw className="w-3 h-3" />
                    <span>Try asking again</span>
                  </button>
                </div>
              </div>
            );
          }

          // Agent Message
          return (
            <div key={msg.id || index} className="flex items-start space-x-3">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-slate-800 to-indigo-900 text-indigo-400 flex items-center justify-center flex-shrink-0 shadow-sm border border-indigo-500/20 mt-0.5">
                <Sparkles className="w-4 h-4 text-indigo-400" />
              </div>

              <div className="flex-1 max-w-[90%] md:max-w-[85%]">
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl rounded-tl-sm p-4 shadow-sm text-xs md:text-sm relative group">
                  {/* Copy Button */}
                  <button
                    onClick={() => handleCopyMessage(msg.content, index)}
                    title="Copy response"
                    className="absolute top-2.5 right-2.5 p-1 rounded-md text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    {copiedIndex === index ? (
                      <Check className="w-3.5 h-3.5 text-emerald-500" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                  </button>

                  {/* Render Structured Markdown Content */}
                  <AgentMessageRenderer
                    content={msg.content}
                    onSelectPrompt={handleSendMessage}
                  />

                  {/* Ambiguity Resolution Selector Cards */}
                  {msg.ambiguousStudents && msg.ambiguousStudents.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-800 space-y-2">
                      <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                        Select Matching Student:
                      </p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {msg.ambiguousStudents.map((stud) => (
                          <button
                            key={stud.studentId}
                            onClick={() => handleSendMessage(`What is ${stud.name}'s attendance?`)}
                            className="text-left p-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 hover:border-blue-500 hover:bg-blue-50/50 dark:hover:bg-blue-900/20 transition-all flex items-center justify-between"
                          >
                            <div className="min-w-0 pr-2">
                              <p className="font-bold text-xs text-slate-900 dark:text-slate-100 truncate">
                                {stud.name}
                              </p>
                              <p className="text-[10px] text-slate-500 dark:text-slate-400">
                                {stud.registrationNumber} • Sec {stud.section} (Sem {stud.semester})
                              </p>
                            </div>
                            <ArrowRight className="w-3.5 h-3.5 text-blue-500 flex-shrink-0" />
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="mt-2 pt-1 flex items-center justify-between text-[10px] text-slate-400 font-mono">
                    <span className="flex items-center space-x-1">
                      <ShieldCheck className="w-3 h-3 text-emerald-500" />
                      <span>Database Verified</span>
                    </span>
                    <span>{msg.timestamp}</span>
                  </div>
                </div>
              </div>
            </div>
          );
        })}

        {/* Loading / Typing Indicator */}
        {loading && (
          <div className="flex items-start space-x-3">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-slate-800 to-indigo-900 text-indigo-400 flex items-center justify-center flex-shrink-0 shadow-sm border border-indigo-500/20">
              <Sparkles className="w-4 h-4 text-indigo-400 animate-spin" />
            </div>
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl rounded-tl-sm p-4 shadow-sm flex items-center space-x-2">
              <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                Analyzing database records
              </span>
              <div className="flex space-x-1">
                <span className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                <span className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                <span className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce"></span>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* 3. Follow-up Suggestions Chips */}
      {suggestions.length > 0 && messages.length > 0 && (
        <div className="px-4 py-2 bg-slate-100/80 dark:bg-slate-900/90 border-t border-slate-200 dark:border-slate-800 overflow-x-auto flex items-center space-x-2 scrollbar-none flex-shrink-0">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex-shrink-0">
            Suggested:
          </span>
          {suggestions.map((sug, i) => (
            <button
              key={i}
              disabled={loading}
              onClick={() => handleSendMessage(sug)}
              className="text-[11px] whitespace-nowrap px-2.5 py-1 rounded-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-blue-500 text-slate-700 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 font-medium transition-colors shadow-2xs"
            >
              {sug}
            </button>
          ))}
        </div>
      )}

      {/* 4. Input Area */}
      <div className="p-3 md:p-4 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex-shrink-0">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSendMessage();
          }}
          className="relative flex items-center"
        >
          <input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={loading}
            placeholder={
              user?.role === 'STUDENT'
                ? "Ask 'What is my attendance?' or 'How many classes for 75%'..."
                : user?.role === 'PARENT'
                ? "Ask 'What is my child's attendance?' or 'Is my child at risk?'..."
                : user?.role === 'FACULTY' || user?.role === 'STAFF'
                ? "Ask 'Show Rahul Kumar', 'Students below 75%', 'Section attendance'..."
                : "Ask 'Show students below 75%', 'Show faculty details', 'Compare Section A and B'..."
            }
            className="w-full pl-4 pr-12 py-3 text-xs md:text-sm bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:text-white placeholder-slate-400 transition-all outline-none"
          />

          <button
            type="submit"
            disabled={!inputValue.trim() || loading}
            className={`absolute right-2 p-2 rounded-lg transition-all ${
              inputValue.trim() && !loading
                ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-md'
                : 'bg-slate-200 dark:bg-slate-800 text-slate-400 cursor-not-allowed'
            }`}
            title="Send inquiry"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>

        <div className="flex items-center justify-between text-[10px] text-slate-400 dark:text-slate-500 mt-2 px-1">
          <span>Press <strong>Enter</strong> to send</span>
          <span className="flex items-center space-x-1">
            <ShieldCheck className="w-3 h-3 text-emerald-500" />
            <span>Role-Based Access Controlled • Zero Hallucination</span>
          </span>
        </div>
      </div>
    </div>
  );
};

export default Chatbox;
