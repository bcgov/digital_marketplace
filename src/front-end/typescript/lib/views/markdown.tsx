import { View } from 'front-end/lib/framework';
import isRelativeUrl from 'is-relative-url';
import React from 'react';
import ReactMarkdown, { Renderers } from 'react-markdown';
import { decodeMarkdownImageUrlToFileId, fileBlobPath } from 'shared/lib/resources/file';

interface Props {
  source: string;
  box?: boolean;
  className?: string;
  escapeHtml?: boolean;
  openLinksInNewTabs?: boolean;
  smallerHeadings?: boolean;
  noImages?: boolean;
  noLinks?: boolean;
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

function decodeImgSrc(src: string): string {
  const decoded = decodeMarkdownImageUrlToFileId(src);
  return decoded ? fileBlobPath({ id: decoded }) : src;
}

const Markdown: View<Props> = ({ source, box, className = '', escapeHtml = true, openLinksInNewTabs = false, smallerHeadings = false, noImages = false, noLinks = false }) => {
  const renderers: Renderers = smallerHeadings || noImages
    ? {
        link: noLinks
          ? () => { //React-Markdown types are not helpful here.
              return (<span className='text-secondary font-weight-bold'>[Link Redacted]</span>);
            }
          : ReactMarkdown.renderers.link,
        image: noImages
          ? () => { //React-Markdown types are not helpful here.
              return (<p className='text-secondary font-weight-bold'>[Image Redacted]</p>);
            }
          : (props: any) => {
              return (<img {...props} src={decodeImgSrc(props.src || '')} />);
            },
        heading: smallerHeadings
          ? ({ level, children }: any) => { //React-Markdown types are not helpful here.
              return (<div className={`${headingLevelToClassName(level)} text-secondary`} children={children} />);
            }
          : ReactMarkdown.renderers.heading
      }
    : ReactMarkdown.renderers;
  return (
    <div className={`markdown ${box ? 'p-4 bg-light border rounded' : ''} ${className}`}>
      <ReactMarkdown
        source={source}
        escapeHtml={escapeHtml}
        renderers={renderers as any /*TODO remove once type cast TypeScript declaration file is fixed in react-markdown.*/}
        linkTarget={openLinksInNewTabs ? linkTarget : undefined} />
    </div>
  );
};

export default Markdown;

type ProposalMarkdownProps = Pick<Props, 'source' | 'className' | 'box'>;

export const ProposalMarkdown: View<ProposalMarkdownProps> = props => {
  return (
    <Markdown
      {...props}
      openLinksInNewTabs
      smallerHeadings
      noLinks
      noImages />
  );
};
