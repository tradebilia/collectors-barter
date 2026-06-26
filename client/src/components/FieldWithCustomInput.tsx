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

  // For textarea fields, render without flex constraints
  if (field.inputType === 'textarea') {
    return (
      <div className="w-full">
        <label className="text-sm font-medium text-white block mb-2">
          {field.label}
          {field.requirement === 'required' && <span className="text-red-500 ml-1">*</span>}
        </label>
        <DynamicFieldRenderer
          field={field}
          value={value}
          onChange={onChange}
          onOtherChange={onOtherChange}
          disabled={disabled}
          error={error}
          hideLabel={true}
        />
      </div>
    );
  }

  return (
    <div className="w-full">
      {/* Labels Row */}
      <div className="flex gap-3 mb-2">
        <div className="flex-1 min-w-0">
          <label className="text-sm font-medium text-white block whitespace-nowrap overflow-hidden text-ellipsis">
            {field.label}
            {field.requirement === 'required' && <span className="text-red-500 ml-1">*</span>}
          </label>
        </div>
        {showCustomInput && (
          <div className="flex-1 min-w-0">
            <label className="text-sm font-medium text-white block whitespace-nowrap overflow-hidden text-ellipsis">
              {field.otherFieldName || `Custom ${field.label}`}
            </label>
          </div>
        )}
        {!showCustomInput && (
          <div className="flex-1"></div>
        )}
      </div>
      
      {/* Fields Row */}
      <div className="flex gap-3 items-center flex-nowrap">
        <div className="flex-1 min-w-0 flex items-center">
        <DynamicFieldRenderer
          field={field}
          value={value}
          onChange={onChange}
          onOtherChange={onOtherChange}
          disabled={disabled}
          error={error}
          hideLabel={true}
        />
        </div>
        {showCustomInput && (
          <div className="flex-1 min-w-0 flex items-center">
            <input
              type="text"
              value={customValue}
              onChange={(e) => onOtherChange(e.target.value)}
              placeholder=""
              className="bg-white text-black border border-gray-300 rounded-md px-3 py-2 w-full h-9 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default FieldWithCustomInput;
