import { View, ViewElementChildren } from 'front-end/lib/framework';
import { ThemeColor } from 'front-end/lib/types';
import Icon, { AvailableIcons } from 'front-end/lib/views/icon';
import Link from 'front-end/lib/views/link';
import React from 'react';

export interface Props {
  open: boolean;
  disabled?: boolean;
  color: ThemeColor;
  title: string;
  titleClassName?: string;
  icon: AvailableIcons;
  iconWidth?: number;
  iconHeight?: number;
  iconClassName?: string;
  iconColor?: ThemeColor;
  chevronWidth?: number;
  chevronHeight?: number;
  className?: string;
  children: ViewElementChildren;
  childrenWrapperClassName?: string;
  toggle(): void;
}

export const view: View<Props> = props => {
  const {
    open,
    disabled,
    color,
    title,
    titleClassName = '',
    icon,
    iconWidth,
    iconHeight,
    iconClassName,
    iconColor,
    chevronWidth,
    chevronHeight,
    className = '',
    children,
    childrenWrapperClassName = '',
    toggle
  } = props;
  return (
    <div className={`py-2 ${className}`}>
      <Link color={color} disabled={disabled} className='align-items-center flex-nowrap w-100' onClick={toggle}>
        <div className='d-flex align-items-center flex-nowrap'>
          <Icon name={icon} color={iconColor} className={`mr-2 ${iconClassName}`} width={iconWidth} height={iconHeight} />
          <div className={titleClassName}>{title}</div>
        </div>
        <Icon className={`ml-auto`} name={open ? 'chevron-up' : 'chevron-down'} width={chevronWidth} height={chevronHeight} />
      </Link>
      <div className={`${childrenWrapperClassName} ${open ? 'mt-4' : 'd-none'}`}>
        {children}
      </div>
    </div>
  );
};

export default view;
