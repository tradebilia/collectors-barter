/**
 * Form Progress Indicator Component
 * Shows progress of required fields completion
 */

import React from 'react';

interface FormProgressIndicatorProps {
  totalRequiredFields: number;
  completedRequiredFields: number;
  className?: string;
}

export const FormProgressIndicator: React.FC<FormProgressIndicatorProps> = ({
  totalRequiredFields,
  completedRequiredFields,
  className = '',
}) => {
  const percentage = totalRequiredFields > 0 
    ? Math.round((completedRequiredFields / totalRequiredFields) * 100)
    : 0;

  const isComplete = completedRequiredFields === totalRequiredFields && totalRequiredFields > 0;

  return (
    <div className={`space-y-2 ${className}`}>
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-gray-700">
          Required fields completed
        </span>
        <span className="text-sm font-semibold text-gray-900">
          {completedRequiredFields}/{totalRequiredFields}
        </span>
      </div>

      <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
        <div
          className={`h-full transition-all duration-300 ${
            isComplete ? 'bg-green-500' : 'bg-blue-500'
          }`}
          style={{ width: `${percentage}%` }}
        />
      </div>

      {isComplete && (
        <p className="text-xs text-green-600 font-medium">
          ✓ All required fields completed!
        </p>
      )}
    </div>
  );
};

export default FormProgressIndicator;
