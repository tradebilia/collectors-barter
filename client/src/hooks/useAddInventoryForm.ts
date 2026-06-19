/**
 * useAddInventoryForm Hook
 * Manages form state, validation, and conditional field logic
 */

import { useState, useCallback, useMemo } from 'react';
import { FieldDefinition, CollectibleCategory } from '@/lib/formFieldDefinitions';
import { ALL_FIELD_DEFINITIONS } from '@/lib/fieldDefinitionsComplete';
import { REMAINING_FIELD_DEFINITIONS } from '@/lib/fieldDefinitionsRemaining';

const ALL_DEFINITIONS = {
  ...ALL_FIELD_DEFINITIONS,
  ...REMAINING_FIELD_DEFINITIONS,
};

interface FormErrors {
  [key: string]: string;
}

interface FormData {
  category: CollectibleCategory | '';
  itemType: string | '';
  [key: string]: any;
}

interface UseAddInventoryFormReturn {
  formData: FormData;
  errors: FormErrors;
  currentFields: FieldDefinition[];
  updateField: (fieldName: string, value: any) => void;
  updateOtherField: (fieldName: string, customValue: string) => void;
  setCategory: (category: CollectibleCategory) => void;
  setItemType: (itemType: string) => void;
  resetForm: () => void;
  validateForm: () => boolean;
  getRequiredFieldsCount: () => number;
  getCompletedRequiredFieldsCount: () => number;
  getFieldsByRequirement: (requirement: string) => FieldDefinition[];
  shouldShowField: (field: FieldDefinition) => boolean;
}

export const useAddInventoryForm = (): UseAddInventoryFormReturn => {
  const [formData, setFormData] = useState<FormData>({
    category: '',
    itemType: '',
  });

  const [errors, setErrors] = useState<FormErrors>({});

  // Get current fields based on selected category and item type
  const currentFields = useMemo(() => {
    if (!formData.category || !formData.itemType) return [];

    const categoryDef = ALL_DEFINITIONS[formData.category as CollectibleCategory] as Record<string, FieldDefinition[]> | undefined;
    if (!categoryDef) return [];

    return categoryDef[formData.itemType] || [];
  }, [formData.category, formData.itemType]);

  // Evaluate conditional logic
  const evaluateCondition = useCallback(
    (condition: string | undefined): boolean => {
      if (!condition) return true;

      // Parse condition like "Is Graded = Yes"
      const [fieldName, expectedValue] = condition.split('=').map((s) => s.trim());
      const fieldKey = fieldName
        .replace(/\s+/g, '')
        .replace(/([A-Z])/g, (m) => m.toLowerCase())
        .replace(/^./, (m) => m.toLowerCase());

      const actualValue = formData[fieldKey];
      return actualValue === expectedValue;
    },
    [formData]
  );

  // Check if a field should be shown
  const shouldShowField = useCallback(
    (field: FieldDefinition): boolean => {
      if (field.requirement === 'conditional' && field.conditionalLogic) {
        return evaluateCondition(field.conditionalLogic);
      }
      return true;
    },
    [evaluateCondition]
  );

  // Get fields by requirement level
  const getFieldsByRequirement = useCallback(
    (requirement: string): FieldDefinition[] => {
      return currentFields.filter(
        (field: FieldDefinition) => field.requirement === requirement && shouldShowField(field)
      );
    },
    [currentFields, shouldShowField]
  );

  // Count required fields
  const getRequiredFieldsCount = useCallback((): number => {
    return currentFields.filter((field: FieldDefinition) => field.requirement === 'required').length;
  }, [currentFields]);

  // Count completed required fields
  const getCompletedRequiredFieldsCount = useCallback((): number => {
    return currentFields.filter((field: FieldDefinition) => {
      if (field.requirement !== 'required') return false;
      if (!shouldShowField(field)) return false;

      const value = formData[field.name];
      
      // Check if field has a value
      if (field.inputType === 'image-upload') {
        return Array.isArray(value) && value.length > 0;
      }
      
      return value !== undefined && value !== null && value !== '';
    }).length;
  }, [currentFields, formData, shouldShowField]);

  // Update field value
  const updateField = useCallback((fieldName: string, value: any) => {
    setFormData((prev) => ({
      ...prev,
      [fieldName]: value,
    }));

    // Clear error for this field
    setErrors((prev) => {
      const newErrors = { ...prev };
      delete newErrors[fieldName];
      return newErrors;
    });
  }, []);

  // Update "Other" custom field
  const updateOtherField = useCallback((fieldName: string, customValue: string) => {
    const customFieldName = `custom${fieldName.charAt(0).toUpperCase() + fieldName.slice(1)}`;
    setFormData((prev) => ({
      ...prev,
      [customFieldName]: customValue,
    }));
  }, []);

  // Set category (resets item type and form data)
  const setCategory = useCallback((category: CollectibleCategory) => {
    setFormData((prev) => ({
      category,
      itemType: '',
    }));
    setErrors({});
  }, []);

  // Set item type (resets form data but keeps category)
  const setItemType = useCallback((itemType: string) => {
    setFormData((prev) => ({
      category: prev.category,
      itemType,
    }));
    setErrors({});
  }, []);

  // Reset entire form
  const resetForm = useCallback(() => {
    setFormData({
      category: '',
      itemType: '',
    });
    setErrors({});
  }, []);

  // Validate form
  const validateForm = useCallback((): boolean => {
    const newErrors: FormErrors = {};

    // Check category and item type
    if (!formData.category) {
      newErrors.category = 'Please select a category';
    }
    if (!formData.itemType) {
      newErrors.itemType = 'Please select an item type';
    }

    // Check required fields
    currentFields.forEach((field: FieldDefinition) => {
      if (field.requirement === 'required' && shouldShowField(field)) {
        const value = formData[field.name];

        if (field.inputType === 'image-upload') {
          if (!Array.isArray(value) || value.length === 0) {
            newErrors[field.name] = `${field.label} is required`;
          }
        } else if (value === undefined || value === null || value === '') {
          newErrors[field.name] = `${field.label} is required`;
        }

        // Validate Trade Value > 0
        if (field.name === 'estimatedValue' && value !== undefined && value !== null) {
          if (Number(value) <= 0) {
            newErrors[field.name] = 'Trade Value must be greater than 0';
          }
        }
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [formData, currentFields, shouldShowField]);

  return {
    formData,
    errors,
    currentFields,
    updateField,
    updateOtherField,
    setCategory,
    setItemType,
    resetForm,
    validateForm,
    getRequiredFieldsCount,
    getCompletedRequiredFieldsCount,
    getFieldsByRequirement,
    shouldShowField,
  };
};

export default useAddInventoryForm;
