import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import {
  Bell,
  CheckCheck,
  AlertTriangle,
  Calendar,
  Info,
  ShieldCheck,
  ClipboardCheck,
} from 'lucide-react';

export const FacultyNotificationsPage = () => {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const fetchNotifications = async () => {
    try {
      const res = await api.get('/faculty/notifications');
      if (res.data?.success) {
        setNotifications(res.data.data.notifications);
        setUnreadCount(res.data.data.unreadCount);
      }
    } catch (err) {
      console.error('Error fetching notifications:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

  const handleMarkAllRead = async () => {
    try {
      await api.patch('/faculty/notifications/mark-all-read');
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch (err) {
      console.error('Error marking notifications read:', err);
    }
  };

  const handleMarkSingleRead = async (id) => {
    try {
      await api.patch(`/faculty/notifications/${id}/read`);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (err) {
      console.error('Error marking notification read:', err);
    }
  };

  const getIcon = (type) => {
    switch (type) {
      case 'ATTENDANCE_WARNING':
        return <AlertTriangle className="w-5 h-5 text-rose-600" />;
      case 'INTERVENTION_UPDATE':
        return <Calendar className="w-5 h-5 text-blue-600" />;
      case 'SYSTEM':
        return <ClipboardCheck className="w-5 h-5 text-emerald-600" />;
      default:
        return <Bell className="w-5 h-5 text-slate-600" />;
    }
  };

  if (loading) return <LoadingSpinner text="Fetching official notifications..." />;

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs flex items-center justify-between">
        <div>
          <div className="flex items-center space-x-2 text-xs font-semibold text-blue-800 uppercase tracking-wider mb-1">
            <Bell className="w-4 h-4" />
            <span>Alerts & Communications</span>
          </div>
          <h1 className="text-xl font-bold text-slate-900">Faculty Notifications</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Real-time updates on attendance drops, follow-ups, and audit confirmations.
          </p>
        </div>

        {unreadCount > 0 && (
          <button
            onClick={handleMarkAllRead}
            className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition-colors"
          >
            <CheckCheck className="w-4 h-4" />
            <span>Mark all as read</span>
          </button>
        )}
      </div>

      {/* Notifications List */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden divide-y divide-slate-100">
        {notifications.length === 0 ? (
          <div className="py-16 text-center text-slate-400 text-xs">
            No notifications on record.
          </div>
        ) : (
          notifications.map((n) => (
            <div
              key={n.id}
              onClick={() => !n.isRead && handleMarkSingleRead(n.id)}
              className={`p-5 flex items-start space-x-4 transition-colors ${
                n.isRead ? 'bg-white opacity-85' : 'bg-blue-50/40 cursor-pointer hover:bg-blue-50/70'
              }`}
            >
              <div className="p-2 rounded-xl bg-slate-100 flex-shrink-0 mt-0.5">
                {getIcon(n.type)}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <h3 className={`text-xs font-bold ${n.isRead ? 'text-slate-800' : 'text-blue-900'}`}>
                    {n.title}
                  </h3>
                  <span className="text-[10px] text-slate-400 whitespace-nowrap">
                    {new Date(n.createdAt).toLocaleDateString()}
                  </span>
                </div>

                <p className="text-xs text-slate-600 mt-1 leading-relaxed">{n.message}</p>
              </div>

              {!n.isRead && (
                <span className="w-2 h-2 rounded-full bg-blue-600 flex-shrink-0 mt-1.5" title="Unread"></span>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default FacultyNotificationsPage;
