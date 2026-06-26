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
import { CountrySelect } from '@/components/CountrySelect';

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
  hideLabel?: boolean;
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
  hideLabel = false,
}) => {
  const isRequired = field.requirement === 'required';
  const hasError = !!error;
  
  // Debug logging for country field
  if (field.name === 'country') {
    console.log('Country field debug:', {
      name: field.name,
      inputType: field.inputType,
      dropdownOptions: field.dropdownOptions?.length,
      value,
    });
  }

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
        // Calculate width based on maxLength
        let widthClass = '';
        if (field.maxLength) {
          if (field.maxLength <= 4) widthClass = 'max-w-12';
          else if (field.maxLength <= 5) widthClass = 'max-w-16';
          else if (field.maxLength <= 7) widthClass = 'max-w-20';
          else if (field.maxLength <= 9) widthClass = 'max-w-24';
          else if (field.maxLength <= 10) widthClass = 'max-w-28';
          else if (field.maxLength <= 15) widthClass = 'max-w-32';
          else if (field.maxLength <= 20) widthClass = 'max-w-40';
          else if (field.maxLength <= 30) widthClass = 'max-w-56';
          else if (field.maxLength <= 40) widthClass = 'max-w-64';
          else widthClass = 'max-w-full';
        }
        return (
          <Input
            type="text"
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
            disabled={disabled}
            placeholder={field.notes}
            maxLength={field.maxLength}
            className={`bg-white text-black ${hasError ? 'border-red-500' : ''} ${widthClass || (field.gridColumn === 'half' ? 'max-w-xs' : '')}`}
          />
        );

      case 'number':
        // Calculate width based on maxLength
        let numberWidthClass = '';
        if (field.maxLength) {
          if (field.maxLength <= 4) numberWidthClass = 'max-w-16';
          else if (field.maxLength <= 5) numberWidthClass = 'max-w-40';
          else if (field.maxLength <= 7) numberWidthClass = 'max-w-48';
          else if (field.maxLength <= 9) numberWidthClass = 'max-w-56';
          else if (field.maxLength <= 10) numberWidthClass = 'max-w-64';
        }
        return (
          <Input
            type="number"
            value={value || ''}
            onChange={(e) => onChange(e.target.value ? Number(e.target.value) : '')}
            disabled={disabled}
            min={field.validation?.min}
            max={field.validation?.max}
            maxLength={field.maxLength}
            className={`bg-white text-black ${hasError ? 'border-red-500' : ''} ${numberWidthClass || (field.gridColumn === 'half' ? 'max-w-xs' : '')}`}
          />
        );

      case 'currency':
        return (
          <div className={`relative ${field.gridColumn === 'half' ? 'max-w-xs' : ''}`}>
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
            <Input
              type="number"
              value={value || ''}
              onChange={(e) => onChange(e.target.value ? Number(e.target.value) : '')}
              disabled={disabled}
              min={field.validation?.min}
              placeholder="0.00"
              className={`pl-7 bg-white text-black ${hasError ? 'border-red-500' : ''} w-full`}
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
            rows={8}
            className={`w-full bg-white text-black ${hasError ? 'border-red-500' : ''}`}
          />
        );

      case 'dropdown':
        // Standard dropdown for all fields
        return (
          <Select value={value || ''} onValueChange={onChange} disabled={disabled}>
            <SelectTrigger className={`bg-white text-black ${hasError ? 'border-red-500' : ''}`}>
              <SelectValue placeholder="Select an option" />
            </SelectTrigger>
            <SelectContent>
              {field.name === 'country' ? (
                // For country field: United States first, then separator, then other countries
                <>
                  <SelectItem value="United States">United States</SelectItem>
                  <div className="relative flex cursor-default select-none items-center justify-center border-t border-gray-200 py-1.5 text-xs text-gray-500">
                    ─────────────
                  </div>
                  {field.dropdownOptions?.filter((option: string) => option !== 'United States').map((option: string) => (
                    <SelectItem key={option} value={option}>
                      {option}
                    </SelectItem>
                  ))}
                </>
              ) : (
                // For other fields: render all options normally
                <>
                  {field.dropdownOptions?.map((option) => (
                    <SelectItem key={option} value={option}>
                      {option}
                    </SelectItem>
                  ))}
                  {field.supportsOther && !field.dropdownOptions?.includes('Other') && (
                    <SelectItem value="Other">Other</SelectItem>
                  )}
                </>
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

  // Determine grid column classes based on gridColumn property
  const gridColClass = field.inputType === 'textarea' ? 'col-span-full' : field.gridColumn === 'half' ? 'col-span-1 md:col-span-2' : field.gridColumn === 'third' ? 'col-span-1 md:col-span-3' : 'col-span-1';

  return (
    <div className={`${hideLabel ? '' : 'space-y-2'} ${gridColClass}`}>
      {!hideLabel && (
        <div className="flex items-start gap-1">
          {field.label && (
            <>
              <Label htmlFor={field.name} className="text-sm font-medium whitespace-nowrap">
                {field.label}
              </Label>
              {isRequired && <span className="text-white text-xs">*</span>}
            </>
          )}
        </div>
      )}

      <div className="space-y-2">
        {renderField()}

        {showOtherInput && field.supportsOther && value === 'Other' && (
          <input
            type="text"
            value={otherValue}
            onChange={(e) => onOtherChange?.(e.target.value)}
            disabled={disabled}
            placeholder={`Enter ${field.otherFieldName || 'custom value'}`}
            style={{
              width: '100%',
              backgroundColor: 'white',
              color: 'black',
              border: 'none',
              borderRadius: '0.375rem',
              padding: '0.625rem 0.75rem',
              fontSize: '1rem',
              fontFamily: 'inherit',
              boxSizing: 'border-box'
            }}
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
