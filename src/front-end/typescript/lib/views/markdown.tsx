import { View } from 'front-end/lib/framework';
import isRelativeUrl from 'is-relative-url';
import React from 'react';
import ReactMarkdown from 'react-markdown';

interface Props {
  source: string;
  box?: boolean;
  className?: string;
  escapeHtml?: boolean;
  openLinksInNewTabs?: boolean;
}

const MAILTO_REGEXP = /^mailto:/i;

function linkTarget(url: string): string {
  if (isRelativeUrl(url) || url.match(MAILTO_REGEXP)) {
    return '';
  } else {
    return '_blank';
  }
}

const Markdown: View<Props> = ({ source, box, className = '', escapeHtml = true, openLinksInNewTabs = false }) => {
  return (
    <div className={`markdown ${box ? 'p-4 bg-light border rounded' : ''} ${className}`}>
      <ReactMarkdown
        source={source}
        escapeHtml={escapeHtml}
        linkTarget={openLinksInNewTabs ? linkTarget : undefined} />
    </div>
  );
};

export default Markdown;
