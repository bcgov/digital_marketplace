import { EMPTY_STRING } from 'front-end/typescript/config';
import { View } from 'front-end/typescript/lib/framework';
import { AvailableIcons, IconInfo } from 'front-end/typescript/lib/views/icon';
import React from 'react';

export interface Props {
  icon: AvailableIcons;
  name: string;
  value?: string;
  className?: string;
}

const OpportunityInfo: View<Props> = ({ icon, name, value, className = '' }) => {
  return (
    <div className={`d-flex flex-nowrap flex-column align-items-start text-left ${className}`}>
      <div className='h5 mb-2'>{value || EMPTY_STRING}</div>
      <IconInfo small name={icon} value={name} className='font-size-small'/>
    </div>
  );
};

export default OpportunityInfo;
