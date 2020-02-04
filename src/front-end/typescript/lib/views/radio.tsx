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
      className='d-inline-block pr-3'
      onClick={ (evt) => { props.onClick(); } }
     >
       <input
         id={props.id}
         type='radio'
         name='{props.label}'
         checked={props.checked}
         value='ignored'
       ></input>
      <span className='pl-1'>{props.label}</span>
    </div>
  );
};

export default Radio;
