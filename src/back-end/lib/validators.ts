import { Connection, readOneAuthor, readOneBook, readOneLoan, readOneUser } from 'back-end/lib/db';
import { hashPassword } from 'back-end/lib/security';
import { includes } from 'lodash';
import { Author, Book, Id, Loan, LoanStatus, loanToLoanStatus, User } from 'shared/lib/types';
import { ArrayValidation, invalid, valid, validateArrayAsync, validatePassword as validatePasswordShared, Validation } from 'shared/lib/validators';

export async function validatePassword(password: string): Promise<Validation<string>> {
  const validation = validatePasswordShared(password);
  switch (validation.tag) {
    case 'invalid':
      return validation;
    case 'valid':
      return valid(await hashPassword(validation.value));
  }
}

export async function validateBookId(connection: Connection, bookId: Id, viewerUserId?: Id, loaned?: boolean): Promise<Validation<Book>> {
  try {
    const book = await readOneBook(connection, bookId, viewerUserId);
    if (!book) { return invalid(['This book cannot be found.']); }
    if (loaned === true && !book.loan) { return invalid(['This book has not been loaned.']); }
    if (loaned === false && book.loan) { return invalid(['This book has been loaned.']); }
    return valid(book);
  } catch (e) {
    return invalid(['Please select a valid book.']);
  }
}

export async function validateLoanId(connection: Connection, loanId: Id, isLoanStatus: LoanStatus[]): Promise<Validation<Loan>> {
  try {
    const loan = await readOneLoan(connection, loanId);
    if (!loan) { return invalid(['This loan cannot be found.']); }
    if (isLoanStatus && !includes(isLoanStatus, loanToLoanStatus(loan))) {
      return invalid([`This loan is not one of: ${isLoanStatus.join(', ')}`]);
    }
    return valid(loan);
  } catch (e) {
    return invalid(['Please select a valid loan.']);
  }
}

export async function validateAuthorId(connection: Connection, authorId: Id): Promise<Validation<Author>> {
  try {
    const author = await readOneAuthor(connection, authorId);
    if (author) {
      return valid(author);
    } else {
      return invalid(['This author cannot be found.']);
    }
  } catch (e) {
    return invalid(['Please select a valid author.']);
  }
}

export async function validateAuthorIds(connection: Connection, authorIds: Id[]): Promise<ArrayValidation<Author>> {
  return await validateArrayAsync(authorIds, v => validateAuthorId(connection, v));
}

export async function validateUserId(connection: Connection, userId: Id): Promise<Validation<User>> {
  try {
    const user = await readOneUser(connection, userId);
    if (user) {
      return valid(user);
    } else {
      return invalid(['This user cannot be found.']);
    }
  } catch (e) {
    return invalid(['Please select a valid user.']);
  }
}
