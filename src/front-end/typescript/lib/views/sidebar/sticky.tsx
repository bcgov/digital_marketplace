import { View, ViewElementChildren } from 'front-end/lib/framework';
import React from 'react';

/**
 * This view makes it children sticky (to the top)
 * of the sidebar on desktop (md and up) viewports.
 */

export interface Props {
  children: ViewElementChildren;
}

export const view: View<Props> = ({ children }) => {
  return (
    <div className='sticky'>
      {children}
    </div>
  );
};

export default view;
