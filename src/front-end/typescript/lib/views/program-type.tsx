import { View } from 'front-end/lib/framework';
import Icon from 'front-end/lib/views/icon';
import React from 'react';

export type ProgramType = 'cwu' | 'swu';

export interface Props {
  type_: ProgramType;
  className?: string;
}

const ProgramType: View<Props> = ({ type_, className = '' }) => {
  return (
    <div className={`d-flex flex-nowrap align-items-center font-weight-bold text-info ${className}`}>
      <Icon
        className='mr-2 flex-shrink-0 flex-grow-0'
        name={type_ === 'cwu' ? 'code-solid' : 'users-class'} />
      {type_ === 'cwu' ? 'Code With Us' : 'Sprint With Us'}
    </div>
  );
};

export default ProgramType;
