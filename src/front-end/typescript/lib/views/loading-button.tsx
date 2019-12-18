import { View } from 'front-end/lib/framework';
import Link, { ButtonProps } from 'front-end/lib/views/link';
import React from 'react';
import { Spinner } from 'reactstrap';

export interface Props extends Omit<ButtonProps, 'button' | 'dest' | 'onClick'> {
  loading: boolean;
  onClick(): void;
}

const Children: View<Props> = ({ loading, children }) => {
  if (loading) {
    return (<Spinner color='light' size='sm' />);
  } else {
    return (<div>{children || ''}</div>);
  }
};

const LoadingButton: View<Props> = props => {
  const className = props.className || '';
  return (
    <Link button {...props} className={className} symbol_={props.loading ? undefined : props.symbol_} disabled={props.disabled !== undefined ? props.disabled : props.loading}>
      <Children {...props} />
    </Link>
  );
};

export default LoadingButton;
