import { MAILER_ROOT_URL } from 'back-end/config';
import { CSSProperties, default as React, Fragment, ReactElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

// Styles.

type StyleVariables = Record<string, Record<string, string>>;

type StyleUtilities = Record<string, Record<string, CSSProperties>>;

type StyleClasses = Record<string, CSSProperties>;

interface Styles {
  variables: StyleVariables;
  utilities: StyleUtilities;
  classes: StyleClasses;
}

type CSSProperty = keyof CSSProperties;

type StyleUnit
  = 'px'
  | 'rem';

type StyleLevel = 0 | 1 | 2 | 3 | 4 | 5;

const STYLE_LEVELS: StyleLevel[] = [0, 1, 2, 3, 4, 5];

type StyleLevelUtilities = {
  [level in StyleLevel]: CSSProperties;
};

const styles: Styles = (() => {
  const spacer = 16;
  const scale = (n: number) => n * spacer;
  const units = (n: number | string, unit: StyleUnit) => `${n}${unit}`;
  const px = (n: number | string) => units(n, 'px');
  const style = (property: string, value: string) => ({ [property]: value });
  const styleScale = (property: string, n: number, unit: StyleUnit = 'px') => style(property, units(scale(n), unit));
  const level = (l: StyleLevel) => {
    switch (l) {
      case 0: return 0;
      case 1: return 0.25;
      case 2: return 0.5;
      case 3: return 1;
      case 4: return 2;
      case 5: return 3;
    }
  };
  const levelUtilties = (name: string, property: CSSProperty): StyleLevelUtilities => {
    return STYLE_LEVELS.reduce((acc, l) => {
      acc[l] = styleScale(property, level(l));
      return acc;
    }, {} as StyleLevelUtilities);
  };
  const variables: StyleVariables = {
    sizes: {
      borderRadius: px(scale(0.25))
    },
    colors: {
      primary: '#003366',
      action: '#0c99d6',
      white: '#fff'
    }
  };
  const utilities: StyleUtilities = {
    p: levelUtilties('p', 'padding'),
    pt: levelUtilties('pt', 'paddingTop'),
    pr: levelUtilties('pr', 'paddingRight'),
    pb: levelUtilties('pb', 'paddingBottom'),
    pl: levelUtilties('pl', 'paddingLeft'),
    m: levelUtilties('m', 'margin'),
    mt: levelUtilties('mt', 'marginTop'),
    mr: levelUtilties('mr', 'marginRight'),
    mb: levelUtilties('mb', 'marginBottom'),
    ml: levelUtilties('ml', 'marginLeft'),
    text: {
      left: { textAlign: 'left' },
      right: { textAlign: 'right' },
      center: { textAlign: 'center' }
    },
    font: {
      sans: { fontFamily: 'sans-serif' },
      sm: { fontSize: px(scale(0.9)) },
      md: { fontSize: px(scale(1)) },
      lg: { fontSize: px(scale(1.1)) },
      xl: { fontSize: px(scale(1.3)) },
      bold: { fontWeight: 'bold' },
      italic: { fontStyle: 'italic' }
    },
    border: {
      radius: {
        borderRadius: variables.sizes.borderRadius
      }
    }
  };
  const classes: StyleClasses = {
    body: {
      ...utilities.m[0],
      ...utilities.p[0],
      ...utilities.font.sans,
      ...utilities.font.md,
      backgroundColor: variables.colors.white,
      width: '100%'
    },
    table: {
      ...utilities.pt[4],
      ...utilities.pb[4],
      ...utilities.pr[3],
      ...utilities.pl[3],
      margin: '0 auto',
      border: 0,
      width: '100%',
      maxWidth: px(scale(30)),
      lineHeight: 1.4
    },
    row: {
      ...utilities.pt[3],
      ...utilities.pb[3]
    },
    title: {
      ...utilities.font.xl,
      ...utilities.font.bold,
      ...utilities.pt[4],
      ...utilities.text.center
    },
    description: {
      ...utilities.text.center
    },
    p: {
      ...utilities.mt[1],
      ...utilities.mb[1]
    },
    linkListTitle: {
      ...utilities.font.bold
    },
    descriptionListTitle: {
      ...utilities.font.bold,
      ...utilities.mb[3]
    },
    linkListLink: {
      ...utilities.m[0],
      ...utilities.p[0],
      ...utilities.mt[3],
      ...utilities.mb[3]
    },
    link: {
      color: variables.colors.action,
      cursor: 'pointer',
      textDecoration: 'underline'
    },
    button: {
      ...utilities.border.radius,
      ...utilities.font.lg,
      ...utilities.text.center,
      padding: `${px(scale(0.75))} ${px(scale(1.5))}`,
      margin: '0 auto',
      backgroundColor: variables.colors.action,
      color: variables.colors.white,
      cursor: 'pointer',
      display: 'inline-block',
      textDecoration: 'none'
    },
    logoBackground: {
      ...utilities.border.radius,
      ...utilities.p[3],
      ...utilities.text.center,
      backgroundColor: variables.colors.primary,
      display: 'block'
    },
    logo: {
      height: px(scale(2))
    }
  };
  return { variables, utilities, classes };
})();

// Utility types and functions.

export function makeUrl(path: string): string {
  return `${MAILER_ROOT_URL}/${path.replace(/^\/*/, '')}`;
}

type Child = ReactElement | string | null;

interface WithChildren {
  children: Child[] | Child;
}

interface WithStyle {
  style: CSSProperties;
}

type View<Props> = (props: Props) => ReactElement | null;

type TemplateBaseProps = Omit<LayoutProps, 'children'>;

export interface LinkProps {
  text: string;
  url: string;
}

export const Link: View<LinkProps> = ({ text, url }) => {
  return (
    <a href={url} target='_blank' style={styles.classes.link}>
      {text}
    </a>
  );
};

const CallToAction: View<LinkProps & Partial<WithStyle>> = ({ text, url, style }) => {
  return (
    <Fragment>
      <a href={url} target='_blank' style={{...styles.classes.button, ...style}}>
        {text}
      </a>
    </Fragment>
  );
};

interface LinkListProps {
  title?: string;
  links: LinkProps[];
}

const LinkList: View<LinkListProps> = ({ title, links }) => {
  if (!links.length) { return null; }
  return (
    <Row style={styles.utilities.text.center}>
      {title ? (<div style={styles.classes.linkListTitle}>{title}</div>) : null}
      <Fragment>
        {links.map((link, i) => (
          <div key={`link-list-link-${i}`} style={styles.classes.linkListLink}>
            <Link {...link} />
          </div>
        ))}
      </Fragment>
    </Row>
  );
};

interface DescriptionItemProps {
  name: string;
  value: string;
}

const DescriptionItem: View<DescriptionItemProps> = ({ name, value }) => {
  return (
    <p style={styles.classes.p}>
      <b>{name}:&nbsp;</b>
      {value}
    </p>
  );
};

export interface DescriptionListProps {
  title?: string;
  items: DescriptionItemProps[];
}

const DescriptionList: View<DescriptionListProps> = ({ title, items }) => {
  return (
    <Row style={styles.utilities.text.center}>
      {title ? (<div style={styles.classes.descriptionListTitle}>{title}</div>) : null}
      <Fragment>
        {items.map((item, i) => (<DescriptionItem key={`dl-di-${i}`} {...item} />))}
      </Fragment>
    </Row>
  );
};

type Template<Props> = (props: Props) => string;

function makeTemplate<Props>(Template: View<Props>): Template<Props> {
  return props => renderToStaticMarkup((<Template {...props} />));
}

const Container: View<WithChildren> = ({ children }) => {
  return (
    <table style={styles.classes.table}>
      {children}
    </table>
  );
};

const Row: View<WithChildren & Partial<WithStyle>> = ({ children, style = {} }) => {
  return (
    <tr>
      <td style={{ ...styles.classes.row, ...style }}>
        {children}
      </td>
    </tr>
  );
};

// Email template layout.

interface LayoutProps extends WithChildren {
  title: string | ReactElement;
  description?: string | ReactElement;
}

const Layout: View<LayoutProps> = ({ title, description, children }) => {
  return (
    <html style={styles.classes.body}>
      <head>
        <meta charSet='utf8' />
      </head>
      <body style={styles.classes.body}>
        <Container>
          <Row>
            <a href={makeUrl('')} target='_blank' style={styles.classes.logoBackground}>
              <img src={makeUrl('images/bcgov_logo.svg')} alt='Digital Marketplace' style={styles.classes.logo} />
            </a>
          </Row>
          <Row style={styles.classes.title}>
            {title}
          </Row>
          {description ? (<Row style={styles.classes.description}>{description}</Row>) : null}
          <Fragment>
            {children}
          </Fragment>
        </Container>
      </body>
    </html>
  );
};

// Email templates.

// Simple template.

export interface SimpleProps extends TemplateBaseProps {
  linkLists?: LinkListProps[];
  descriptionLists?: DescriptionListProps[];
  callsToAction?: LinkProps[];
  body?: SimpleBodyProps;
}

const Simple: View<SimpleProps> = props => {
  const { linkLists, descriptionLists, callsToAction, body } = props;
  return (
    <Layout {...props}>
      <Fragment>
        {linkLists
          ? linkLists.map((list, i) => (<LinkList key={`link-list-${i}`} {...list} />))
          : null}
      </Fragment>
      <Fragment>
        {descriptionLists
          ? descriptionLists.map((list, i) => (<DescriptionList key={`description-list-${i}`} {...list} />))
          : null}
      </Fragment>
      <Fragment>
        {body
          ? (<SimpleBody {...body} />)
          : null}
      </Fragment>
      <Fragment>
        {callsToAction
          ? <Row style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', ...styles.utilities.text.center}}>
              {callsToAction.map((call, i) => (<CallToAction style={{ ...styles.utilities.m[2] }} key={`call-to-action-${i}`} {...call} />))}
            </Row>
          : null}
      </Fragment>
    </Layout>
  );
};

export interface SimpleBodyProps {
  title?: string;
  content?: ContentItemProps[];
}

const SimpleBody: View<SimpleBodyProps> = props => {
  const { title, content } = props;
  return (
    <Row>
      <Fragment>
        {title ? (<div style={{...styles.utilities.font.italic, ...styles.utilities.text.center, ...styles.utilities.mb[4]}}>{title}</div>) : null}
      </Fragment>
      <Fragment>
        {content ? content.map((contentItem, i) => (<div style={{...styles.utilities.mb[2]}} key={`content-item-${i}`}><ContentItem {...contentItem} /></div> )) : null}
      </Fragment>
    </Row>
  );
};

export interface ContentItemProps {
  prefix?: string;
  link?: LinkProps;
  suffix?: string;
}

const ContentItem: View<ContentItemProps> = props => {
  const { prefix, link, suffix } = props;
  return (
    <Fragment>
      { prefix ? (prefix) : null }
      { link ? <Link {...link} /> : null }
      { suffix ? (suffix) : null }
    </Fragment>
  );
};

export const simple: Template<SimpleProps> = makeTemplate(Simple);
