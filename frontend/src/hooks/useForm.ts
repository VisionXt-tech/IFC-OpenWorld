/**
 * Form Hooks
 *
 * Advanced hooks for form handling with validation support
 */

import React, { useState, useCallback } from 'react';
import { useFormValidation, type FormValidationConfig, type ValidationRule, ValidationRules } from '@/utils/validation';
import { logger } from '@/utils/logger';

/**
 * Form field props helper
 */
export interface FormFieldProps<T> {
  value: T;
  onChange: (event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => void;
  onBlur: () => void;
  error?: string;
  touched?: boolean;
  hasError: boolean;
}

/**
 * Use form field - simplified hook for individual fields
 */
export function useFormField<T extends Record<string, unknown>, K extends keyof T>(
  form: ReturnType<typeof useFormValidation<T>>,
  fieldName: K
): FormFieldProps<T[K]> {
  const hasError = form.touched[fieldName] === true && form.errors[fieldName] !== undefined;

  return {
    value: form.values[fieldName],
    onChange: form.handleChange(fieldName),
    onBlur: form.handleBlur(fieldName),
    error: form.errors[fieldName],
    touched: form.touched[fieldName],
    hasError,
  };
}

/**
 * Building form data
 */
export interface BuildingFormData extends Record<string, unknown> {
  name: string;
  address: string;
  city: string;
  country: string;
  height: number | '';
  floorCount: number | '';
  latitude: number | '';
  longitude: number | '';
}

/**
 * Use building form - specific hook for building metadata
 */
export function useBuildingForm(initialData?: Partial<BuildingFormData>) {
  const initialValues: BuildingFormData = {
    name: initialData?.name || '',
    address: initialData?.address || '',
    city: initialData?.city || '',
    country: initialData?.country || '',
    height: initialData?.height || '',
    floorCount: initialData?.floorCount || '',
    latitude: initialData?.latitude || '',
    longitude: initialData?.longitude || '',
  };

  const validationConfig: FormValidationConfig = {
    name: {
      rules: [
        ValidationRules.required('Building name is required') as ValidationRule,
        ValidationRules.minLength(2, 'Name must be at least 2 characters') as ValidationRule,
        ValidationRules.maxLength(100, 'Name must not exceed 100 characters') as ValidationRule,
      ],
      validateOn: 'blur',
    },
    address: {
      rules: [
        ValidationRules.required('Address is required') as ValidationRule,
        ValidationRules.minLength(5, 'Address must be at least 5 characters') as ValidationRule,
      ],
      validateOn: 'blur',
    },
    city: {
      rules: [
        ValidationRules.required('City is required') as ValidationRule,
        ValidationRules.minLength(2, 'City must be at least 2 characters') as ValidationRule,
      ],
      validateOn: 'blur',
    },
    country: {
      rules: [
        ValidationRules.required('Country is required') as ValidationRule,
        ValidationRules.minLength(2, 'Country must be at least 2 characters') as ValidationRule,
      ],
      validateOn: 'blur',
    },
    height: {
      rules: [
        ValidationRules.numeric('Height must be a number') as ValidationRule,
        ValidationRules.min(0, 'Height must be positive') as ValidationRule,
      ],
      validateOn: 'change',
    },
    floorCount: {
      rules: [
        ValidationRules.numeric('Floor count must be a number') as ValidationRule,
        ValidationRules.min(1, 'Building must have at least 1 floor') as ValidationRule,
        ValidationRules.max(500, 'Floor count seems unrealistic') as ValidationRule,
      ],
      validateOn: 'change',
    },
    latitude: {
      rules: [
        ValidationRules.required('Latitude is required') as ValidationRule,
        ValidationRules.numeric('Latitude must be a number') as ValidationRule,
        ValidationRules.range(-90, 90, 'Latitude must be between -90 and 90') as ValidationRule,
      ],
      validateOn: 'blur',
    },
    longitude: {
      rules: [
        ValidationRules.required('Longitude is required') as ValidationRule,
        ValidationRules.numeric('Longitude must be a number') as ValidationRule,
        ValidationRules.range(-180, 180, 'Longitude must be between -180 and 180') as ValidationRule,
      ],
      validateOn: 'blur',
    },
  };

  return useFormValidation(initialValues, validationConfig);
}

/**
 * Search form data
 */
export interface SearchFormData extends Record<string, unknown> {
  query: string;
  country?: string;
  city?: string;
  minHeight?: number | '';
  maxHeight?: number | '';
  minFloors?: number | '';
  maxFloors?: number | '';
}

/**
 * Use search form - hook for building search
 */
export function useSearchForm() {
  const initialValues: SearchFormData = {
    query: '',
    country: '',
    city: '',
    minHeight: '',
    maxHeight: '',
    minFloors: '',
    maxFloors: '',
  };

  const validationConfig: FormValidationConfig = {
    minHeight: {
      rules: [
        ValidationRules.numeric('Height must be a number') as ValidationRule,
        ValidationRules.min(0, 'Height must be positive') as ValidationRule,
      ],
      validateOn: 'change',
    },
    maxHeight: {
      rules: [
        ValidationRules.numeric('Height must be a number') as ValidationRule,
        ValidationRules.min(0, 'Height must be positive') as ValidationRule,
        ValidationRules.custom(
          (value: unknown, formValues?: Record<string, unknown>) => {
            const minHeight = formValues?.minHeight as number;
            const maxHeight = value as number;
            if (minHeight && maxHeight && maxHeight < minHeight) {
              return false;
            }
            return true;
          },
          'Max height must be greater than min height'
        ) as ValidationRule,
      ],
      validateOn: 'change',
    },
    minFloors: {
      rules: [
        ValidationRules.numeric('Floor count must be a number') as ValidationRule,
        ValidationRules.min(1, 'Floor count must be at least 1') as ValidationRule,
      ],
      validateOn: 'change',
    },
    maxFloors: {
      rules: [
        ValidationRules.numeric('Floor count must be a number') as ValidationRule,
        ValidationRules.min(1, 'Floor count must be at least 1') as ValidationRule,
        ValidationRules.custom(
          (value: unknown, formValues?: Record<string, unknown>) => {
            const minFloors = formValues?.minFloors as number;
            const maxFloors = value as number;
            if (minFloors && maxFloors && maxFloors < minFloors) {
              return false;
            }
            return true;
          },
          'Max floors must be greater than min floors'
        ) as ValidationRule,
      ],
      validateOn: 'change',
    },
  };

  return useFormValidation(initialValues, validationConfig);
}

/**
 * Use async form submission
 */
export function useAsyncFormSubmit<T>(
  onSubmit: (data: T) => Promise<void>,
  options?: {
    onSuccess?: () => void;
    onError?: (error: Error) => void;
  }
) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const handleSubmit = useCallback(
    async (data: T) => {
      setIsSubmitting(true);
      setSubmitError(null);

      try {
        await onSubmit(data);
        options?.onSuccess?.();
        logger.info('[Form] Form submitted successfully');
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'An error occurred';
        setSubmitError(errorMessage);
        options?.onError?.(error as Error);
        logger.error('[Form] Form submission error:', error);
      } finally {
        setIsSubmitting(false);
      }
    },
    [onSubmit, options]
  );

