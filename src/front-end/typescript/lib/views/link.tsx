import router from 'front-end/lib/app/router';
import { Route } from 'front-end/lib/app/types';
import { View, ViewElementChildren } from 'front-end/lib/framework';
import { ButtonColor, TextColor } from 'front-end/lib/types';
import Icon, { AvailableIcons } from 'front-end/lib/views/icon';
import React, { CSSProperties, MouseEvent } from 'react';
import { Spinner } from 'reactstrap';
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

function makeEmptyLinkSymbol(s?: Placement<LinkSymbol>): Placement<LinkSymbol> | undefined {
  if (s && s.value.tag === 'icon') {
    return {
      tag: s.tag,
      value: emptyIconLinkSymbol()
    };
  } else {
    return undefined;
  }
}

export type LinkSymbol = IconLinkSymbol | ImageLinkSymbol | EmptyIconLinkSymbol;

interface LinkSymbolProps {
  symbol_: LinkSymbol;
  className?: string;
}

const ICON_SIZE = 1; //rem

const LinkSymbol: View<LinkSymbolProps> = ({ symbol_, className = '' }) => {
  className = `${className} flex-shrink-0 flex-grow-0`;
  switch (symbol_.tag) {
    case 'icon':
      return (<Icon name={symbol_.value} className={className} width={ICON_SIZE} height={ICON_SIZE} />);
    case 'image':
      return (<img src={symbol_.value} className={className} style={{ width: '1.75rem', height: '1.75rem', objectFit: 'cover', borderRadius: '50%' }} />);
    case 'emptyIcon':
      return (<div style={{ width: `${ICON_SIZE}rem`, height: `${ICON_SIZE}rem` }} className={className}></div>);
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
  loading?: boolean;
  color?: ButtonColor;
  size?: 'sm' | 'md' | 'lg';
}

export type Props = AnchorProps | ButtonProps;

export type OmitProps<OmitKeys extends keyof BaseProps | '' = ''> = Omit<AnchorProps, OmitKeys> | Omit<ButtonProps, OmitKeys>;

export type ExtendProps<Extension> = AnchorProps & Extension | ButtonProps & Extension;

export type ExtendAndOmitProps<Extension, OmitKeys extends keyof BaseProps> = Omit<AnchorProps, OmitKeys> & Extension | Omit<ButtonProps, OmitKeys> & Extension;

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
  const href: string | undefined = (() => {
    if (disabled) { return undefined; }
    if (!dest) { return ''; }
    switch (dest.tag) {
      case 'route': return router.routeToUrl(dest.value);
      case 'external': return dest.value;
      case 'email': return `mailto:${dest.value}`;
    }
  })();
  let finalClassName = 'a d-inline-flex align-items-center flex-nowrap';
  finalClassName += nav ? ' nav-link' : '';
  finalClassName += disabled ? ' disabled' : '';
  finalClassName += color ? ` text-${color}` : '';
  finalClassName += color && !disabled ? ` text-hover-${color}` : '';
  finalClassName += ` ${className}`;
  const finalOnClick = !disabled && onClick
    ? ((e: MouseEvent<HTMLElement>): false | void => {
        if (!newTab && !e.ctrlKey && !e.metaKey) { e.preventDefault(); }
        onClick();
      })
    : undefined;
  // If no dest is provided, render as a div
  // to avoid accidental routing.
  const Tag = dest ? 'a' : 'div';
  const isAnchor = Tag === 'a';
  const finalProps = {
    href: isAnchor ? href : undefined,
    onClick: finalOnClick,
    style,
    className: finalClassName,
    target: isAnchor && newTab ? '_blank' : undefined,
    download: isAnchor ? download : undefined,
    rel: isAnchor && dest && dest.tag === 'external' ? 'external' : undefined
  };
  return (
    <Tag {...finalProps}>
      {symbol_ && symbol_.tag === 'left'
        ? (<LinkSymbol symbol_={symbol_.value} className={`mr-2 ${symbolClassName}`} />)
        : null}
      {children}
      {symbol_ && symbol_.tag === 'right'
        ? (<LinkSymbol symbol_={symbol_.value} className={`ml-2 ${symbolClassName}`} />)
        : null}
    </Tag>
  );
}

export function ButtonLink(props: ButtonProps) {
  const {
    color,
    className = '',
    size = 'md',
    outline = false,
    children,
    loading,
    symbol_
  } = props;
  const disabled = props.disabled !== undefined ? props.disabled : loading;
  const anchorProps: AnchorProps = {
    ...props,
    disabled,
    symbol_: loading ? makeEmptyLinkSymbol(symbol_) : symbol_,
    children: undefined,
    button: false,
    color: undefined,
    className: `${className} position-relative btn btn-${size} ${color ? `btn-${!disabled && outline ? 'outline-' : ''}${color}` : ''}`
  };
  return (
    <AnchorLink {...anchorProps}>
      {loading
        ? (<div>
            <div className='position-absolute' style={{ top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }}>
              <Spinner color='light' size='sm' />
            </div>
            <div className='o-0 d-inline-flex align-items-center flex-nowrap'>{children}</div>
          </div>)
        : children}
    </AnchorLink>
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
