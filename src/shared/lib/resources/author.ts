export interface CreateRequestBody {
  firstName: string;
  lastName: string;
  middleName?: string;
}

export interface CreateValidationErrors {
  permissions?: string[];
  firstName?: string[];
  lastName?: string[];
  middleName?: string[];
}
