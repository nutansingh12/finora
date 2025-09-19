// Email validation
export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

// Password validation
export function validatePassword(password: string): boolean {
  // At least 8 characters, contains uppercase, lowercase, number, and special character
  const minLength = 8;
  const hasUpperCase = /[A-Z]/.test(password);
  const hasLowerCase = /[a-z]/.test(password);
  const hasNumbers = /\d/.test(password);
  const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);
  
  return password.length >= minLength && hasUpperCase && hasLowerCase && hasNumbers && hasSpecialChar;
}

// Stock symbol validation
export function validateStockSymbol(symbol: string): boolean {
  // Basic stock symbol validation (1-10 characters, alphanumeric with dots and dashes)
  const symbolRegex = /^[A-Z0-9.-]{1,10}$/i;
  return symbolRegex.test(symbol);
}

// Price validation
export function validatePrice(price: number): boolean {
  return typeof price === 'number' && price > 0 && isFinite(price);
}

// UUID validation
export function validateUUID(uuid: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}

// Phone number validation (basic)
export function validatePhoneNumber(phone: string): boolean {
  const phoneRegex = /^\+?[\d\s\-\(\)]{10,}$/;
  return phoneRegex.test(phone);
}

// Name validation
export function validateName(name: string): boolean {
  return typeof name === 'string' && name.trim().length >= 1 && name.trim().length <= 100;
}

// Sanitize string input
export function sanitizeString(input: string): string {
  return input.trim().replace(/[<>]/g, '');
}

// Validate pagination parameters
export function validatePagination(limit?: string, offset?: string): {
  limit: number;
  offset: number;
} {
  const parsedLimit = limit ? parseInt(limit, 10) : 20;
  const parsedOffset = offset ? parseInt(offset, 10) : 0;
  
  return {
    limit: Math.min(Math.max(parsedLimit, 1), 100), // Between 1 and 100
    offset: Math.max(parsedOffset, 0) // Non-negative
  };
}

// Validate sort parameters
export function validateSort(
  sortBy?: string,
  sortOrder?: string,
  allowedFields: string[] = []
): {
  sortBy: string;
  sortOrder: 'asc' | 'desc';
} {
  const validSortBy = sortBy && allowedFields.includes(sortBy) ? sortBy : allowedFields[0] || 'created_at';
  const validSortOrder = sortOrder === 'asc' || sortOrder === 'desc' ? sortOrder : 'desc';
  
  return {
    sortBy: validSortBy,
    sortOrder: validSortOrder
  };
}

// Validate date range
export function validateDateRange(startDate?: string, endDate?: string): {
  startDate: Date | null;
  endDate: Date | null;
  isValid: boolean;
} {
  let start: Date | null = null;
  let end: Date | null = null;
  let isValid = true;
  
  if (startDate) {
    start = new Date(startDate);
    if (isNaN(start.getTime())) {
      isValid = false;
      start = null;
    }
  }
  
  if (endDate) {
    end = new Date(endDate);
    if (isNaN(end.getTime())) {
      isValid = false;
      end = null;
    }
  }
  
  // If both dates are provided, start should be before end
  if (start && end && start > end) {
    isValid = false;
  }
  
  return {
    startDate: start,
    endDate: end,
    isValid
  };
}

// Validate array of IDs
export function validateIdArray(ids: any): string[] {
  if (!Array.isArray(ids)) {
    return [];
  }
  
  return ids.filter(id => typeof id === 'string' && validateUUID(id));
}

// Validate search query
export function validateSearchQuery(query: string): {
  isValid: boolean;
  sanitized: string;
} {
  if (typeof query !== 'string') {
    return { isValid: false, sanitized: '' };
  }
  
  const sanitized = sanitizeString(query);
  const isValid = sanitized.length >= 1 && sanitized.length <= 100;
  
  return { isValid, sanitized };
}

// Validate numeric range
export function validateNumericRange(
  value: any,
  min: number = 0,
  max: number = Number.MAX_SAFE_INTEGER
): {
  isValid: boolean;
  value: number;
} {
  const numValue = typeof value === 'string' ? parseFloat(value) : value;
  const isValid = typeof numValue === 'number' && 
                  !isNaN(numValue) && 
                  isFinite(numValue) && 
                  numValue >= min && 
                  numValue <= max;
  
  return {
    isValid,
    value: isValid ? numValue : 0
  };
}

// Validate alert type
export function validateAlertType(alertType: string): boolean {
  const validTypes = ['price_below', 'price_above', 'target_reached', 'cutoff_reached'];
  return validTypes.includes(alertType);
}

// Validate color hex code
export function validateHexColor(color: string): boolean {
  const hexRegex = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;
  return hexRegex.test(color);
}

// Validate file extension
export function validateFileExtension(filename: string, allowedExtensions: string[]): boolean {
  const extension = filename.split('.').pop()?.toLowerCase();
  return extension ? allowedExtensions.includes(extension) : false;
}

// Validate file size
export function validateFileSize(size: number, maxSizeInMB: number = 10): boolean {
  const maxSizeInBytes = maxSizeInMB * 1024 * 1024;
  return size > 0 && size <= maxSizeInBytes;
}

// Comprehensive input validation
export function validateInput(
  value: any,
  rules: {
    required?: boolean;
    type?: 'string' | 'number' | 'boolean' | 'array' | 'object';
    minLength?: number;
    maxLength?: number;
    min?: number;
    max?: number;
    pattern?: RegExp;
    enum?: any[];
    custom?: (value: any) => boolean;
  }
): {
  isValid: boolean;
  errors: string[];
  sanitized?: any;
} {
  const errors: string[] = [];
  let sanitized = value;
  
  // Required check
  if (rules.required && (value === undefined || value === null || value === '')) {
    errors.push('This field is required');
    return { isValid: false, errors };
  }
  
  // If not required and empty, return valid
  if (!rules.required && (value === undefined || value === null || value === '')) {
    return { isValid: true, errors: [], sanitized: null };
  }
  
  // Type check
  if (rules.type) {
    const actualType = Array.isArray(value) ? 'array' : typeof value;
    if (actualType !== rules.type) {
      errors.push(`Expected ${rules.type} but got ${actualType}`);
    }
  }
  
  // String validations
  if (typeof value === 'string') {
    sanitized = sanitizeString(value);
    
    if (rules.minLength && sanitized.length < rules.minLength) {
      errors.push(`Minimum length is ${rules.minLength}`);
    }
    
    if (rules.maxLength && sanitized.length > rules.maxLength) {
      errors.push(`Maximum length is ${rules.maxLength}`);
    }
    
    if (rules.pattern && !rules.pattern.test(sanitized)) {
      errors.push('Invalid format');
    }
  }
  
  // Number validations
  if (typeof value === 'number') {
    if (rules.min !== undefined && value < rules.min) {
      errors.push(`Minimum value is ${rules.min}`);
    }
    
    if (rules.max !== undefined && value > rules.max) {
      errors.push(`Maximum value is ${rules.max}`);
    }
  }
  
  // Enum validation
  if (rules.enum && !rules.enum.includes(value)) {
    errors.push(`Value must be one of: ${rules.enum.join(', ')}`);
  }
  
  // Custom validation
  if (rules.custom && !rules.custom(value)) {
    errors.push('Custom validation failed');
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    sanitized
  };
}
