/*
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

    if (formData.category === 'comics' && formData.itemType === 'single_comic') {
      console.log(`[currentFields] Comics Single Comic: found ${categorySpecificFields.length} fields`);
      const numberOfSignaturesField = categorySpecificFields.find(f => f.name === 'numberOfSignatures');
      if (numberOfSignaturesField) {
        console.log(`[currentFields] numberOfSignatures field found:`, numberOfSignaturesField);
      }
    }

    // Filter out photos field since it has its own dedicated sticky panel
    return categorySpecificFields.filter(f => f.name !== 'photos');
  }, [formData.category, formData.itemType]);


  // Evaluate conditional logic
  const evaluateCondition = useCallback(
    (condition: string | undefined): boolean => {
      if (!condition) return true;

      // Handle numeric comparisons like "numberOfSignatures > 0" (but not "Signed = Yes")
      // Only match comparison operators: >, <, >=, <=, !=, <>, ==  (NOT single =)
      const numericComparisonMatch = condition.match(/^([a-zA-Z]+)\s*(>=|<=|!=|<>|==|[><])\s*(.+)$/);
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

        return result;
      }

      // Handle string equality like "isGraded = Yes" or "Condition = Mint" or "Is Graded = Yes"
      const stringEqualityMatch = condition.match(/^([a-zA-Z\s]+)\s*=\s*(.+)$/);
      if (stringEqualityMatch) {
        const [, fieldName, expectedValue] = stringEqualityMatch;
        const fieldKey = fieldName
          .trim()
          .split(' ')
          .map((word, index) => {
            if (index === 0) return word.toLowerCase();
            return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
          })
          .join('');

        const actualValue = formData[fieldKey];
        return actualValue === expectedValue.trim();
      }

      return true;
    },
    [formData]
  );

  // Check if field should be shown based on visibility conditions
  const shouldShowField = useCallback(
    (field: FieldDefinition): boolean => {
      if (!field.conditionalLogic) return true;
      return evaluateCondition(field.conditionalLogic);
    },
    [evaluateCondition]
  );

  // Get fields by requirement type
  const getFieldsByRequirement = useCallback(
    (requirement: string): FieldDefinition[] => {
      return currentFields.filter(
        (field: FieldDefinition) =>
          field.requirement === requirement && shouldShowField(field)
      );
    },
    [currentFields, shouldShowField]
  );

  // Count required fields
  const getRequiredFieldsCount = useCallback((): number => {
    // Count only visible required fields (exclude conditional fields that aren't activated)
    const requiredFieldsCount = currentFields.filter((field: FieldDefinition) => field.requirement === 'required' && shouldShowField(field)).length;
    
    // Add 3 for: Shipping (1), Description (1), Photos (1)
    const sectionCount = 3;
    
    return requiredFieldsCount + sectionCount;
  }, [currentFields, shouldShowField]);

  // Count completed required fields
  const getCompletedRequiredFieldsCount = useCallback((): number => {
    // Count completed visible required fields only (not conditional fields that aren't shown)
    const completedFieldsCount = currentFields.filter((field: FieldDefinition) => {
      if (field.requirement !== 'required') return false;
      if (!shouldShowField(field)) return false;

      const value = formData[field.name];
      
      // Check if field has a value
      if (field.inputType === 'image-upload') {
        return Array.isArray(value) && value.length > 0;
      }
      
      return value !== undefined && value !== null && value !== '';
    }).length;
    
    // Count completed sections: Shipping, Description, Photos
    let completedSections = 0;
    
    // Shipping is always required
    if (formData.shippingAvailable !== undefined && formData.shippingAvailable !== null && formData.shippingAvailable !== '') {
      completedSections++;
    }
    
    // Description is always required
    if (formData.description !== undefined && formData.description !== null && formData.description !== '') {
      completedSections++;
    }
    
    // Photos are always required (at least 1)
    if (Array.isArray(formData.photos) && formData.photos.length > 0) {
      completedSections++;
    }
    
    return completedFieldsCount + completedSections;
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
      ...prev,
      category,
      itemType: '',
    }));
  }, []);

  // Set item type
  const setItemType = useCallback((itemType: string) => {
    setFormData((prev) => ({
      ...prev,
      itemType,
    }));
  }, []);

  // Reset form
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

    // Check required fields
    currentFields.forEach((field: FieldDefinition) => {
      if (field.requirement === 'required' && shouldShowField(field)) {
        const value = formData[field.name];
        if (value === undefined || value === null || value === '') {
          newErrors[field.name] = `${field.label} is required`;
        }
      }
    });

    // Check shipping
    if (formData.shippingAvailable === undefined || formData.shippingAvailable === null || formData.shippingAvailable === '') {
      newErrors.shippingAvailable = 'Shipping availability is required';
    }

    // Check description
    if (formData.description === undefined || formData.description === null || formData.description === '') {
      newErrors.description = 'Description is required';
    }

    // Check photos
    if (!Array.isArray(formData.photos) || formData.photos.length === 0) {
      newErrors.photos = 'At least 1 photo is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [currentFields, formData, shouldShowField]);

  // Get item details (all fields except category, itemType, shippingAvailable, description, photos)
  const getItemDetails = useCallback((): Record<string, string> => {
    const details: Record<string, string> = {};
    
    Object.entries(formData).forEach(([key, value]) => {
      if (!['category', 'itemType', 'shippingAvailable', 'description', 'photos'].includes(key)) {
        details[key] = String(value || '');
      }
    });

    return details;
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
