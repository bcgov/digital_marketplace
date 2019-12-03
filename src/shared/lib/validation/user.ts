import { invalid, valid, validateGenericString, Validation } from 'shared/lib/validation';

export function validateEmail(email: string): Validation<string> {
  email = email.toLowerCase();
  if (!email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/i)) {
    return invalid([ 'Please enter a valid email.' ]);
  } else {
    return valid(email);
  }
}

export function validateName(name: string): Validation<string> {
  return validateGenericString(name, 'Name');
}
