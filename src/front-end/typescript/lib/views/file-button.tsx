import { View } from 'front-end/lib/framework';
import Link, { ButtonProps } from 'front-end/lib/views/link';
import React, { Fragment } from 'react';

export interface Props extends Omit<ButtonProps, 'button' | 'dest' | 'onClick'> {
  accept?: string[];
  onChange(file: File): void;
}

const FileButton: View<Props> = props => {
  //tslint:disable no-empty
  return (
    <Link
      {...props}
      onClick={() => {}}
      button
      className={`${props.className || ''} position-relative overflow-hidden`}>
      <input
        accept={props.accept && props.accept.join(',')}
        type='file'
        className='position-absolute w-100 h-100 o-0'
        style={{
          top: 0,
          left: 0,
          cursor: 'pointer',
          border: '200px solid transparent'
        }}
        onChange={e => {
          if (e.currentTarget.files && e.currentTarget.files[0]) {
            props.onChange(e.currentTarget.files[0]);
          }
        }} />
      <Fragment>
        {props.children}
      </Fragment>
    </Link>
  );
  //tslint:enable no-empty
};

export default FileButton;
