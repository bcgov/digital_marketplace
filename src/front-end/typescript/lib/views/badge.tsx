import { View } from 'front-end/lib/framework';
import { ThemeColor } from 'front-end/lib/types';
import React from 'react';
import * as reactstrap from 'reactstrap';

export interface Props {
  text: string;
  color: ThemeColor;
  className?: string;
  pill?: boolean;
}

const Badge: View<Props> = ({ text, color, className = '', pill }) => {
  className = `${className} text-capitalize text-nowrap`;
  return (
    <reactstrap.Badge color={color} className={className} pill={pill}>
      {text}
    </reactstrap.Badge>
  );
};

export default Badge;
