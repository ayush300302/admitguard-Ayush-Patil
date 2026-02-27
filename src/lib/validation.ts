import { differenceInYears, parse } from 'date-fns';
import { FieldConfig, ValidationRule } from '../config/rules';

export interface ValidationResult {
  valid: boolean;
  error: string | null;
  isSoft: boolean;
  blockSubmission?: boolean;
}

export function validateField(
  field: FieldConfig,
  value: any,
  allData: Record<string, any>,
  auditLog: any[] = []
): ValidationResult {
  const isSoft = field.category === 'soft';

  for (const rule of field.validations) {
    switch (rule.type) {
      case 'required':
        if (value === undefined || value === null || value === '' || value === false) {
          return { valid: false, error: rule.message, isSoft };
        }
        break;

      case 'minLength':
        if (typeof value === 'string' && value.length < (rule.value || 0)) {
          return { valid: false, error: rule.message, isSoft };
        }
        break;

      case 'noNumbers':
        if (typeof value === 'string' && /[0-9]/.test(value)) {
          return { valid: false, error: rule.message, isSoft };
        }
        break;

      case 'emailFormat':
        if (typeof value === 'string' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
          return { valid: false, error: rule.message, isSoft };
        }
        break;

      case 'unique':
        if (rule.checkStorage && typeof value === 'string') {
          const exists = auditLog.some(entry => entry.formData[field.id] === value);
          if (exists) {
            return { valid: false, error: rule.message, isSoft };
          }
        }
        break;

      case 'pattern':
        if (typeof value === 'string' && rule.pattern && !new RegExp(rule.pattern).test(value)) {
          return { valid: false, error: rule.message, isSoft };
        }
        break;

      case 'ageRange':
        if (value) {
          const birthDate = new Date(value);
          const age = differenceInYears(new Date(), birthDate);
          if (age < (rule.min || 0) || age > (rule.max || 999)) {
            return { valid: false, error: rule.message, isSoft };
          }
        }
        break;

      case 'range':
        const numValue = Number(value);
        if (numValue < (rule.min || -Infinity) || numValue > (rule.max || Infinity)) {
          return { valid: false, error: rule.message, isSoft };
        }
        break;

      case 'minValue':
        if (Number(value) < (rule.value || 0)) {
          return { valid: false, error: rule.message, isSoft };
        }
        break;

      case 'notEquals':
        if (value === rule.value) {
          return { 
            valid: false, 
            error: rule.message, 
            isSoft, 
            blockSubmission: rule.blockSubmission 
          };
        }
        break;

      case 'exactLength':
        if (typeof value === 'string' && value.length !== rule.value) {
          return { valid: false, error: rule.message, isSoft };
        }
        break;

      case 'conditional':
        if (rule.conditions) {
          for (const cond of rule.conditions) {
            const whenValue = allData[cond.when];
            
            // Check if condition applies
            let applies = false;
            if (cond.is !== undefined && whenValue === cond.is) applies = true;
            if (cond.in !== undefined && cond.in.includes(whenValue)) applies = true;

            if (applies) {
              // Check requirements
              if (cond.requires) {
                const reqValue = allData[cond.requires];
                if (cond.in && !cond.in.includes(reqValue)) {
                   return { valid: false, error: cond.message || rule.message, isSoft };
                }
              }
              
              // Check range
              const val = Number(value);
              if (cond.min !== undefined && val < cond.min) {
                return { valid: false, error: cond.message || rule.message, isSoft };
              }
              if (cond.max !== undefined && val > cond.max) {
                return { valid: false, error: cond.message || rule.message, isSoft };
              }
            }
          }
        }
        break;
    }
  }

  return { valid: true, error: null, isSoft };
}

export function checkRationale(field: FieldConfig, rationale: string): { valid: boolean; error: string | null } {
  if (!rationale || rationale.length < (field.rationaleMinLength || 30)) {
    return { valid: false, error: `Rationale must be at least ${field.rationaleMinLength || 30} characters.` };
  }

  if (field.rationaleKeywords && field.rationaleKeywords.length > 0) {
    const lowerRationale = rationale.toLowerCase();
    const hasKeyword = field.rationaleKeywords.some(kw => lowerRationale.includes(kw.toLowerCase()));
    if (!hasKeyword) {
      return { valid: false, error: `Rationale must include one of the following keywords: ${field.rationaleKeywords.join(', ')}` };
    }
  }

  return { valid: true, error: null };
}
