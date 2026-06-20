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
    <>
      <div>
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
        <div>
          <label className="text-sm font-medium text-white whitespace-nowrap block mb-2">
            {field.otherFieldName || `Custom ${field.label}`}
          </label>
          <input
            type="text"
            value={customValue}
            onChange={(e) => onOtherChange(e.target.value)}
            placeholder={`Enter ${field.otherFieldName || 'custom value'}`}
            style={{
              width: '100%',
              backgroundColor: 'white',
              color: 'black',
              border: '1px solid #e5e7eb',
              borderRadius: '0.375rem',
              padding: '0.625rem 0.75rem',
              fontSize: '1rem',
              fontFamily: 'inherit',
              boxSizing: 'border-box'
            }}
          />
        </div>
      )}
    </>
  );
};

export default FieldWithCustomInput;
