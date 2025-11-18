/**
 * Form Validation Utilities
 *
 * Provides comprehensive form validation with:
 * - Built-in validation rules (required, email, url, etc.)
 * - Custom validation functions
 * - Form state management hook
 * - Async validation support
 * - Error message management
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import { logger } from './logger';

/**
 * Validation rule result
 */
export type ValidationResult = string | null | undefined;

/**
 * Validation rule function
 */
export type ValidationRule<T = unknown> = (
  value: T,
  formValues?: Record<string, unknown>
) => ValidationResult | Promise<ValidationResult>;

/**
 * Field validation config
 */
export interface FieldValidation<T = unknown> {
  rules: ValidationRule<T>[];
  validateOn?: 'change' | 'blur' | 'submit';
  debounce?: number; // Debounce validation in ms (useful for async validation)
}

/**
 * Form validation config
 */
export interface FormValidationConfig {
  [field: string]: FieldValidation;
}

/**
 * Form validation state
 */
export interface FormValidationState<T extends Record<string, unknown>> {
  values: T;
  errors: Partial<Record<keyof T, string>>;
  touched: Partial<Record<keyof T, boolean>>;
  isValidating: boolean;
  isValid: boolean;
  isDirty: boolean;
}

/**
 * Form validation actions
 */
export interface FormValidationActions<T extends Record<string, unknown>> {
  setValue: (field: keyof T, value: unknown) => void;
  setValues: (values: Partial<T>) => void;
  setError: (field: keyof T, error: string | null) => void;
  setTouched: (field: keyof T, touched: boolean) => void;
  validateField: (field: keyof T) => Promise<boolean>;
  validateForm: () => Promise<boolean>;
  resetForm: () => void;
  resetField: (field: keyof T) => void;
  handleChange: (field: keyof T) => (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => void;
  handleBlur: (field: keyof T) => () => void;
  handleSubmit: (onSubmit: (values: T) => void | Promise<void>) => (event: React.FormEvent) => Promise<void>;
}

/**
 * Form validation hook return type
 */
export type UseFormValidation<T extends Record<string, unknown>> = FormValidationState<T> & FormValidationActions<T>;

/**
 * Built-in validation rules
 */
export const ValidationRules = {
  /**
   * Required field
   */
  required: (message = 'This field is required'): ValidationRule => {
    return (value: unknown) => {
      if (value === null || value === undefined) return message;
      if (typeof value === 'string' && value.trim() === '') return message;
      if (Array.isArray(value) && value.length === 0) return message;
      return null;
    };
  },

  /**
   * Email validation
   */
  email: (message = 'Invalid email address'): ValidationRule<string> => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return (value: string) => {
      if (!value) return null; // Use with required() for mandatory emails
      return emailRegex.test(value) ? null : message;
    };
  },

  /**
   * URL validation
   */
  url: (message = 'Invalid URL'): ValidationRule<string> => {
    return (value: string) => {
      if (!value) return null;
      try {
        new URL(value);
        return null;
      } catch {
        return message;
      }
    };
  },

  /**
   * Minimum length
   */
  minLength: (min: number, message?: string): ValidationRule<string> => {
    return (value: string) => {
      if (!value) return null;
      return value.length >= min ? null : (message || `Minimum ${min} characters required`);
    };
  },

  /**
   * Maximum length
   */
  maxLength: (max: number, message?: string): ValidationRule<string> => {
    return (value: string) => {
      if (!value) return null;
      return value.length <= max ? null : (message || `Maximum ${max} characters allowed`);
    };
  },

  /**
   * Pattern validation (regex)
   */
  pattern: (regex: RegExp, message = 'Invalid format'): ValidationRule<string> => {
    return (value: string) => {
      if (!value) return null;
      return regex.test(value) ? null : message;
    };
  },

  /**
   * Numeric validation
   */
  numeric: (message = 'Must be a number'): ValidationRule<string | number> => {
    return (value: string | number) => {
      if (!value && value !== 0) return null;
      const num = typeof value === 'number' ? value : Number(value);
      return !isNaN(num) && isFinite(num) ? null : message;
    };
  },

  /**
   * Minimum value (for numbers)
   */
  min: (min: number, message?: string): ValidationRule<number> => {
    return (value: number) => {
      if (value === null || value === undefined) return null;
      return value >= min ? null : (message || `Minimum value is ${min}`);
    };
  },

  /**
   * Maximum value (for numbers)
   */
  max: (max: number, message?: string): ValidationRule<number> => {
    return (value: number) => {
      if (value === null || value === undefined) return null;
      return value <= max ? null : (message || `Maximum value is ${max}`);
    };
  },

  /**
   * Range validation (inclusive)
   */
  range: (min: number, max: number, message?: string): ValidationRule<number> => {
    return (value: number) => {
      if (value === null || value === undefined) return null;
      return value >= min && value <= max ? null : (message || `Value must be between ${min} and ${max}`);
    };
  },

