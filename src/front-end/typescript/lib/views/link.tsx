import router from 'front-end/lib/app/router';
import { Route } from 'front-end/lib/app/types';
import { ViewElementChildren } from 'front-end/lib/framework';
import { ButtonColor, TextColor } from 'front-end/lib/types';
import React, { CSSProperties, MouseEvent } from 'react';
import { ADT, adtCurried } from 'shared/lib/types';

type RouteDest = ADT<'route', Route>;
export const routeDest = adtCurried<RouteDest>('route');

type ExternalDest = ADT<'external', string>;
export const externalDest = adtCurried<ExternalDest>('external');

export type Dest = RouteDest | ExternalDest;

interface BaseProps {
  dest?: Dest;
  children?: ViewElementChildren;
  className?: string;
  style?: CSSProperties;
  disabled?: boolean;
  onClick?(): void;
}

export interface AnchorProps extends BaseProps {
  button?: false | undefined;
  color?: TextColor;
  nav?: boolean;
  newTab?: boolean;
  download?: boolean;
}

export interface ButtonProps extends BaseProps {
  button: true;
  outline?: boolean;
  color?: ButtonColor;
  size?: 'sm' | 'md' | 'lg';
}

export type Props = AnchorProps | ButtonProps;

function AnchorLink(props: AnchorProps) {
  // Initialize props.
  const {
    dest,
    color,
    nav = false,
    className = '',
    disabled = false,
    children,
    onClick,
    newTab = false,
    download = false
  } = props;
  const href: string = (() => {
    if (!dest) { return ''; }
    switch (dest.tag) {
      case 'route': return router.routeToUrl(dest.value);
      case 'external': return dest.value;
    }
  })();
  let finalClassName = className;
  finalClassName += nav ? ' nav-link' : '';
  finalClassName += disabled ? ' disabled' : '';
  finalClassName += color ? ` text-${color}` : '';
  const finalOnClick = ((e: MouseEvent<HTMLAnchorElement>) => {
    if (!e.ctrlKey && !e.metaKey && !e.shiftKey) { e.preventDefault(); }
    if (!disabled && onClick) { onClick(); }
  });
  return (
    <a href={href} onClick={finalOnClick} className={finalClassName} target={newTab ? '_blank' : undefined} download={download} rel={dest && dest.tag === 'external' ? 'external' : undefined}>
      {children}
    </a>
  );
}

function ButtonLink(props: ButtonProps) {
  const {
    color,
    size = 'md',
    className = '',
    outline = false
  } = props;
  const anchorProps: AnchorProps = {
    ...props,
    button: false,
    color: undefined,
    className: `${className} btn btn-${size} ${color ? `btn-${outline ? 'outline-' : ''}${color}` : ''}`
  };
  return (
    <AnchorLink {...anchorProps} />
  );
}

function Link(props: Props) {
  if (props.button) {
    return (<ButtonLink {...props} />);
  } else {
    return (<AnchorLink {...props} />);
  }
}

export default Link;
