// import * as templates from 'back-end/lib/mailer/templates';
// import { send } from 'back-end/lib/mailer/transport';

// export async function bookIsAvailable(email: string, book: Book): Promise<void> {
//   const title = 'Digital Marketplace Code Challenge - Book is Available';
//   await send({
//     to: email,
//     subject: title,
//     html: templates.simple({
//       title,
//       description: 'A book you were watching is now available.',
//       descriptionLists: [makeBookInformation(book)],
//       callToAction: viewBooksCallToAction
//     })
//   });
// }

// export async function bookWithGenreAdded(email: string, book: Book): Promise<void> {
//   const title = `Digital Marketplace Code Challenge - A New "${book.genre}" Book is Available`;
//   await send({
//     to: email,
//     subject: title,
//     html: templates.simple({
//       title,
//       description: `A new book is available in the "${book.genre}" genre.`,
//       descriptionLists: [makeBookInformation(book)],
//       callToAction: viewBooksCallToAction
//     })
//   });
// }

// function makeBookInformation(book: Book): templates.DescriptionListProps {
//   const authors = book.authors.map(author => authorToFullName(author)).join(', ');
//   const items = [
//     { name: 'Title', value: book.title },
//     { name: 'Author(s)', value: authors },
//     { name: 'Description', value: book.description }
//   ];
//   return {
//     title: 'Book Information',
//     items
//   };
// }

// const viewBooksCallToAction: templates.LinkProps = {
//   text: 'View All Books',
//   url: templates.makeUrl('books')
// };
