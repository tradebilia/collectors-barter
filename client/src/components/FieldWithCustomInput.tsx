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
  const customError = error && showCustomInput ? `Custom ${field.label} is required` : undefined;
  
  if (['isGraded', 'firstAppearance', 'numberOfSignatures'].includes(field.name)) {
    console.log('[FieldWithCustomInput]', { fieldName: field.name, value, inputType: field.inputType, showCustomInput });
  }

  return (
    <div className="w-full">
      {/* Labels Row */}
      <div className="flex gap-3 mb-2">
        <div className="flex-1">
          <label className="text-sm font-medium text-white block">
            {field.label}
            {field.requirement === 'required' && <span className="text-red-500 ml-1">*</span>}
          </label>
        </div>
        {showCustomInput && (
          <div className="flex-1">
            <label className="text-sm font-medium text-white block">
              {field.otherFieldName || `Custom ${field.label}`}
            </label>
          </div>
        )}
      </div>
      
      {/* Inputs Row */}
      <div className="flex gap-3">
        <div className="flex-1">
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
          <div className="flex-1">
            <input
              type="text"
              value={customValue}
              onChange={(e) => onOtherChange(e.target.value)}
              placeholder=""
              className={`bg-white text-black border rounded-md px-3 py-2 w-full h-9 focus:outline-none focus:ring-2 ${
                customError ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 focus:ring-blue-500'
              }`}
            />
            {customError && (
              <p className="text-red-500 text-xs mt-1">{customError}</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default FieldWithCustomInput;