  return {
    isSubmitting,
    submitError,
    handleSubmit,
  };
}

/**
 * Use form persistence (save to localStorage)
 */
export function useFormPersistence<T extends Record<string, unknown>>(
  key: string,
  form: ReturnType<typeof useFormValidation<T>>
) {
  // Save to localStorage on values change
  useCallback(() => {
    try {
      localStorage.setItem(key, JSON.stringify(form.values));
      logger.debug(`[Form] Saved form state to localStorage: ${key}`);
    } catch (error) {
      logger.error('[Form] Failed to save form state:', error);
    }
  }, [key, form.values]);

  // Load from localStorage
  const loadFormState = useCallback(() => {
    try {
      const saved = localStorage.getItem(key);
      if (saved) {
        const parsed = JSON.parse(saved) as Partial<T>;
        form.setValues(parsed);
        logger.debug(`[Form] Loaded form state from localStorage: ${key}`);
        return true;
      }
    } catch (error) {
      logger.error('[Form] Failed to load form state:', error);
    }
    return false;
  }, [key, form]);

  // Clear saved state
  const clearFormState = useCallback(() => {
    try {
      localStorage.removeItem(key);
      logger.debug(`[Form] Cleared form state from localStorage: ${key}`);
    } catch (error) {
      logger.error('[Form] Failed to clear form state:', error);
    }
  }, [key]);

  return {
    loadFormState,
    clearFormState,
  };
}
