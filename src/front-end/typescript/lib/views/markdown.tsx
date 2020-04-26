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
  smallerHeadings?: boolean;
}

const MAILTO_REGEXP = /^mailto:/i;

function linkTarget(url: string): string {
  if (isRelativeUrl(url) || url.match(MAILTO_REGEXP)) {
    return '';
  } else {
    return '_blank';
  }
}

function headingLevelToClassName(level: number): string {
  switch (level) {
    case 1: return 'h4';
    case 2: return 'h5';
    default: return 'h6';
  }
}

const Markdown: View<Props> = ({ source, box, className = '', escapeHtml = true, openLinksInNewTabs = false, smallerHeadings = false }) => {
  const renderers = smallerHeadings
    ? {
        heading: ({ level, children }: any) => { //React-Markdown types are not helpful here.
          return (<div className={`${headingLevelToClassName(level)} text-secondary`} children={children} />);
        }
      }
    : undefined;
  return (
    <div className={`markdown ${box ? 'p-4 bg-light border rounded' : ''} ${className}`}>
      <ReactMarkdown
        source={source}
        escapeHtml={escapeHtml}
        renderers={renderers}
        linkTarget={openLinksInNewTabs ? linkTarget : undefined} />
    </div>
  );
};

export default Markdown;
