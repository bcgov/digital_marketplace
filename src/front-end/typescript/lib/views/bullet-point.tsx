import { View } from 'front-end/lib/framework';
import { ThemeColor } from 'front-end/lib/types';
import Icon, { AvailableIcons } from 'front-end/lib/views/icon';
import React from 'react';

export interface Props {
  icon?: AvailableIcons;
  iconColor?: ThemeColor;
  header: string;
  subText?: string;
  className?: string;
}

export const BulletPoint: View<Props> = ({ icon = null, iconColor = 'info', header, subText, className }) => {
  return (
    <div className={`d-flex ${className}`}>
      {icon ? <Icon className='flex-shrink-0' name={icon} color={iconColor} />:null}
      <div className=''>
        <h6 className='m-0 mb-2'>{header}</h6>
        <span className='font-weight-light'>{subText}</span>
      </div>
    </div>
  );
};

export default BulletPoint;
