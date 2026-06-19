/**
 * Collapsible Form Section Component
 * Groups form fields by requirement level with collapsible sections
 */

import React, { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface CollapsibleFormSectionProps {
  title: string;
  icon?: React.ReactNode;
  fieldCount?: number;
  children: React.ReactNode;
  defaultExpanded?: boolean;
  className?: string;
}

export const CollapsibleFormSection: React.FC<CollapsibleFormSectionProps> = ({
  title,
  icon,
  fieldCount,
  children,
  defaultExpanded = true,
  className = '',
}) => {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  return (
    <div className={`border-b border-gray-200 last:border-b-0 ${className}`}>
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between py-4 px-0 hover:bg-gray-50 transition rounded-lg"
      >
        <div className="flex items-center gap-3">
          {icon && <span className="text-xl">{icon}</span>}
          <div className="text-left">
            <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
            {fieldCount && (
              <p className="text-sm text-gray-500">
                {fieldCount} field{fieldCount !== 1 ? 's' : ''}
              </p>
            )}
          </div>
        </div>
        <ChevronDown
          className={`w-5 h-5 text-gray-600 transition-transform ${
            isExpanded ? 'rotate-180' : ''
          }`}
        />
      </button>

      {isExpanded && (
        <div className="pb-4 grid grid-cols-1 gap-4 animate-in fade-in duration-200">
          {children}
        </div>
      )}
    </div>
  );
};

export default CollapsibleFormSection;
