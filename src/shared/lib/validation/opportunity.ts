import { invalid, valid, validateGenericString, Validation } from 'shared/lib/validation';

export function validateTitle(raw: string): Validation<string> {
  return validateGenericString(raw, 'Title');
}

function validNumberString(n: string): boolean {
  const result = n.match(/^[0-9,.]*$/);
  if (result) {
    return true;
  } else {
    return false;
  }
}

function validNumber(n: number): boolean {
  return !isNaN(n);
}

export function validateFixedPriceAmount(dollarString: string): Validation<string> {
  const parsedAmount = parseInt(dollarString, 10);
  if ( validNumberString(dollarString) && validNumber(parsedAmount) && parsedAmount <= 70000) {
    return valid(dollarString);
  } else {
    return invalid(['Please enter a value of $70,000 or less.']);
  }
}
