import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import {
  HeartHandshake,
  Search,
  UserPlus,
  Link2,
  Unlink2,
  X,
  AlertCircle,
  CheckCircle2,
  GraduationCap,
  Mail,
  Phone,
} from 'lucide-react';

export const AdminParentsPage = () => {
  const [parents, setParents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Link Child Modal
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [selectedParent, setSelectedParent] = useState(null);
  const [childRegNo, setChildRegNo] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState({ text: '', isError: false });

  const fetchParents = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.append('search', search);

      const res = await api.get(`/admin/parents?${params.toString()}`);
      if (res.data?.success) {
        setParents(res.data.data);
      }
    } catch (err) {
      console.error('Failed to fetch parents:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchParents();
  }, []);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchParents();
  };

  const openLinkModal = (parent) => {
    setSelectedParent(parent);
    setChildRegNo('');
    setShowLinkModal(true);
  };

  const handleLinkStudent = async (e) => {
    e.preventDefault();
    if (!selectedParent || !childRegNo) return;

    setSubmitting(true);
    setMessage({ text: '', isError: false });

    try {
      const res = await api.post('/admin/parents/link', {
        parentId: selectedParent.id,
        registrationNumber: childRegNo.trim().toUpperCase(),
      });

      if (res.data?.success) {
        setMessage({ text: res.data.message, isError: false });
        setShowLinkModal(false);
        fetchParents();
      }
    } catch (err) {
      setMessage({
        text: err.response?.data?.message || 'Failed to link student.',
        isError: true,
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleUnlinkStudent = async (parent, studentId) => {
    if (!window.confirm('Are you sure you want to remove this student link from this parent account?')) {
      return;
    }

    try {
      const res = await api.post('/admin/parents/unlink', {
        parentId: parent.id,
        studentId,
      });
      if (res.data?.success) {
        setMessage({ text: res.data.message, isError: false });
        fetchParents();
      }
    } catch (err) {
      setMessage({
        text: err.response?.data?.message || 'Failed to unlink student.',
        isError: true,
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-2">
            <HeartHandshake className="w-6 h-6 text-purple-400" />
            Parent Management & Student Linkages
          </h1>
          <p className="text-xs text-slate-400">
            Manage guardian accounts, link multiple enrolled children, and audit relationship linkages.
          </p>
        </div>
      </div>

      {/* Global Alerts */}
      {message.text && (
        <div
          className={`p-3.5 rounded-xl border flex items-center justify-between text-xs font-semibold ${
            message.isError
              ? 'bg-rose-950/40 border-rose-800 text-rose-300'
              : 'bg-emerald-950/40 border-emerald-800 text-emerald-300'
          }`}
        >
          <span>{message.text}</span>
          <button onClick={() => setMessage({ text: '', isError: false })}>
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Search Toolbar */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 flex items-center gap-3">
        <form onSubmit={handleSearchSubmit} className="flex-1 relative">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search parent by name, email, or mobile..."
            className="w-full pl-9 pr-4 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-purple-500"
          />
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
        </form>
      </div>

      {/* Parents Cards Grid */}
      {loading ? (
        <div className="py-16 text-center text-slate-500 text-xs">
          <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
          Loading parent records...
        </div>
      ) : parents.length === 0 ? (
        <div className="p-12 text-center text-slate-500 text-xs bg-slate-900/40 border border-slate-800 rounded-2xl">
          No parent accounts found.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {parents.map((p) => (
            <div
              key={p.id}
              className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 flex flex-col justify-between shadow-xl space-y-4"
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <h2 className="text-sm font-bold text-white">{p.name}</h2>
                    <span className="text-[10px] text-purple-400 font-mono">ID: {p.identifier}</span>
                  </div>
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase ${
                      p.status === 'ACTIVE'
                        ? 'bg-emerald-950/60 text-emerald-400 border border-emerald-800'
                        : 'bg-rose-950/60 text-rose-400 border border-rose-800'
                    }`}
                  >
                    {p.status}
                  </span>
                </div>

                <div className="text-[11px] text-slate-400 space-y-1">
                  <p className="flex items-center gap-1.5">
                    <Mail className="w-3.5 h-3.5 text-purple-400" />
                    {p.email}
                  </p>
                  <p className="flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 text-purple-400" />
                    {p.mobile}
                  </p>
                </div>

                {/* Linked Children List */}
                <div>
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">
                    Linked Enrolled Children ({p.children.length}):
                  </span>
                  {p.children.length === 0 ? (
                    <span className="text-[11px] text-slate-500 italic">No children linked yet.</span>
                  ) : (
                    <div className="space-y-1.5">
                      {p.children.map((child) => (
                        <div
                          key={child.id}
                          className="flex items-center justify-between p-2 rounded-lg bg-slate-950 border border-slate-800 text-[11px]"
                        >
                          <div>
                            <span className="font-bold text-white">{child.name}</span>
                            <span className="text-purple-300 font-mono ml-1.5">({child.registrationNumber})</span>
                            <span className="text-slate-500 ml-1">Sec {child.section}</span>
                          </div>
                          <button
                            onClick={() => handleUnlinkStudent(p, child.id)}
                            className="p-1 text-slate-500 hover:text-rose-400"
                            title="Unlink child relationship"
                          >
                            <Unlink2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Action Button */}
              <div className="pt-3 border-t border-slate-800">
                <button
                  onClick={() => openLinkModal(p)}
                  className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold transition-colors flex items-center justify-center space-x-1.5"
                >
                  <Link2 className="w-4 h-4" />
                  <span>Link Student Registration #</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* LINK STUDENT MODAL */}
      {showLinkModal && selectedParent && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-sm p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Link2 className="w-5 h-5 text-purple-400" />
                Link Student to {selectedParent.name}
              </h3>
              <button onClick={() => setShowLinkModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleLinkStudent} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-400 font-semibold mb-1">Student Registration Number</label>
                <input
                  type="text"
                  required
                  value={childRegNo}
                  onChange={(e) => setChildRegNo(e.target.value)}
                  placeholder="e.g. 23CSE101 or 241FA04326"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white font-mono uppercase"
                />
              </div>

              <div className="pt-3 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowLinkModal(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting || !childRegNo}
                  className="px-5 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-xl font-bold disabled:opacity-50"
                >
                  {submitting ? 'Linking...' : 'Confirm Link'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminParentsPage;
