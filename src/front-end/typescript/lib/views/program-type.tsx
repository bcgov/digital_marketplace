import { View } from 'front-end/lib/framework';
import Icon from 'front-end/lib/views/icon';
import React from 'react';

export type ProgramType = 'cwu' | 'swu' | 'new';

export interface Props {
  type_: ProgramType;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

const ProgramType: View<Props> = ({ type_, className = '', size = 'md' }) => {
  const programType = (() => {
    switch (type_) {
      case 'cwu': return 'Code With Us';
      case 'swu': return 'Sprint With Us';
      case 'new': return 'New Product';
    }
  })();
  const sizeClassName = (() => {
    switch (size) {
      case 'sm': return 'font-size-small';
      case 'md': return 'font-size-base';
      case 'lg': return 'font-size-large';
    }
  })();
  const iconSize = (() => {
    switch (size) {
      case 'sm': return 0.9;
      case 'md': return 1;
      case 'lg': return 1.2;
    }
  })();
  const iconType = (() => {
    switch (type_) {
      case 'cwu': return 'code';
      case 'swu': return 'users-class';
      case 'new': return 'code';
    }
  })();

  return (
    <div className={`d-flex flex-nowrap align-items-center font-weight-bold text-info ${sizeClassName} ${className}`}>
      <Icon
        className='mr-2 flex-shrink-0 flex-grow-0'
        width={iconSize}
        height={iconSize}
        name={iconType} />
      {programType}
    </div>
  );
};

export default ProgramType;
