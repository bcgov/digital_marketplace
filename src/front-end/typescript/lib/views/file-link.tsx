import { View } from 'front-end/lib/framework';
import Link, { ExtendAndOmitProps as LinkProps } from 'front-end/lib/views/link';
import React, { Fragment } from 'react';

interface ExtraProps {
  accept?: readonly string[];
  onChange(file: File): void;
}

export type Props = LinkProps<ExtraProps, 'dest' | 'onClick'>;

const FileLink: View<Props> = props => {
  return (
    <Link
      {...props}
      className={`${props.className || ''} position-relative overflow-hidden`}>
      <input
        tabIndex={!props.disabled && props.focusable ? 0 : -1}
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
};

export default FileLink;
