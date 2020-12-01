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
  icon?: AvailableIcons;
  iconWidth?: number;
  iconHeight?: number;
  iconClassName?: string;
  iconColor?: ThemeColor;
  chevronWidth?: number;
  chevronHeight?: number;
  className?: string;
  badge?: ViewElementChildren;
  rightAlignedElement?: ViewElementChildren;
  children: ViewElementChildren;
  childrenWrapperClassName?: string;
  fullWidth?: boolean;
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
    rightAlignedElement,
    children,
    childrenWrapperClassName = '',
    fullWidth = true,
    toggle,
    badge
  } = props;
  const linkClassName = fullWidth ? 'align-items-center flex-nowrap w-100' : 'align-items-left flex-nowrap';
  return (
    <div className={`pt-2 ${open ? 'pb-4' : 'pb-2'} ${className}`}>
      <div className='d-flex flex-md-row flex-column-reverse justify-content-md-between'>
        <div className='d-flex flex-row mr-auto'>
          <Link color={color} disabled={disabled} className={linkClassName} onClick={toggle}>
            <div className='d-flex align-items-center flex-nowrap'>
              {icon ? (<Icon name={icon} color={iconColor} className={`mr-2 ${iconClassName}`} width={iconWidth} height={iconHeight} />) : null}
              <div className={titleClassName}>{title}</div>
            </div>
          </Link>
          <div className='mr-2'>{badge}</div>
          <Icon className='mr-2' name={open ? 'chevron-up' : 'chevron-down'} width={chevronWidth} height={chevronHeight} />
        </div>
        {rightAlignedElement ? (<div className='align-items-right mb-2 mb-md-0'>
          {rightAlignedElement}
        </div>) : null}
      </div>
      <div className={`${childrenWrapperClassName} ${open ? 'mt-4' : 'd-none'}`}>
        {children}
      </div>
    </div>
  );
};

export default view;
