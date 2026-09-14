import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import StatusBadge from '../../components/common/StatusBadge';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, X, Clock, User, BookOpen, Lock } from 'lucide-react';

export const AttendanceCalendarPage = () => {
  const [currentYear, setCurrentYear] = useState(2026);
  const [currentMonth, setCurrentMonth] = useState(8); // 8 = September (0-indexed)
  const [calendarData, setCalendarData] = useState({});
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(null);

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  useEffect(() => {
    fetchCalendar(currentMonth, currentYear);
  }, [currentMonth, currentYear]);

  const fetchCalendar = async (m, y) => {
    setLoading(true);
    try {
      const res = await api.get(`/student/attendance/calendar?month=${m}&year=${y}`);
      if (res.data?.success) {
        setCalendarData(res.data.data.days || {});
      }
    } catch (err) {
      console.error('Error loading attendance calendar:', err);
    } finally {
      setLoading(false);
    }
  };

  const prevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear(currentYear - 1);
    } else {
      setCurrentMonth(currentMonth - 1);
    }
    setSelectedDate(null);
  };

  const nextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear(currentYear + 1);
    } else {
      setCurrentMonth(currentMonth + 1);
    }
    setSelectedDate(null);
  };

  // Generate calendar matrix
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const firstDayIndex = new Date(currentYear, currentMonth, 1).getDay(); // 0 = Sun, 1 = Mon ...

  const daysArray = [];
  // Leading empty days
  for (let i = 0; i < firstDayIndex; i++) {
    daysArray.push(null);
  }
  // Days of month
  for (let d = 1; d <= daysInMonth; d++) {
    const dayStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    daysArray.push({
      day: d,
      dateString: dayStr,
      dayOfWeek: new Date(currentYear, currentMonth, d).getDay(),
      data: calendarData[dayStr] || null,
    });
  }

  const selectedDayRecord = selectedDate ? calendarData[selectedDate] : null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 text-xs font-semibold text-brand-800 uppercase tracking-wider mb-1">
            <CalendarIcon className="w-4 h-4" />
            <span>Academic Schedule Registry</span>
          </div>
          <h1 className="text-xl font-bold text-slate-900">Attendance Calendar</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Day-by-day attendance history. Click any calendar date to inspect class session details.
          </p>
        </div>

        <div className="flex items-center space-x-2 bg-slate-100 text-slate-600 px-3 py-1.5 rounded-lg text-xs font-medium border border-slate-200">
          <Lock className="w-3.5 h-3.5 text-slate-500" />
          <span>Read-Only</span>
        </div>
      </div>

      {/* Calendar Controls & Legend */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div className="flex items-center space-x-3">
            <h2 className="text-base font-bold text-slate-900">
              {monthNames[currentMonth]} {currentYear}
            </h2>
            <div className="flex items-center space-x-1">
              <button
                onClick={prevMonth}
                className="p-1 rounded-md border border-slate-200 hover:bg-slate-50 text-slate-600"
                title="Previous Month"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={nextMonth}
                className="p-1 rounded-md border border-slate-200 hover:bg-slate-50 text-slate-600"
                title="Next Month"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Legend */}
          <div className="flex items-center space-x-4 text-xs">
            <div className="flex items-center space-x-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block"></span>
              <span className="text-slate-600">Present</span>
            </div>
            <div className="flex items-center space-x-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500 inline-block"></span>
              <span className="text-slate-600">Absent</span>
            </div>
            <div className="flex items-center space-x-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-slate-300 inline-block"></span>
              <span className="text-slate-400">No Class / Off</span>
            </div>
          </div>
        </div>

        {/* Days of Week Header */}
        <div className="grid grid-cols-7 gap-2 mt-4 text-center">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day, idx) => (
            <div
              key={day}
              className={`text-xs font-semibold py-1 uppercase tracking-wider ${
                idx === 0 || idx === 6 ? 'text-slate-400' : 'text-slate-700'
              }`}
            >
              {day}
            </div>
          ))}
        </div>

        {/* Calendar Grid */}
        {loading ? (
          <LoadingSpinner text="Rendering calendar dates..." />
        ) : (
          <div className="grid grid-cols-7 gap-2 mt-2">
            {daysArray.map((cell, idx) => {
              if (!cell) {
                return (
                  <div
                    key={`empty-${idx}`}
                    className="h-20 sm:h-24 bg-slate-50/50 rounded-lg border border-transparent"
                  ></div>
                );
              }

              const isWeekend = cell.dayOfWeek === 0 || cell.dayOfWeek === 6;
              const hasData = !!cell.data;
              const isSelected = selectedDate === cell.dateString;

              return (
                <button
                  key={cell.dateString}
                  type="button"
                  onClick={() => setSelectedDate(cell.dateString)}
                  className={`h-20 sm:h-24 p-2 rounded-lg border text-left flex flex-col justify-between transition-all relative ${
                    isSelected
                      ? 'border-brand-900 ring-2 ring-brand-900 bg-brand-50/30'
                      : isWeekend
                      ? 'border-slate-100 bg-slate-50/70 text-slate-400 hover:border-slate-300'
                      : hasData
                      ? 'border-slate-200 bg-white hover:border-brand-600 hover:shadow-xs cursor-pointer'
                      : 'border-slate-100 bg-white text-slate-400 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span
                      className={`text-xs font-bold ${
                        isSelected ? 'text-brand-900' : isWeekend ? 'text-slate-400' : 'text-slate-800'
                      }`}
                    >
                      {cell.day}
                    </span>

                    {/* Indicators */}
                    {hasData && (
                      <div className="flex items-center space-x-1">
                        {cell.data.hasAbsent && (
                          <span className="w-2 h-2 rounded-full bg-rose-500" title="Absent classes"></span>
                        )}
                        {cell.data.hasPresent && (
                          <span className="w-2 h-2 rounded-full bg-emerald-500" title="Present classes"></span>
                        )}
                      </div>
                    )}
                  </div>

                  {hasData ? (
                    <div className="text-[10px] text-slate-500 font-medium">
                      <span className="hidden sm:inline">
                        {cell.data.classes.length} {cell.data.classes.length === 1 ? 'class' : 'classes'}
                      </span>
                      <span className="sm:hidden text-center block font-bold">
                        {cell.data.classes.length}
                      </span>
                    </div>
                  ) : (
                    <div className="text-[10px] text-slate-300">
                      {isWeekend ? 'Weekend' : '—'}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Date Inspection Modal / Drawer */}
      {selectedDate && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full p-6 border border-slate-200">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div>
                <span className="text-[11px] font-semibold text-brand-800 uppercase tracking-wider">
                  Session Inspection
                </span>
                <h3 className="text-base font-bold text-slate-900">
                  {new Date(selectedDate + 'T00:00:00').toLocaleDateString(undefined, {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </h3>
              </div>
              <button
                onClick={() => setSelectedDate(null)}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="py-4 space-y-3 max-h-96 overflow-y-auto">
              {!selectedDayRecord || selectedDayRecord.classes.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-400">
                  No academic sessions recorded on this date.
                </div>
              ) : (
                selectedDayRecord.classes.map((cls) => (
                  <div
                    key={cls.id}
                    className="p-3.5 rounded-lg border border-slate-200 bg-slate-50/60 flex items-start justify-between space-x-3"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center space-x-2">
                        <span className="text-xs font-bold text-brand-950 font-mono bg-white px-1.5 py-0.5 rounded border border-slate-200">
                          {cls.courseCode}
                        </span>
                        <span className="text-xs font-bold text-slate-800">{cls.courseName}</span>
                      </div>
                      <div className="flex items-center space-x-1.5 text-[11px] text-slate-500">
                        <User className="w-3 h-3 text-slate-400" />
                        <span>Faculty: {cls.faculty}</span>
                      </div>
                    </div>
                    <StatusBadge status={cls.status} />
                  </div>
                ))
              )}
            </div>

            <div className="pt-4 border-t border-slate-100 flex justify-between items-center text-xs text-slate-400">
              <span>Verified academic attendance registry</span>
              <button
                onClick={() => setSelectedDate(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-lg"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AttendanceCalendarPage;
