import { invalid, valid, Validation } from 'shared/lib/validation';

export function validateUrl(url: string): Validation<string> {
  url = url.toLowerCase();
  if (!url.match(/https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)/i)) {
    return invalid(['Please enter a valid URL.']);
  } else {
    return valid(url);
  }
}

export function validatePhone(phone: string): Validation<string> {
  if (!phone.match(/^[+]*[(]{0,1}[0-9]{1,4}[)]{0,1}[-\s\./0-9]*$/i)) {
    return invalid(['Please enter a valid phone number.']);
  } else {
    return valid(phone);
  }
}
