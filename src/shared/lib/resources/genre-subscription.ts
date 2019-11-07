export interface CreateRequestBody {
  genre: string;
}

export interface CreateValidationErrors {
  permissions?: string[];
  genre?: string[];
}
