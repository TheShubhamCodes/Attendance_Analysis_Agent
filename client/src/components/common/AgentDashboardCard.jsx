import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Sparkles, ArrowRight, Bot, ShieldCheck, Database, MessageSquare } from 'lucide-react';

export const AgentDashboardCard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const getRoleConfig = () => {
    switch (user?.role) {
      case 'HOD':
        return {
          route: '/hod/agent',
          prompts: [
            'Show students below 75%',
            'Which students are at risk?',
            'Show Section A attendance',
            'Show faculty details',
            'Compare Section A and Section B',
          ],
          tagline: 'Instant cohort attendance analytics, section comparisons, and faculty queries.',
        };
      case 'FACULTY':
      case 'STAFF':
        return {
          route: '/faculty/agent',
          prompts: [
            'Show my section attendance',
            'Which students are below 75%?',
            'Show students at risk',
            'Which student has the lowest attendance?',
            'Which students are improving?',
          ],
          tagline: 'Query students in your assigned sections, pinpoint shortages, and predict targets.',
        };
      case 'STUDENT':
        return {
          route: '/student/agent',
          prompts: [
            'What is my attendance?',
            'Show my subject-wise attendance',
            'How many classes do I need to attend to reach 75%?',
            'Am I at risk?',
            'Which subject has my lowest attendance?',
          ],
          tagline: 'Your personal attendance advisor. Calculate required classes and track shortage alerts.',
        };
      case 'PARENT':
        return {
          route: '/parent/agent',
          prompts: [
            'What is my child\'s attendance?',
            'Show my child\'s subject-wise attendance',
            'Is my child at risk?',
            'Which subject needs improvement?',
            'Show my child\'s attendance trend',
          ],
          tagline: 'Direct, verified attendance tracking and warning indicators for your linked child.',
        };
      default:
        return {
          route: '/login',
          prompts: ['What is my attendance?'],
          tagline: 'AI Academic Attendance Intelligence.',
        };
    }
  };

  const config = getRoleConfig();

  const handlePromptClick = (prompt) => {
    navigate(`${config.route}?q=${encodeURIComponent(prompt)}`);
  };

  return (
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 border border-indigo-900/50 p-6 text-white shadow-xl shadow-indigo-950/20">
      {/* Background Decorative Glow */}
      <div className="absolute -top-12 -right-12 w-48 h-48 bg-blue-500/10 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute -bottom-12 -left-12 w-48 h-48 bg-purple-500/10 rounded-full blur-3xl pointer-events-none"></div>

      <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
        {/* Left Side: Agent Branding */}
        <div className="space-y-3 max-w-xl">
          <div className="flex items-center space-x-2.5">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-purple-600 flex items-center justify-center text-white shadow-md shadow-indigo-600/30">
              <Sparkles className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="text-sm font-black tracking-wider uppercase text-white">
                  AI Attendance Agent
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center space-x-1">
                  <Database className="w-2.5 h-2.5" />
                  <span>PostgreSQL Grounded</span>
                </span>
              </div>
              <p className="text-xs text-indigo-200 mt-0.5">
                {config.tagline}
              </p>
            </div>
          </div>

          {/* Prompt Chips */}
          <div className="flex flex-wrap gap-2 pt-1">
            {config.prompts.map((prompt, idx) => (
              <button
                key={idx}
                onClick={() => handlePromptClick(prompt)}
                className="inline-flex items-center space-x-1 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 border border-white/10 hover:border-indigo-400 text-xs text-slate-200 hover:text-white font-medium transition-all transform hover:-translate-y-0.5"
              >
                <span>{prompt}</span>
                <ArrowRight className="w-3 h-3 text-indigo-300" />
              </button>
            ))}
          </div>
        </div>

        {/* Right Side: CTA Button */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 flex-shrink-0">
          <button
            onClick={() => navigate(config.route)}
            className="flex items-center justify-center space-x-2 px-5 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-xs shadow-lg shadow-indigo-600/40 transition-all transform hover:scale-105 active:scale-95"
          >
            <Bot className="w-4 h-4" />
            <span>Launch AI Agent</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default AgentDashboardCard;
