import { View, ViewElementChildren } from 'front-end/lib/framework';
import React from 'react';

export interface Props {
  children: ViewElementChildren;
}

export const view: View<Props> = ({ children }) => {
  return (
    <div className='position-sticky' style={{ top: '5rem' }}>
      {children}
    </div>
  );
};

export default view;
