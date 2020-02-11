import { View } from 'front-end/lib/framework';
import { ThemeColor } from 'front-end/lib/types';
import Icon, { AvailableIcons } from 'front-end/lib/views/icon';
import React from 'react';

export interface Props {
  icon: AvailableIcons;
  iconColor?: ThemeColor;
  name: string;
  value: string;
  className?: string;
}

const ReportCard: View<Props> = ({ icon, iconColor = 'info', name, value, className = '' }) => {
  return (
    <div className={`p-4 bg-blue-light d-flex flex-nowrap align-items-center rounded ${className}`}>
      <div className='flex-shrink-0 d-flex align-items-center justify-content-center rounded-circle bg-white mr-3' style={{ width: '2.8rem', height: '2.8rem' }}>
        <Icon name={icon} width={1.25} height={1.25} color={iconColor} />
      </div>
      <div className='flex-grow-1 text-nowrap'>
        <div className='font-weight-bold'>{value}</div>
        <div className='font-size-small'>{name}</div>
      </div>
    </div>
  );
};

export default ReportCard;
