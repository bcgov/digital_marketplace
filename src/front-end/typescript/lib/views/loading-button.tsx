import { View } from 'front-end/lib/framework';
import { ButtonColor } from 'front-end/lib/types';
import { noop } from 'lodash';
import { default as React, MouseEventHandler, ReactElement } from 'react';
import { Button, Spinner } from 'reactstrap';

export interface Props {
  children: Array<ReactElement<any>> | string;
  color: ButtonColor;
  size?: 'sm' | 'md' | 'lg';
  spinnerColor?: string;
  loading: boolean;
  disabled: boolean;
  onClick?: MouseEventHandler<HTMLButtonElement>;
  className?: string;
}

const Children: View<Props> = ({ loading, children, spinnerColor = 'light' }) => {
  if (loading) {
    return (<Spinner color={spinnerColor} size='sm' />);
  } else {
    return (<div>{children || ''}</div>);
  }
};

const LoadingButton: View<Props> = props => {
  const className = `${props.className || ''} text-nowrap`;
  return (
    <Button color={props.color} size={props.size || 'md'} onClick={props.onClick || noop} disabled={props.disabled} className={className}>
      <Children {...props} />
    </Button>
  );
};

export default LoadingButton;
