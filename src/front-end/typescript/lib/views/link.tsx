import router from 'front-end/lib/app/router';
import { Route } from 'front-end/lib/app/types';
import { ButtonColor, TextColor } from 'front-end/lib/types';
import { CSSProperties, default as React, MouseEvent, ReactElement } from 'react';

interface BaseProps {
  children: Array<ReactElement<any> | string> | ReactElement<any> | string;
  className?: string;
  style?: CSSProperties;
  disabled?: boolean;
  href?: string;
  route?: Route;
  onClick?(): void;
}

interface AnchorProps extends BaseProps {
  button?: false;
  color?: TextColor;
  nav?: boolean;
  newTab?: boolean;
  download?: boolean;
}

interface ButtonProps extends BaseProps {
  button: true;
  outline?: boolean;
  color?: ButtonColor;
  size?: 'sm' | 'md' | 'lg';
}

export type Props = AnchorProps | ButtonProps;

function AnchorLink(props: AnchorProps) {
  // Initialize props.
  const {
    color,
    nav = false,
    className = '',
    disabled = false,
    children,
    href = '#',
    route,
    onClick,
    newTab = false,
    download = false
  } = props;
  // Give precedence to the `route` prop over the `href` prop.
  const finalHref: string
    = disabled
    ? ''
    : route
    ? router.routeToUrl(route)
    : href;
  let finalClassName = className;
  finalClassName += nav ? ' nav-link' : '';
  finalClassName += disabled ? ' disabled' : '';
  finalClassName += color ? ` text-${color}` : '';
  const finalOnClick = onClick && ((e: MouseEvent<HTMLAnchorElement>) => {
    if (!e.ctrlKey && !e.metaKey && !e.shiftKey) { e.preventDefault(); }
    if (!disabled) { onClick(); }
  });
  return (
    <a href={finalHref} onClick={finalOnClick} className={finalClassName} target={newTab ? '_blank' : undefined} download={download}>
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
