import { View } from 'front-end/lib/framework';
import { BootstrapColor } from 'front-end/lib/types';
import React from 'react';
import * as reactstrap from 'reactstrap';

export interface Props {
  text: string;
  color: BootstrapColor;
  className?: string;
  pill?: boolean;
}

const Badge: View<Props> = ({ text, color, className = '', pill }) => {
  className = `py-1 px-2 small ${className}`;
  return (
    <reactstrap.Badge color={color} className={className} pill={pill}>
      {text}
    </reactstrap.Badge>
  );
};

export default Badge;
