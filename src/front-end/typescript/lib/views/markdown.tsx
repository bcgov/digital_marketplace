import { fileBlobPath, prefixPath } from "front-end/lib";
import { component } from "front-end/lib/framework";
import isRelativeUrl from "is-relative-url";
import React from "react";
import ReactMarkdown, { Components } from "react-markdown";
import { decodeMarkdownImageUrlToFileId } from "shared/lib/resources/file";
import rehypeRaw from "rehype-raw";

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

function isHashLink(url: string): boolean {
  return url.charAt(0) === "#";
}

function newTabLinkTarget(url: string): string | undefined {
  if (isRelativeUrl(url) || url.match(MAILTO_REGEXP) || isHashLink(url)) {
    return undefined;
  } else {
    return "_blank";
  }
}

function headingToClassName(heading: typeof HEADINGS[number]): string {
  switch (heading) {
    case "h1":
      return "h4";
    case "h2":
      return "h5";
    default:
      return "h6";
  }
}

function decodeImgSrc(src: string): string {
  const decoded = decodeMarkdownImageUrlToFileId(src);
  return decoded ? fileBlobPath({ id: decoded }) : src;
}

const HEADINGS = ["h1", "h2", "h3", "h4", "h5", "h6"] as const;
const CustomHeading: component.base.View<{
  children?: React.ReactNode;
  heading: typeof HEADINGS[number];
}> = ({ children, heading }) => (
  <div className={`${headingToClassName(heading)} text-secondary`}>
    {children}
  </div>
);

const Markdown: component.base.View<Props> = ({
  source,
  box,
  className = "",
  escapeHtml = true,
  openLinksInNewTabs = false,
  smallerHeadings = false,
  noImages = false,
  noLinks = false
}) => {
  const customComponents: Components = {};

  if (noLinks) {
    customComponents.a = () => (
      <span className="text-danger fw-bold">[Link Redacted]</span>
    );
  } else {
    customComponents.a = ({
      children,
      href: originalHref,
      title,
      node: _node,
      ...rest
    }) => {
      const href =
        isRelativeUrl(originalHref || "") && !isHashLink(originalHref || "")
          ? prefixPath(originalHref || "")
          : originalHref;
      return (
        <a
          href={href || ""}
          title={title}
          rel="external"
          target={
            openLinksInNewTabs
              ? newTabLinkTarget(originalHref || "")
              : rest.target
          }
          {...rest}>
          {children}
        </a>
      );
    };
  }

  if (noImages) {
    customComponents.img = () => (
      <span className="text-danger fw-bold">[Image Redacted]</span>
    );
  } else {
    customComponents.img = ({
      src: originalSrc,
      alt,
      title,
      node: _node,
      ...rest
    }) => {
      return (
        <img
          src={decodeImgSrc(originalSrc || "")}
          alt={alt || ""}
          title={title}
          {...rest}
        />
      );
    };
  }

  if (smallerHeadings) {
    HEADINGS.forEach((heading) => {
      customComponents[heading] = ({ children }) => (
        <CustomHeading heading={heading}>{children}</CustomHeading>
      );
    });
  }

  return (
    <div
      className={`markdown ${
        box ? "p-4 bg-light border rounded" : ""
      } ${className}`}>
      <ReactMarkdown
        children={source}
        components={customComponents}
        rehypePlugins={escapeHtml ? [] : [rehypeRaw]}
      />
    </div>
  );
};

export default Markdown;

type ProposalMarkdownProps = Pick<
  Props,
  "source" | "className" | "box" | "noLinks" | "noImages"
>;

export const ProposalMarkdown: component.base.View<ProposalMarkdownProps> = (
  props
) => {
  return (
    <Markdown openLinksInNewTabs smallerHeadings noLinks noImages {...props} />
  );
};
