import { View, ViewElementChildren } from 'front-end/lib/framework';
import { ThemeColor } from 'front-end/lib/types';
import React from 'react';

export interface Props {
  spacing: '1' | '2' | '3' | '4' | '5' | '6' | '7' | 1 | 2 | 3 | 4 | 5 | 6 | 7;
  direction?: 'x' | 'y';
  children: ViewElementChildren;
  color?: ThemeColor;
  className?: string;
}

const Separator: View<Props> = ({ spacing, direction = 'x', children, className = '', color = 'body' }) => {
  return (
    <span className={`text-${color} p${direction}-${spacing} ${className}`}>
      {children}
    </span>
  );
};

export default Separator;
