import React from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import Chatbox from '../../components/common/Chatbox';
import {
  Sparkles,
  ShieldCheck,
  Database,
  HelpCircle,
  Calculator,
  AlertTriangle,
  FileSpreadsheet,
  CheckCircle2,
  Lock,
} from 'lucide-react';

export const ChatboxPage = () => {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const initialQuery = searchParams.get('q') || '';

  const getRoleGuide = () => {
    switch (user?.role) {
      case 'HOD':
        return {
          title: 'Department Head Access Scope',
          description:
            'You have institutional clearance to query all department students, faculty members, sections, defaulter rosters, and comparative cross-section metrics.',
          quickTips: [
            'Filter attendance by section or semester',
            'Search faculty profiles and assigned subject loads',
            'Generate comprehensive section reports',
            'Detect at-risk students below 75% threshold',
          ],
          capabilities: [
            'All Department Students',
            'Section Comparisons',
            'Faculty & Staff Profiles',
            'Defaulter Roster',
          ],
        };
      case 'FACULTY':
      case 'STAFF':
        return {
          title: 'Faculty / Counselor Access Scope',
          description:
            'You can analyze students enrolled in your designated class sections and counselled student batches. Cross-department or administrative faculty records are restricted.',
          quickTips: [
            'Query student attendance in your assigned sections',
            'Identify students at risk of attendance shortage',
            'View consecutive classes required to reach safe 75%',
            'Track improving or declining attendance patterns',
          ],
          capabilities: [
            'Assigned Section Students',
            'Mentees & Counselled Batches',
            'Subject-wise Breakdown',
            'Target Projections',
          ],
        };
      case 'STUDENT':
        return {
          title: 'Personal Academic Assistant Scope',
          description:
            'You have private access to your own attendance records, registered subjects, and consecutive class calculations. Other students\' private records are strictly inaccessible.',
          quickTips: [
            'Ask "What is my attendance?" for total percentage',
            'Ask "How many classes do I need to reach 75%?"',
            'Identify which specific subject has lowest attendance',
            'Check if you are classified safe or at risk',
          ],
          capabilities: [
            'Personal Overall Attendance',
            'Subject-wise Breakdown',
            'Target Class Calculator',
            'Academic Risk Status',
          ],
        };
      case 'PARENT':
        return {
          title: 'Parent Ward Monitoring Scope',
          description:
            'You can monitor attendance metrics and alerts exclusively for your verified linked children. Unlinked university records remain strictly confidential.',
          quickTips: [
            'Check your child\'s total attendance percentage',
            'Review subject-wise attendance distribution',
            'Verify at-risk status and shortage warnings',
            'Calculate classes needed to regain safe standing',
          ],
          capabilities: [
            'Linked Child Records Only',
            'Subject Attendance Breakdown',
            'Shortage Alerts',
            'Attendance Trends',
          ],
        };
      default:
        return {
          title: 'Authorized Academic Scope',
          description: 'University attendance records are strictly verified against the database.',
          quickTips: [],
          capabilities: [],
        };
    }
  };

  const guide = getRoleGuide();

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs">
        <div>
          <div className="flex items-center space-x-2.5">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-purple-600 flex items-center justify-center text-white shadow-md">
              <Sparkles className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <h1 className="text-lg font-black text-slate-900 dark:text-white tracking-tight uppercase">
                AI Attendance Analysis Agent
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Natural-language academic intelligence grounded directly in the university database.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-3 text-xs font-semibold">
          <span className="flex items-center space-x-1.5 px-3 py-1.5 rounded-full bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
            <Database className="w-3.5 h-3.5 text-emerald-500" />
            <span>PostgreSQL Source of Truth</span>
          </span>
          <span className="flex items-center space-x-1.5 px-3 py-1.5 rounded-full bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
            <Lock className="w-3.5 h-3.5 text-blue-500" />
            <span>Role-Based Security</span>
          </span>
        </div>
      </div>

      {/* Main Grid: Sidebar Guide + Chatbox */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Left Column: Scope & Guide Info */}
        <div className="lg:col-span-1 space-y-4">
          {/* Scope Card */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs">
            <div className="flex items-center space-x-2 font-bold text-xs text-slate-900 dark:text-white mb-2">
              <ShieldCheck className="w-4 h-4 text-indigo-500" />
              <span>{guide.title}</span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed mb-4">
              {guide.description}
            </p>

            <div className="space-y-1.5 border-t border-slate-100 dark:border-slate-800 pt-3">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-2">
                Authorized Domains
              </span>
              {guide.capabilities.map((cap, i) => (
                <div
                  key={i}
                  className="flex items-center space-x-2 text-xs text-slate-700 dark:text-slate-300 font-medium"
                >
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />
                  <span>{cap}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Quick Guidance Card */}
          <div className="bg-gradient-to-br from-indigo-900 to-slate-900 text-white rounded-2xl p-5 shadow-md">
            <div className="flex items-center space-x-2 font-bold text-xs text-indigo-200 mb-2">
              <HelpCircle className="w-4 h-4 text-indigo-400" />
              <span>Query Intelligence Tips</span>
            </div>
            <ul className="space-y-2 text-xs text-slate-300">
              {guide.quickTips.map((tip, i) => (
                <li key={i} className="flex items-start space-x-2">
                  <span className="text-indigo-400 font-bold">•</span>
                  <span>{tip}</span>
                </li>
              ))}
            </ul>

            <div className="mt-4 pt-3 border-t border-indigo-800/80 text-[10px] text-indigo-300 leading-normal">
              ⚡ <strong>Deterministic Math:</strong> Target classes and percentages are calculated directly by application logic, not guessed.
            </div>
          </div>
        </div>

        {/* Right Column: Interactive Chatbox */}
        <div className="lg:col-span-3">
          <Chatbox
            embedded={false}
            initialQuery={initialQuery}
            className="h-[680px] min-h-[500px]"
          />
        </div>
      </div>
    </div>
  );
};

export default ChatboxPage;
