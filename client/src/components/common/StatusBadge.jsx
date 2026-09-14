import React from 'react';

export const StatusBadge = ({ status, className = '' }) => {
  const norm = String(status || '').toUpperCase().replace(/[\s-]/g, '_');

  let config = {
    bg: 'bg-slate-100',
    text: 'text-slate-700',
    border: 'border-slate-300',
    label: status,
  };

  switch (norm) {
    case 'SAFE':
    case 'LOW':
    case 'PRESENT':
    case 'COMPLETED':
    case 'APPROVED':
      config = {
        bg: 'bg-emerald-50',
        text: 'text-emerald-700',
        border: 'border-emerald-200',
        label: norm === 'SAFE' ? 'Safe' : norm === 'LOW' ? 'Low Risk' : norm === 'PRESENT' ? 'Present' : norm === 'COMPLETED' ? 'Completed' : 'Approved',
      };
      break;

    case 'WARNING':
    case 'MEDIUM':
    case 'IN_PROGRESS':
    case 'SCHEDULED':
    case 'PENDING':
      config = {
        bg: 'bg-amber-50',
        text: 'text-amber-700',
        border: 'border-amber-200',
        label: norm === 'WARNING' ? 'Warning' : norm === 'MEDIUM' ? 'Medium Risk' : norm === 'IN_PROGRESS' ? 'In Progress' : norm === 'SCHEDULED' ? 'Scheduled' : 'Pending',
      };
      break;

    case 'HIGH_RISK':
    case 'HIGH':
    case 'ABSENT':
    case 'REJECTED':
      config = {
        bg: 'bg-rose-50',
        text: 'text-rose-700',
        border: 'border-rose-200',
        label: norm === 'HIGH_RISK' ? 'High Risk' : norm === 'HIGH' ? 'High Risk' : norm === 'ABSENT' ? 'Absent' : 'Rejected',
      };
      break;

    case 'ON_DUTY':
    case 'EXCUSED':
      config = {
        bg: 'bg-blue-50',
        text: 'text-blue-700',
        border: 'border-blue-200',
        label: norm === 'ON_DUTY' ? 'On Duty' : 'Excused',
      };
      break;

    default:
      config = {
        bg: 'bg-slate-100',
        text: 'text-slate-700',
        border: 'border-slate-200',
        label: status || 'Unknown',
      };
  }

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${config.bg} ${config.text} ${config.border} ${className}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${config.text.replace('text-', 'bg-')}`} />
      {config.label}
    </span>
  );
};

export default StatusBadge;
