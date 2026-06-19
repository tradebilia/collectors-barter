/**
 * Dynamic Field Renderer Component
 * Renders different field types based on field definition
 * Handles conditional visibility, validation, and error display
 */

import React, { useCallback } from 'react';
import { FieldDefinition } from '@/lib/formFieldDefinitions';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { AlertCircle, Upload, X } from 'lucide-react';

interface DynamicFieldRendererProps {
  field: FieldDefinition;
  value: any;
  onChange: (value: any) => void;
  onOtherChange?: (customValue: string) => void;
  error?: string;
  disabled?: boolean;
  showOtherInput?: boolean;
  otherValue?: string;
  uploadedFiles?: File[];
  onFilesChange?: (files: File[]) => void;
}

export const DynamicFieldRenderer: React.FC<DynamicFieldRendererProps> = ({
  field,
  value,
  onChange,
  onOtherChange,
  error,
  disabled = false,
  showOtherInput = false,
  otherValue = '',
  uploadedFiles = [],
  onFilesChange,
}) => {
  const isRequired = field.requirement === 'required';
  const hasError = !!error;

  const handleFileUpload = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(e.target.files || []);
      if (onFilesChange) {
        onFilesChange([...uploadedFiles, ...files]);
      }
    },
    [uploadedFiles, onFilesChange]
  );

  const removeFile = useCallback(
    (index: number) => {
      if (onFilesChange) {
        onFilesChange(uploadedFiles.filter((_, i) => i !== index));
      }
    },
    [uploadedFiles, onFilesChange]
  );

  const renderField = () => {
    switch (field.inputType) {
      case 'text':
        return (
          <Input
            type="text"
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
            disabled={disabled}
            placeholder={field.notes}
            className={hasError ? 'border-red-500' : ''}
          />
        );

      case 'number':
        return (
          <Input
            type="number"
            value={value || ''}
            onChange={(e) => onChange(e.target.value ? Number(e.target.value) : '')}
            disabled={disabled}
            min={field.validation?.min}
            max={field.validation?.max}
            className={hasError ? 'border-red-500' : ''}
          />
        );

      case 'currency':
        return (
          <div className="relative">
            <span className="absolute left-3 top-2.5 text-gray-500">$</span>
            <Input
              type="number"
              value={value || ''}
              onChange={(e) => onChange(e.target.value ? Number(e.target.value) : '')}
              disabled={disabled}
              min={field.validation?.min}
              placeholder="0.00"
              className={`pl-7 ${hasError ? 'border-red-500' : ''}`}
            />
          </div>
        );

      case 'textarea':
        return (
          <Textarea
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
            disabled={disabled}
            placeholder={field.notes}
            rows={4}
            className={hasError ? 'border-red-500' : ''}
          />
        );

      case 'dropdown':
        return (
          <Select value={value || ''} onValueChange={onChange} disabled={disabled}>
            <SelectTrigger className={hasError ? 'border-red-500' : ''}>
              <SelectValue placeholder="Select an option" />
            </SelectTrigger>
            <SelectContent>
              {field.dropdownOptions?.map((option) => (
                <SelectItem key={option} value={option}>
                  {option}
                </SelectItem>
              ))}
              {field.supportsOther && (
                <SelectItem value="Other">Other</SelectItem>
              )}
            </SelectContent>
          </Select>
        );

      case 'image-upload':
        return (
          <div className="space-y-3">
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-gray-400 transition">
              <label className="cursor-pointer flex flex-col items-center gap-2">
                <Upload className="w-8 h-8 text-gray-400" />
                <span className="text-sm font-medium text-gray-700">
                  Click to upload photos
                </span>
                <span className="text-xs text-gray-500">
                  PNG, JPG, GIF up to 10MB each
                </span>
                <input
                  type="file"
                  multiple
                  accept="image/*"
                  onChange={handleFileUpload}
                  className="hidden"
                  disabled={disabled}
                />
              </label>
            </div>

            {uploadedFiles.length > 0 && (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {uploadedFiles.map((file, index) => (
                  <div key={index} className="relative group">
                    <img
                      src={URL.createObjectURL(file)}
                      alt={`Upload ${index + 1}`}
                      className="w-full h-24 object-cover rounded-lg"
                    />
                    <button
                      onClick={() => removeFile(index)}
                      className="absolute top-1 right-1 bg-red-500 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <p className="text-sm text-gray-600">
              {uploadedFiles.length} photo{uploadedFiles.length !== 1 ? 's' : ''} uploaded
            </p>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-1">
        <Label htmlFor={field.name} className="text-sm font-medium">
          {field.label}
        </Label>
        {isRequired && <span className="text-white text-xs">*</span>}
      </div>

      <div className="space-y-2">
        {renderField()}

        {showOtherInput && field.supportsOther && value === 'Other' && (
          <Input
            type="text"
            value={otherValue}
            onChange={(e) => onOtherChange?.(e.target.value)}
            disabled={disabled}
            placeholder={`Enter ${field.otherFieldName || 'custom value'}`}
            className="mt-2"
          />
        )}
      </div>

      {error && (
        <div className="flex items-center gap-2 text-red-500 text-sm">
          <AlertCircle className="w-4 h-4" />
          <span>{error}</span>
        </div>
      )}

      {field.notes && !error && (
        <p className="text-xs text-gray-500">{field.notes}</p>
      )}
    </div>
  );
};

export default DynamicFieldRenderer;
