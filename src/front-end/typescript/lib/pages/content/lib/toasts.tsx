import { ContentLink } from 'front-end/typescript/lib/pages/content/lib';
import React from 'react';
import { COPY } from 'shared/config';
import { Content } from 'shared/lib/resources/content';

type MiniContent = Pick<Content, 'title' | 'slug'>;

export const published = {
  success: (content: MiniContent) => ({
    title: 'Page Published',
    body: (<span><ContentLink {...content} newTab /> has been published.</span>)
  }),
  error: {
    title: 'Unable to Publish Page',
    body: 'This page could not be published. Please fix the errors in the form, if any, and try again.'
  }
};

export const deleted = {
  success: (title: string) => ({
    title: 'Page Deleted',
    body: (<span><em>{title}</em> has been deleted.</span>)
  }),
  error: {
    title: 'Unable to Delete Page',
    body: 'This page could not be deleted.'
  }
};

export const changesPublished = {
  success: (content: MiniContent) => ({
    title: 'Page Changes Published',
    body: (<span>Your changes to <ContentLink {...content} newTab /> have been published.</span>)
  }),
  error: {
    title: 'Unable to Publish Changes',
    body: 'Your changes to this page could not be published. Please fix the errors in the form, if any, and try again.'
  }
};

export const startedEditing = {
  error: {
    title: 'Unable to Edit Page',
    body: 'This page cannot be edited at this time. Please try again later.'
  }
};

export const notifiedNewTerms = {
  success: {
    title: 'Vendors Notified',
    body: (<span>All vendors have been notified that the <em>{COPY.appTermsTitle}</em> have been updated. They will now be prompted to accept the updated terms before submitting their next proposal to an opportunity.</span>)
  },
  error: {
    title: 'Unable to Notify Vendors',
    body: (<span>The system was unable to notify vendors of the updated <em>{COPY.appTermsTitle}</em>. Please try again later.</span>)
  }
};
