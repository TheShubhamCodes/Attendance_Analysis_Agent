import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import StatusBadge from '../../components/common/StatusBadge';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { ShieldCheck, Lock, Calendar, User, Clock, AlertCircle } from 'lucide-react';

export const InterventionsPage = () => {
  const [interventions, setInterventions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchInterventions = async () => {
      try {
        const res = await api.get('/student/interventions');
        if (res.data?.success) {
          setInterventions(res.data.data || []);
        }
      } catch (err) {
        setError(err.response?.data?.message || 'Could not fetch intervention records.');
      } finally {
        setLoading(false);
      }
    };
    fetchInterventions();
  }, []);

  if (loading) return <LoadingSpinner text="Retrieving intervention logs..." />;

  if (error) {
    return (
      <div className="bg-rose-50 border border-rose-200 rounded-xl p-6 text-rose-700 text-sm">
        <p>{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 text-xs font-semibold text-brand-800 uppercase tracking-wider mb-1">
            <ShieldCheck className="w-4 h-4" />
            <span>Academic Support Tracking</span>
          </div>
          <h1 className="text-xl font-bold text-slate-900">Intervention & Counselling Records</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Official records of attendance advisory sessions, academic support, and mentor reviews
          </p>
        </div>

        <div className="flex items-center space-x-2 bg-slate-100 text-slate-600 px-3 py-1.5 rounded-lg text-xs font-medium border border-slate-200">
          <Lock className="w-3.5 h-3.5 text-slate-500" />
          <span>Official University Records (Read-Only)</span>
        </div>
      </div>

      {/* Main Interventions List */}
      <div className="space-y-4">
        {interventions.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-xl p-12 text-center text-slate-400 text-xs shadow-xs">
            No formal academic interventions have been mandated for your profile.
          </div>
        ) : (
          interventions.map((item) => (
            <div
              key={item.id}
              className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs space-y-4 hover:border-slate-300 transition-colors"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
                <div className="flex items-center space-x-3">
                  <div className="w-9 h-9 rounded-lg bg-brand-50 border border-brand-200 flex items-center justify-center text-brand-900 font-bold">
                    <ShieldCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">
                      {item.type.replace(/_/g, ' ')}
                    </h3>
                    <p className="text-xs text-slate-500">
                      Conducted by {item.mentor?.name || 'Faculty Advisor'}
                    </p>
                  </div>
                </div>

                <StatusBadge status={item.status} />
              </div>

              <div className="text-xs text-slate-700 bg-slate-50 p-4 rounded-lg border border-slate-200/80 leading-relaxed">
                <span className="font-bold text-slate-800 block mb-1">Counselling Notes & Action Plan:</span>
                {item.description}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1 text-xs">
                <div className="flex items-center space-x-2 text-slate-600">
                  <Calendar className="w-4 h-4 text-slate-400" />
                  <span>
                    Session Date:{' '}
                    <strong className="text-slate-800">
                      {new Date(item.date).toLocaleDateString(undefined, {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                      })}
                    </strong>
                  </span>
                </div>

                {item.followUpDate && (
                  <div className="flex items-center space-x-2 text-brand-900">
                    <Clock className="w-4 h-4 text-brand-700" />
                    <span>
                      Scheduled Follow-up:{' '}
                      <strong className="text-brand-950">
                        {new Date(item.followUpDate).toLocaleDateString(undefined, {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                        })}
                      </strong>
                    </span>
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default InterventionsPage;