  /**
   * Match another field
   */
  matches: (fieldName: string, message?: string): ValidationRule => {
    return (value: unknown, formValues?: Record<string, unknown>) => {
      if (!formValues) return null;
      return value === formValues[fieldName] ? null : (message || `Does not match ${fieldName}`);
    };
  },

  /**
   * One of (enum validation)
   */
  oneOf: (values: unknown[], message?: string): ValidationRule => {
    return (value: unknown) => {
      return values.includes(value) ? null : (message || `Must be one of: ${values.join(', ')}`);
    };
  },

  /**
   * Custom validation
   */
  custom: (validator: (value: unknown) => boolean, message: string): ValidationRule => {
    return (value: unknown) => {
      return validator(value) ? null : message;
    };
  },

  /**
   * Async validation (e.g., check if username exists)
   */
  async: (validator: (value: unknown) => Promise<boolean>, message: string): ValidationRule => {
    return async (value: unknown) => {
      try {
        const isValid = await validator(value);
        return isValid ? null : message;
      } catch (error) {
        logger.error('[Validation] Async validation error:', error);
        return 'Validation error occurred';
      }
    };
  },
};

/**
 * Form validation hook
 */
export function useFormValidation<T extends Record<string, unknown>>(
  initialValues: T,
  validationConfig: FormValidationConfig = {}
): UseFormValidation<T> {
  const [values, setValuesState] = useState<T>(initialValues);
  const [errors, setErrors] = useState<Partial<Record<keyof T, string>>>({});
  const [touched, setTouched] = useState<Partial<Record<keyof T, boolean>>>({});
  const [isValidating, setIsValidating] = useState(false);
  const validationTimeouts = useRef<Map<string, NodeJS.Timeout>>(new Map());

  // Compute derived state
  const isValid = Object.keys(errors).length === 0;
  const isDirty = JSON.stringify(values) !== JSON.stringify(initialValues);

  /**
   * Validate a single field
   */
  const validateField = useCallback(
    async (field: keyof T): Promise<boolean> => {
      const fieldConfig = validationConfig[field as string];
      if (!fieldConfig) return true;

      const value = values[field];
      const rules = fieldConfig.rules || [];

      // Run all validation rules
      for (const rule of rules) {
        try {
          const result = await rule(value, values);
          if (result) {
            setErrors((prev) => ({ ...prev, [field]: result }));
            return false;
          }
        } catch (error) {
          logger.error(`[Validation] Error validating field ${String(field)}:`, error);
          setErrors((prev) => ({ ...prev, [field]: 'Validation error' }));
          return false;
        }
      }

      // Clear error if all rules pass
      setErrors((prev: Partial<Record<keyof T, string>>) => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });

      return true;
    },
    [values, validationConfig]
  );

  /**
   * Validate entire form
   */
  const validateForm = useCallback(async (): Promise<boolean> => {
    setIsValidating(true);

    const fields = Object.keys(validationConfig) as (keyof T)[];
    const results = await Promise.all(fields.map((field) => validateField(field)));

    setIsValidating(false);

    return results.every((result: boolean) => result);
  }, [validationConfig, validateField]);

  /**
   * Set single field value
   */
  const setValue = useCallback(
    (field: keyof T, value: unknown) => {
      setValuesState((prev: T) => ({ ...prev, [field]: value }));

      const fieldConfig = validationConfig[field as string];
      if (fieldConfig?.validateOn === 'change') {
        // Debounce validation if configured
        if (fieldConfig.debounce) {
          const existingTimeout = validationTimeouts.current.get(field as string);
          if (existingTimeout) clearTimeout(existingTimeout);

          const timeout = setTimeout(() => {
            validateField(field);
          }, fieldConfig.debounce);

          validationTimeouts.current.set(field as string, timeout);
        } else {
          validateField(field);
        }
      }
    },
    [validationConfig, validateField]
  );

  /**
   * Set multiple values
   */
  const setValues = useCallback((newValues: Partial<T>) => {
    setValuesState((prev: T) => ({ ...prev, ...newValues }));
  }, []);

  /**
   * Set field error
   */
  const setError = useCallback((field: keyof T, error: string | null) => {
    if (error) {
      setErrors((prev: Partial<Record<keyof T, string>>) => ({ ...prev, [field]: error }));
    } else {
      setErrors((prev: Partial<Record<keyof T, string>>) => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  }, []);

  /**
   * Set field touched
   */
  const setTouchedField = useCallback((field: keyof T, isTouched: boolean) => {
    setTouched((prev: Partial<Record<keyof T, boolean>>) => ({ ...prev, [field]: isTouched }));
  }, []);

  /**
   * Reset entire form
   */
  const resetForm = useCallback(() => {
    setValuesState(initialValues);
    setErrors({});
    setTouched({});
  }, [initialValues]);

  /**
   * Reset single field
   */
  const resetField = useCallback(
    (field: keyof T) => {
      setValuesState((prev: T) => ({ ...prev, [field]: initialValues[field] }));
      setErrors((prev: Partial<Record<keyof T, string>>) => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
      setTouched((prev: Partial<Record<keyof T, boolean>>) => {
        const newTouched = { ...prev };
        delete newTouched[field];
        return newTouched;
      });
    },
    [initialValues]
  );

  /**
   * Handle input change
   */
  const handleChange = useCallback(
    (field: keyof T) => {
      return (event: { target: { type?: string; checked?: boolean; value: string } }) => {
        const target = event.target;
        const value = target.type === 'checkbox' ? target.checked : target.value;
        setValue(field, value);
      };
    },
    [setValue]
  );

  /**
   * Handle input blur
   */
  const handleBlur = useCallback(
    (field: keyof T) => {
      return () => {
        setTouchedField(field, true);

        const fieldConfig = validationConfig[field as string];
        if (fieldConfig?.validateOn === 'blur') {
          validateField(field);
        }
      };
    },
    [validationConfig, validateField, setTouchedField]
  );

  /**
   * Handle form submit
   */
  const handleSubmit = useCallback(
    (onSubmit: (values: T) => void | Promise<void>) => {
      return async (event: { preventDefault: () => void }) => {
        event.preventDefault();

        // Mark all fields as touched
        const allTouched = Object.keys(values).reduce((acc, key) => {
          acc[key as keyof T] = true;
          return acc;
        }, {} as Partial<Record<keyof T, boolean>>);
        setTouched(allTouched);

        // Validate form
        const isFormValid = await validateForm();

        if (isFormValid) {
          try {
            await onSubmit(values);
          } catch (error) {
            logger.error('[Validation] Form submit error:', error);
          }
        } else {
          logger.debug('[Validation] Form validation failed');
        }
      };
    },
    [values, validateForm]
  );

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      validationTimeouts.current.forEach((timeout: ReturnType<typeof setTimeout>) => clearTimeout(timeout));
    };
  }, []);

  return {
    // State
    values,
    errors,
    touched,
    isValidating,
    isValid,
    isDirty,

    // Actions
    setValue,
    setValues,
    setError,
    setTouched: setTouchedField,
    validateField,
    validateForm,
    resetForm,
    resetField,
    handleChange,
    handleBlur,
    handleSubmit,
  };
}

