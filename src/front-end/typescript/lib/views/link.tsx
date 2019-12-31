import router from 'front-end/lib/app/router';
import { Route } from 'front-end/lib/app/types';
import { View, ViewElementChildren } from 'front-end/lib/framework';
import { ButtonColor, TextColor } from 'front-end/lib/types';
import Icon, { AvailableIcons } from 'front-end/lib/views/icon';
import React, { CSSProperties, MouseEvent } from 'react';
import { adt, ADT, adtCurried } from 'shared/lib/types';

type RouteDest = ADT<'route', Route>;
export const routeDest = adtCurried<RouteDest>('route');

type ExternalDest = ADT<'external', string>;
export const externalDest = adtCurried<ExternalDest>('external');

type EmailDest = ADT<'email', string>;
export const emailDest = adtCurried<EmailDest>('email');

export type Dest = RouteDest | ExternalDest | EmailDest;

type IconLinkSymbol = ADT<'icon', AvailableIcons>;
export const iconLinkSymbol = adtCurried<IconLinkSymbol>('icon');

type ImageLinkSymbol = ADT<'image', string>;
export const imageLinkSymbol = adtCurried<ImageLinkSymbol>('image');

type EmptyIconLinkSymbol = ADT<'emptyIcon'>;
export const emptyIconLinkSymbol = () => adt('emptyIcon' as const);

export type LinkSymbol = IconLinkSymbol | ImageLinkSymbol | EmptyIconLinkSymbol;

interface LinkSymbolProps {
  symbol_: LinkSymbol;
  className?: string;
}

const LinkSymbol: View<LinkSymbolProps> = ({ symbol_, className = '' }) => {
  className = `${className} flex-shrink-0 flex-grow-0`;
  switch (symbol_.tag) {
    case 'icon':
      return (<Icon name={symbol_.value} className={className} width={1} height={1} />);
    case 'image':
      return (<img src={symbol_.value} className={className} style={{ width: '1.75rem', height: '1.75rem', objectFit: 'cover', borderRadius: '50%' }} />);
    case 'emptyIcon':
      return (<div style={{ width: '1rem', height: '1rem' }} className={className}></div>);
  }
};

type LeftPlacement<Value> = ADT<'left', Value>;

export function leftPlacement<Value>(value: Value): LeftPlacement<Value> {
  return adt('left', value);
}

type RightPlacement<Value> = ADT<'right', Value>;

export function rightPlacement<Value>(value: Value): RightPlacement<Value> {
  return adt('right', value);
}

export type Placement<Value>
  = LeftPlacement<Value>
  | RightPlacement<Value>;

interface BaseProps {
  dest?: Dest;
  symbol_?: Placement<LinkSymbol>;
  symbolClassName?: string;
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
    style,
    disabled = false,
    children,
    onClick,
    newTab = false,
    download = false,
    symbol_,
    symbolClassName = ''
  } = props;
  const href: string = (() => {
    if (!dest) { return '#'; }
    switch (dest.tag) {
      case 'route': return router.routeToUrl(dest.value);
      case 'external': return dest.value;
      case 'email': return `mailto:${dest.value}`;
    }
  })();
  let finalClassName = 'text-nowrap';
  finalClassName += nav ? ' nav-link' : '';
  finalClassName += disabled ? ' disabled' : '';
  finalClassName += color ? ` text-${color}` : '';
  finalClassName += ` ${className}`;
  const finalOnClick = !disabled && onClick
    ? ((e: MouseEvent<HTMLAnchorElement>) => {
        if (!dest || (!newTab && !e.ctrlKey && !e.metaKey)) { e.preventDefault(); }
        onClick();
      })
    : undefined;
  return (
    <a href={href} onClick={finalOnClick} style={style} className={finalClassName} target={newTab ? '_blank' : undefined} download={download} rel={dest && dest.tag === 'external' ? 'external' : undefined}>
      {symbol_ && symbol_.tag === 'left'
        ? (<LinkSymbol symbol_={symbol_.value} className={`mr-2 ${symbolClassName}`} />)
        : null}
      {children}
      {symbol_ && symbol_.tag === 'right'
        ? (<LinkSymbol symbol_={symbol_.value} className={`ml-2 ${symbolClassName}`} />)
        : null}
    </a>
  );
}

export function ButtonLink(props: ButtonProps) {
  const {
    color,
    size = 'md',
    className = '',
    outline = false,
    disabled
  } = props;
  const anchorProps: AnchorProps = {
    ...props,
    button: false,
    color: undefined,
    className: `${className} d-inline-flex flex-nowrap align-items-center btn btn-${size} ${color ? `btn-${!disabled && outline ? 'outline-' : ''}${color}` : ''}`
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
