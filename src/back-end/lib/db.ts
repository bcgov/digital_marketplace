import { LIBRARIAN_USER_EMAIL, LIBRARIAN_USER_PASSWORD_HASH } from 'back-end/config';
import { generateUuid } from 'back-end/lib';
import { authenticatePassword } from 'back-end/lib/security';
import Knex from 'knex';
import { uniq } from 'lodash';
import AVAILABLE_GENRES from 'shared/data/genres';
import { CreateRequestBody as RequestAuthor } from 'shared/lib/resources/author';
import { CreateRequestBody as RequestBook } from 'shared/lib/resources/book';
import { CreateRequestBody as RequestLibrarianSession } from 'shared/lib/resources/librarian-session';
import { CreateRequestBody as RequestLoan } from 'shared/lib/resources/loan';
import { Author, Book, Genre, Id, Loan, loanToLoanStatus, Session, User } from 'shared/lib/types';

export type Connection = Knex<any, any>;

export async function createUser(connection: Connection, user: Omit<User, 'id'>): Promise<User> {
  const now = new Date();
  const [result] = await connection('users')
    .insert({
      ...user,
      id: generateUuid(),
      createdAt: now,
      updatedAt: now
    }, ['*']);
  if (!result) {
    throw new Error('unable to create user');
  }
  return result;
}

export async function readOneUser(connection: Connection, id: Id): Promise<User | null> {
  const result = await connection('users')
    .where({ id })
    .first();
  return result ? result : null;
}

export async function readManyUsers(connection: Connection): Promise<User[]> {
  return (await connection('users').select()).map(raw => ({
    id: raw.id,
    name: raw.name,
    email: raw.email,
    issuerUid: raw.issuerUid,
    issuerType: raw.issuerType
  }));
}

export async function findOneUserByIssuerUidAndEmail(connection: Connection, issuerUid: string, email: string): Promise<User | null> {
  const result = await connection('users')
    .where({ issuerUid, email })
    .first();
  return result ? result : null;
}

interface RawSessionToSessionParams {
  id: Id;
  issuerRequestState?: string;
  user?: Id;
  librarian?: boolean;
}

async function rawSessionToSession(connection: Connection, params: RawSessionToSessionParams): Promise<Session> {
  const session = {
    id: params.id,
    issuerRequestState: params.issuerRequestState
  };
  if (params.user) {
    const user = await readOneUser(connection, params.user);
    if (!user) { return session; }
    return {
      ...session,
      user: { tag: 'user', value: user }
    };
  } else if (params.librarian) {
    return {
      ...session,
      user: {
        tag: 'librarian',
        value: { email: LIBRARIAN_USER_EMAIL }
      }
    };
  } else {
    return session;
  }
}

export async function createAnonymousSession(connection: Connection): Promise<Session> {
  const now = new Date();
  const [result] = await connection('sessions')
    .insert({
      id: generateUuid(),
      createdAt: now,
      updatedAt: now
    }, ['*']);
  if (!result) {
    throw new Error('unable to create anonymous session');
  }
  return await rawSessionToSession(connection, {
    id: result.id,
    issuerRequestState: result.issuerRequestState,
    user: result.user,
    librarian: result.librarian
  });
}

export async function readOneSession(connection: Connection, id: Id): Promise<Session> {
  const result = await connection('sessions')
    .where({ id })
    .first();
  if (!result) { return await createAnonymousSession(connection); }
  return await rawSessionToSession(connection, {
    id: result.id,
    issuerRequestState: result.issuerRequestState,
    user: result.user,
    librarian: result.librarian
  });
}

export async function updateSessionWithIssuerRequestState(connection: Connection, id: Id, issuerRequestState: string): Promise<Session> {
  const [result] = await connection('sessions')
    .where({ id })
    .update({
      issuerRequestState,
      updatedAt: new Date()
    }, ['*']);
  if (!result) {
    throw new Error('unable to update session');
  }
  return await rawSessionToSession(connection, {
    id: result.id,
    issuerRequestState: result.issuerRequestState,
    user: result.user,
    librarian: result.librarian
  });
}

export async function updateSessionWithUser(connection: Connection, id: Id, userId: Id): Promise<Session> {
  const [result] = await connection('sessions')
    .where({ id })
    .update({
      user: userId,
      librarian: null,
      updatedAt: new Date()
    }, ['*']);
  if (!result) {
    throw new Error('unable to update session');
  }
  return await rawSessionToSession(connection, {
    id: result.id,
    issuerRequestState: result.issuerRequestState,
    user: result.user,
    librarian: result.librarian
  });
}

export async function updateSessionWithLibrarian(connection: Connection, id: Id, body: RequestLibrarianSession): Promise<Session> {
  if (body.email !== LIBRARIAN_USER_EMAIL || !(await authenticatePassword(body.password, LIBRARIAN_USER_PASSWORD_HASH))) {
    throw new Error('invalid librarian credentials');
  }
  const [result] = await connection('sessions')
    .where({ id })
    .update({
      librarian: true,
      user: null,
      updatedAt: new Date()
    }, ['*']);
  if (!result) {
    throw new Error('unable to create librarian session');
  }
  return await rawSessionToSession(connection, {
    id: result.id,
    issuerRequestState: result.issuerRequestState,
    user: result.user,
    librarian: result.librarian
  });
}

