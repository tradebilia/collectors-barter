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
    <div className="w-full flex flex-col">
      {/* Labels Row */}
      <div className="flex gap-2 mb-2 flex-wrap">
        <label className="text-sm font-medium text-white">
          {field.label}
          {field.requirement === 'required' && <span className="text-red-500 ml-1">*</span>}
        </label>
        {showCustomInput && (
          <label className="text-sm font-medium text-white">
            {field.otherFieldName || `Custom ${field.label}`}
          </label>
        )}
      </div>
      
      {/* Inputs Row */}
      <div className="flex gap-2 flex-wrap">
        <div className={showCustomInput ? "flex-1 min-w-[120px]" : "w-full"}>
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
          <div className="flex-1 min-w-[120px]">
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