/**
 * Validation helpers
 */
export const ValidationHelpers = {
  /**
   * Check if field should show error
   */
  shouldShowError: <T extends Record<string, unknown>>(
    field: keyof T,
    errors: Partial<Record<keyof T, string>>,
    touched: Partial<Record<keyof T, boolean>>
  ): boolean => {
    return touched[field] === true && errors[field] !== undefined;
  },

  /**
   * Get field error message
   */
  getErrorMessage: <T extends Record<string, unknown>>(
    field: keyof T,
    errors: Partial<Record<keyof T, string>>
  ): string | undefined => {
    return errors[field];
  },

  /**
   * Check if form has errors
   */
  hasErrors: <T extends Record<string, unknown>>(errors: Partial<Record<keyof T, string>>): boolean => {
    return Object.keys(errors).length > 0;
  },

  /**
   * Get all error messages as array
   */
  getAllErrors: <T extends Record<string, unknown>>(errors: Partial<Record<keyof T, string>>): string[] => {
    return Object.values(errors).filter((error): error is string => error !== undefined);
  },
};

/**
 * Validate single value (utility function)
 */
export async function validateValue(value: unknown, rules: ValidationRule[]): Promise<string | null> {
  for (const rule of rules) {
    const result = await rule(value);
    if (result) return result;
  }
  return null;
}

/**
 * Common validation patterns
 */
export const CommonPatterns = {
  // Alphanumeric only
  ALPHANUMERIC: /^[a-zA-Z0-9]+$/,

  // Alphanumeric with spaces
  ALPHANUMERIC_SPACES: /^[a-zA-Z0-9\s]+$/,

  // Letters only
  LETTERS_ONLY: /^[a-zA-Z]+$/,

  // Numbers only
  NUMBERS_ONLY: /^\d+$/,

  // Phone number (basic)
  PHONE: /^[\d\s\-\+\(\)]+$/,

  // Postal code (US)
  POSTAL_CODE_US: /^\d{5}(-\d{4})?$/,

  // Postal code (UK)
  POSTAL_CODE_UK: /^[A-Z]{1,2}\d[A-Z\d]?\s?\d[A-Z]{2}$/i,

  // Credit card (basic)
  CREDIT_CARD: /^\d{13,19}$/,

  // Hex color
  HEX_COLOR: /^#?([a-f0-9]{6}|[a-f0-9]{3})$/i,

  // IPv4 address
  IPV4: /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/,

  // Latitude
  LATITUDE: /^-?([0-8]?[0-9]|90)(\.\d+)?$/,

  // Longitude
  LONGITUDE: /^-?((1[0-7]|[0-9])?[0-9]|180)(\.\d+)?$/,
};
