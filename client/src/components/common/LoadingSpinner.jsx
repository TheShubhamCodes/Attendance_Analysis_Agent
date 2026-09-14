import React from 'react';

export const LoadingSpinner = ({ text = 'Loading records...' }) => {
  return (
    <div className="flex flex-col items-center justify-center py-16 space-y-3">
      <div className="w-8 h-8 border-3 border-brand-900 border-t-transparent rounded-full animate-spin"></div>
      <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">{text}</p>
    </div>
  );
};

export default LoadingSpinner;