export async function deleteSession(connection: Connection, id: Id): Promise<null> {
  await connection('sessions')
    .where({ id })
    .delete();
  return null;
}

export async function createAuthor(connection: Connection, author: RequestAuthor): Promise<Author> {
  const now = new Date();
  const [result] = await connection('authors')
    .insert({
      ...author,
      id: generateUuid(),
      createdAt: now
    }, ['*']);
  if (!result) {
    throw new Error('unable to create author');
  }
  return result;
}

export async function readManyAuthors(connection: Connection, bookId?: Id): Promise<Author[]> {
  if (bookId) {
    // This could be a join, but simpler to do it this way for now
    const authorIds = await connection('bookAuthors').select('author').where({ book: bookId });
    return await connection('authors').whereIn('id', authorIds.map(({ author }) => author));
  } else {
    return await connection('authors').select();
  }
}

export async function readOneAuthor(connection: Connection, id: Id): Promise<Author | null> {
  const [result] = await connection('authors')
    .where({ id });
  if (!result) { return null; }
  return result;
}

interface RawBookToBookParams {
  id: Id;
  title: string;
  description: string;
  genre: string;
  loan?: Id;
  createdAt: Date;
}

async function rawBookToBook(connection: Connection, params: RawBookToBookParams, viewerUserId?: Id): Promise<Book> {
  const authors = await readManyAuthors(connection, params.id);
  const loan = params.loan ? await readOneLoan(connection, params.loan) || undefined : undefined;
  return {
    ...params,
    authors,
    loan,
    loanStatus: loan && loanToLoanStatus(loan),
    subscribed: viewerUserId ? await getBookAvailabilitySubscriptionStatus(connection, params.id, viewerUserId) : undefined,
    genre: {
      name: params.genre,
      subscribed: viewerUserId ? await getGenreSubscriptionStatus(connection, params.genre, viewerUserId) : undefined
    }
  };
}

export async function createBook(connection: Connection, book: RequestBook, viewerUserId?: Id): Promise<Book> {
  const now = new Date();
  const partialBook = await connection.transaction(async trn => {
    // Create book
    const [bookResult] = await connection('books')
      .transacting(trn)
      .insert({
        title: book.title,
        description: book.description,
        genre: book.genre,
        id: generateUuid(),
        createdAt: now
      }, ['*']);

    if (!bookResult) {
      throw new Error('unable to create book');
    }
    // Create author relationships
    const bookId = bookResult.id;
    const authors = uniq(book.authors);
    for await (const author of authors) {
      const [bookAuthorResult] = await connection('bookAuthors')
        .transacting(trn)
        .insert({
          book: bookId,
          author
        }, ['*']);

      if (!bookAuthorResult) {
        throw new Error('unable to create book');
      }
    }
    return await rawBookToBook(connection, {
      id: bookResult.id,
      title: bookResult.title,
      description: bookResult.description,
      genre: bookResult.genre,
      loan: bookResult.loan,
      createdAt: bookResult.createdAt
    }, viewerUserId);
  });

  // Necessary to manually retrieve authors here as they were not yet available before transaction was completed
  return {
    ...partialBook,
    authors: await readManyAuthors(connection, partialBook.id)
  }
}

export async function readOneBook(connection: Connection, id: Id, viewerUserId?: Id): Promise<Book | null> {
  const [result] = await connection('books')
    .where({ id });
  if (!result) { return null; }
  return await rawBookToBook(connection, {
    id: result.id,
    title: result.title,
    description: result.description,
    genre: result.genre,
    loan: result.loan,
    createdAt: result.createdAt
  }, viewerUserId);
}

export async function readManyBooks(connection: Connection, viewerUserId?: Id): Promise<Book[]> {
  const results = await connection('books').select();
  const books: Book[] = [];
  for (const result of results) {
    books.push(await rawBookToBook(connection, {
      id: result.id,
      title: result.title,
      description: result.description,
      genre: result.genre,
      loan: result.loan,
      createdAt: result.createdAt
    }, viewerUserId));
  }
  return books;
}

interface CreateLoanParams extends Omit<RequestLoan, 'dueAt'> {
  dueAt: Date;
}

export async function createLoan(connection: Connection, loan: CreateLoanParams): Promise<Loan> {
  const now = new Date();
  return await connection.transaction(async trn => {
    // Create loan
    const [loanResult] = await connection('loans')
      .transacting(trn)
      .insert({
        ...loan,
        id: generateUuid(),
        createdAt: now
      }, ['*']);
    if (!loanResult) {
      throw new Error('unable to create loan');
    }
    // Create book relationship
    const [bookResult] = await connection('books')
      .transacting(trn)
      .where({ id: loanResult.book })
      .update({
        loan: loanResult.id
      }, ['*']);
    if (!bookResult) {
      throw new Error('unable to update book with loan');
    }
    return {
      id: loanResult.id,
      createdAt: loanResult.createdAt,
      dueAt: loanResult.dueAt,
      bookId: bookResult.id
    };
  });
}

