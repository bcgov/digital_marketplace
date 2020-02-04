import { View } from 'front-end/lib/framework';
import React from 'react';

interface RadioProps {
  id: string;
  label: string;
  checked: boolean;
  onClick: () => void;
}

const Radio: View<RadioProps> = (props) => {
  return (
    <div
      id={props.id}
      onClick={ (evt) => { props.onClick(); } }
    >
      <span>{props.label}</span>
    </div>
  );
};

export default Radio;
