import { prefixRequest } from 'front-end/lib/http';
import * as AuthorResource from 'shared/lib/resources/author';
import * as BookResource from 'shared/lib/resources/book';
import * as BookAvailabilitySubscriptionResource from 'shared/lib/resources/book-availability-subscription';
import * as GenreSubscriptionResource from 'shared/lib/resources/genre-subscription';
import * as LibrarianSessionResource from 'shared/lib/resources/librarian-session';
import * as LoanResource from 'shared/lib/resources/loan';
import { Author, Book, ClientHttpMethod, Genre, Id, Loan, Session, User } from 'shared/lib/types';
import { invalid, valid, Validation, ValidOrInvalid } from 'shared/lib/validators';

const request = prefixRequest('api');

function withCurrentSession(method: ClientHttpMethod): () => Promise<ValidOrInvalid<Session, null>> {
  return async () => {
    const response = await request(method, 'sessions/current');
    switch (response.status) {
      case 200:
        return valid(response.data as Session);
      default:
        return invalid(null);
    }
  }
}

export const readOneSession = withCurrentSession(ClientHttpMethod.Get);

export const deleteSession = withCurrentSession(ClientHttpMethod.Delete);

export async function createLibrarianSession(body: LibrarianSessionResource.CreateRequestBody): Promise<Validation<Session>> {
  const response = await request(ClientHttpMethod.Post, 'librarianSessions', body);
  switch (response.status) {
    case 200:
    case 201:
      return valid(response.data as Session);
    case 400:
    case 401:
      return invalid(response.data as string[]);
    default:
      return invalid([]);
  }
}

export async function createAuthor(body: AuthorResource.CreateRequestBody): Promise<ValidOrInvalid<Author, AuthorResource.CreateValidationErrors>> {
  const response = await request(ClientHttpMethod.Post, 'authors', body);
  switch (response.status) {
    case 201:
      return valid(response.data as Author);
    case 400:
    case 401:
      return invalid(response.data as AuthorResource.CreateValidationErrors);
    default:
      return invalid({});
  }
}

export async function readManyUsers(): Promise<User[]> {
  const response = await request(ClientHttpMethod.Get, 'users');
  switch (response.status) {
    case 200:
      return response.data as User[];
    default:
      return [];
  }
}

export async function readManyAuthors(): Promise<Author[]> {
  const response = await request(ClientHttpMethod.Get, 'authors');
  switch (response.status) {
    case 200:
      return response.data as Author[];
    default:
      return [];
  }
}

export async function createBook(body: BookResource.CreateRequestBody): Promise<ValidOrInvalid<Book, BookResource.CreateValidationErrors>> {
  const response = await request(ClientHttpMethod.Post, 'books', body);
  switch (response.status) {
    case 201:
      return valid(response.data as Book);
    case 400:
    case 401:
      return invalid(response.data as BookResource.CreateValidationErrors);
    default:
      return invalid({});
  }
}

export async function readManyBooks(): Promise<Book[]> {
  const response = await request(ClientHttpMethod.Get, 'books');
  switch (response.status) {
    case 200:
      return response.data as Book[];
    default:
      return [];
  }
}

export async function createLoan(body: LoanResource.CreateRequestBody): Promise<ValidOrInvalid<Loan, LoanResource.CreateValidationErrors>> {
  const response = await request(ClientHttpMethod.Post, 'loans', body);
  switch (response.status) {
    case 201:
      return valid(response.data as Loan);
    case 400:
    case 401:
      return invalid(response.data as LoanResource.CreateValidationErrors);
    default:
      return invalid({});
  }
}

export async function deleteLoan(id: Id): Promise<Validation<null>> {
  const response = await request(ClientHttpMethod.Delete, `loans/${id}`);
  switch (response.status) {
    case 200:
      return valid(null);
    case 400:
    case 401:
      return invalid(response.data as string[]);
    default:
      return invalid([]);
  }
}

export async function readManyGenres(): Promise<Genre[]> {
  const response = await request(ClientHttpMethod.Get, 'genres');
  switch (response.status) {
    case 200:
      return response.data as Genre[];
    default:
      return [];
  }
}

export async function createBookAvailabilitySubscription(body: BookAvailabilitySubscriptionResource.CreateRequestBody): Promise<ValidOrInvalid<Book, BookAvailabilitySubscriptionResource.CreateValidationErrors>> {
  const response = await request(ClientHttpMethod.Post, 'bookAvailabilitySubscriptions', body);
  switch (response.status) {
    case 201:
      return valid(response.data as Book);
    case 400:
    case 401:
      return invalid(response.data as BookAvailabilitySubscriptionResource.CreateValidationErrors);
    default:
      return invalid({});
  }
}

export async function deleteBookAvailabilitySubscription(bookId: Id): Promise<Validation<Book>> {
  const response = await request(ClientHttpMethod.Delete, `bookAvailabilitySubscriptions/${bookId}`);
  switch (response.status) {
    case 200:
      return valid(response.data as Book);
    case 400:
    case 401:
      return invalid(response.data as string[]);
    default:
      return invalid([]);
  }
}

export async function createGenreSubscription(body: GenreSubscriptionResource.CreateRequestBody): Promise<ValidOrInvalid<Genre, GenreSubscriptionResource.CreateValidationErrors>> {
  const response = await request(ClientHttpMethod.Post, 'genreSubscriptions', body);
  switch (response.status) {
    case 201:
      return valid(response.data as Genre);
    case 400:
    case 401:
      return invalid(response.data as GenreSubscriptionResource.CreateValidationErrors);
    default:
      return invalid({});
  }
}

export async function deleteGenreSubscription(genre: string): Promise<Validation<Genre>> {
  const response = await request(ClientHttpMethod.Delete, `genreSubscriptions/${window.encodeURIComponent(genre)}`);
  switch (response.status) {
    case 200:
      return valid(response.data as Genre);
    case 400:
    case 401:
      return invalid(response.data as string[]);
    default:
      return invalid([]);
  }
}