export async function readOneLoan(connection: Connection, id: Id): Promise<Loan | null> {
  const [book] = await connection('books')
    .where({
      loan: id
    });

  if (!book) {
    throw new Error('unable to read loan');
  }
  const [result] = await connection('loans')
    .where({ id });
  return {
    id: result.id,
    createdAt: result.createdAt,
    dueAt: result.dueAt,
    returnedAt: result.returnedAt,
    bookId: book.id
  };
}

// Marks a loan as returned by setting the returned date and removing relationship from book
export async function deleteLoan(connection: Connection, id: Id): Promise<null> {
  const now = new Date();
  // Execute transaction that will
  // a) set returned date on loan and
  // b) remove linkage between book and loan
  // c) remove any availability subscriptions (notifications were already sent in resource layer)
  // Rollback on any failure
  return await connection.transaction(async trn => {
    const loan = await readOneLoan(connection, id);
    if (!loan) {
      // Throw error to be caught below
      throw new Error();
    }

    await connection('loans')
      .transacting(trn)
      .where({ id })
      .update({
          returnedAt: now
      });
    await connection('books')
      .transacting(trn)
      .where({ loan: id })
      .update({
        loan: null
      });
    await connection('bookAvailabilitySubscriptions')
      .transacting(trn)
      .where({ book: loan.bookId })
      .delete();
    return null;
  });
}

export async function createBookAvailabilitySubscription(connection: Connection, bookId: Id, userId: Id): Promise<Book> {
  const now = new Date();
  const book = await readOneBook(connection, bookId, userId);
  if (!book) { throw new Error('unable to create subscription for book that doesn\'t exist'); }
  if (book.subscribed) { throw new Error('already subscribed to book availability'); }
  const [result] = await connection('bookAvailabilitySubscriptions')
    .insert({
      book: bookId,
      user: userId,
      createdAt: now
    }, ['*']);
  if (!result) {
    throw new Error('unable to create availability subscription');
  }
  // Return the book just subscribed to
  return {
    ...book,
    subscribed: true
  };
}

export async function deleteBookAvailabilitySubscription(connection: Connection, bookId: Id, userId: Id): Promise<Book> {
  const book = await readOneBook(connection, bookId, userId);
  if (!book) { throw new Error('unable to delete book availability subscription'); }
  await connection('bookAvailabilitySubscriptions')
    .where({
      book: bookId,
      user: userId
    })
    .delete();
  return {
    ...book,
    subscribed: false
  };
}

export async function createGenreSubscription(connection: Connection, genre: string, userId: Id): Promise<Genre> {
  const now = new Date();
  const [result] = await connection('genreSubscriptions')
    .insert({
      genre,
      user: userId,
      createdAt: now
    }, ['*']);
  if (!result) {
    throw new Error('unable to create genre subscription');
  }
  // Return the genre just subscribed to
  return {
    name: result.genre,
    subscribed: true
  }
}

export async function deleteGenreSubscription(connection: Connection, genre: string, userId: Id): Promise<Genre> {
  await connection('genreSubscriptions')
    .where({
      genre,
      user: userId
    })
    .delete();
  return {
    name: genre,
    subscribed: false
  };
}

export async function getBookAvailabilitySubscriptionStatus(connection: Connection, bookId: Id, userId: Id): Promise<boolean> {
  const [result] = await connection('bookAvailabilitySubscriptions')
    .where({
      book: bookId,
      user: userId
    });
  return !!result;
}

export async function getGenreSubscriptionStatus(connection: Connection, genre: string, userId: Id): Promise<boolean> {
  const [result] = await connection('genreSubscriptions')
    .where({
      genre,
      user: userId
    });
  return !!result;
}

export async function readManyGenres(connection: Connection, viewerUserId?: Id): Promise<Genre[]> {
  const genres: Genre[] = [];
  for await (const genre of AVAILABLE_GENRES) {
    genres.push({
      name: genre,
      subscribed: viewerUserId ? await getGenreSubscriptionStatus(connection, genre, viewerUserId) : undefined
    });
  }
  return genres;
}

export async function readManyBookAvailabilitySubscriptions(connection: Connection, bookId: Id): Promise<User[]> {
  const results = await connection('bookAvailabilitySubscriptions')
    .where({
      book: bookId
    });

  const users: User[] = [];
  for await(const sub of results) {
    const user = await readOneUser(connection, sub.user);
    if (user) {
      users.push(user);
    }
  }
  return users;
}

export async function readManyGenreSubscriptions(connection: Connection, genre: string): Promise<User[]> {
  const results = await connection('genreSubscriptions')
    .where({
      genre
    });

  const users: User[] = [];
  for await(const sub of results) {
    const user = await readOneUser(connection, sub.user);
    if (user) {
      users.push(user);
    }
  }
  return users;
}
