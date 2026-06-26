import React from 'react';
import { FieldDefinition } from '@/lib/formFieldDefinitions';
import { DynamicFieldRenderer } from './DynamicFieldRenderer';

interface FieldWithCustomInputProps {
  field: FieldDefinition;
  value: any;
  onChange: (value: any) => void;
  onOtherChange: (value: string) => void;
  formData: Record<string, any>;
  disabled?: boolean;
  error?: string;
}

export const FieldWithCustomInput: React.FC<FieldWithCustomInputProps> = ({
  field,
  value,
  onChange,
  onOtherChange,
  formData,
  disabled = false,
  error,
}) => {
  const showCustomInput = field.supportsOther && value === 'Other';
  const customFieldKey = `custom${field.name.charAt(0).toUpperCase() + field.name.slice(1)}`;
  const customValue = formData[customFieldKey] as string || '';

  return (
    <div className="w-full flex gap-3 items-start">
      <div className="flex-1 min-w-0">
        <DynamicFieldRenderer
          field={field}
          value={value}
          onChange={onChange}
          onOtherChange={onOtherChange}
          disabled={disabled}
          error={error}
        />
      </div>
      {showCustomInput && (
        <div className="flex-1 min-w-0">
          <label className="text-sm font-medium text-white whitespace-nowrap block mb-2">
            {field.otherFieldName || `Custom ${field.label}`}
          </label>
          <input
            type="text"
            value={customValue}
            onChange={(e) => onOtherChange(e.target.value)}
            placeholder={`Enter ${field.otherFieldName || `custom ${field.label.toLowerCase()}`}`}
            className="bg-white text-black border border-gray-300 rounded-md px-3 py-2 w-full focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      )}
    </div>
  );
};

export default FieldWithCustomInput;
