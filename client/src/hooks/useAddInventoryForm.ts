/**
 * useAddInventoryForm Hook
 * Manages form state, validation, and conditional field logic
 */

import { useState, useCallback, useMemo } from 'react';
import { FieldDefinition, CollectibleCategory, COMMON_FIELDS } from '@/lib/formFieldDefinitions';
import { ALL_FIELD_DEFINITIONS } from '@/lib/fieldDefinitionsComplete';
import { REMAINING_FIELD_DEFINITIONS } from '@/lib/fieldDefinitionsRemaining';

const ALL_DEFINITIONS: Record<string, Record<string, FieldDefinition[]>> = {
  ...ALL_FIELD_DEFINITIONS,
  ...REMAINING_FIELD_DEFINITIONS,
} as const;

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
  getItemDetails: () => Record<string, string>;
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

    // Get category-specific fields (which already include common fields like listingTitle, tradeValue)
    const categoryDef = ALL_DEFINITIONS[formData.category as any] as Record<string, FieldDefinition[]> | undefined;
    const categorySpecificFields = categoryDef ? (categoryDef[formData.itemType] || []) : [];

    // Filter out photos field since it has its own dedicated sticky panel
    return categorySpecificFields.filter(f => f.name !== 'photos');
  }, [formData.category, formData.itemType]);

  // Evaluate conditional logic
  const evaluateCondition = useCallback(
    (condition: string | undefined): boolean => {
      if (!condition) return true;

      // Handle numeric comparisons like "numberOfSignatures > 0"
      const numericComparisonMatch = condition.match(/^([a-zA-Z]+)\s*([><=!]+)\s*(.+)$/);
      if (numericComparisonMatch) {
        const [, fieldName, operator, expectedValue] = numericComparisonMatch;
        // Convert field name to camelCase if needed
        const fieldKey = fieldName
          .split(' ')
          .map((word, index) => {
            if (index === 0) return word.toLowerCase();
            return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
          })
          .join('');

        const actualValue = formData[fieldKey];
        const actualNum = parseInt(actualValue) || 0;
        const expectedNum = parseInt(expectedValue) || 0;

        let result = false;
        if (operator === '>') result = actualNum > expectedNum;
        else if (operator === '<') result = actualNum < expectedNum;
        else if (operator === '>=') result = actualNum >= expectedNum;
        else if (operator === '<=') result = actualNum <= expectedNum;
        else if (operator === '=' || operator === '==') result = actualNum === expectedNum;
        else if (operator === '!=' || operator === '<>') result = actualNum !== expectedNum;

        console.log(`[Conditional] Numeric: ${condition} | fieldKey: ${fieldKey} | actualValue: ${actualValue} (${actualNum}) | operator: ${operator} | expectedValue: ${expectedValue} (${expectedNum}) | result: ${result}`);
        return result;
      }

      // Handle equality comparisons like "Is Graded = Yes"
      const [fieldName, expectedValue] = condition.split('=').map((s) => s.trim());
      // Convert "Is Graded" to "isGraded" (camelCase)
      const fieldKey = fieldName
        .split(' ')
        .map((word, index) => {
          if (index === 0) return word.toLowerCase();
          return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
        })
        .join('');

      const actualValue = formData[fieldKey];
      const result = actualValue === expectedValue;
      console.log(`[Conditional] Equality: ${condition} | fieldKey: ${fieldKey} | actualValue: ${actualValue} | expectedValue: ${expectedValue} | result: ${result}`);
      return result;
    },
    [formData]
  );

  // Check if a field should be shown
  const shouldShowField = useCallback(
    (field: FieldDefinition): boolean => {
      // If field has conditional logic, evaluate it regardless of requirement type
      if (field.conditionalLogic) {
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
    setFormData((prev) => {
      // Get the fields for this item type to initialize defaults
      const categoryDef = ALL_DEFINITIONS[prev.category as CollectibleCategory] as Record<string, FieldDefinition[]> | undefined;
      const itemTypeFields = categoryDef?.[itemType] || [];
      
      // Initialize form data with default values for all fields
      const initialData: FormData = {
        category: prev.category,
        itemType,
      };
      
      // Set default values for fields that have them
      itemTypeFields.forEach((field: FieldDefinition) => {
        if (field.defaultValue !== undefined) {
          initialData[field.name] = field.defaultValue;
        }
      });
      
      return initialData;
    });
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

  // Generate itemDetails object from form data
  const getItemDetails = useCallback((): Record<string, string> => {
    const itemDetails: Record<string, string> = {};
    
    // Exclude these fields from itemDetails as they have their own database columns
    const excludedFields = new Set([
      'category',
      'itemType',
      'title',
      'listingTitle',
      'description',
      'estimatedValue',
      'tradeValue',
      'shippingAvailable',
      'photos',
    ]);
    
    // Add all form data fields to itemDetails except excluded ones
    Object.entries(formData).forEach(([key, value]) => {
      if (!excludedFields.has(key) && value !== undefined && value !== null && value !== '') {
        // Convert arrays (like signatures) to JSON string
        if (Array.isArray(value)) {
          itemDetails[key] = JSON.stringify(value);
        } else {
          itemDetails[key] = String(value);
        }
      }
    });
    
    return itemDetails;
  }, [formData]);

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
    getItemDetails,
  };
};

export default useAddInventoryForm;
