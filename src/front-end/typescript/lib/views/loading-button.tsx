import { View } from 'front-end/lib/framework';
import Link, { ButtonProps, emptyIconLinkSymbol, LinkSymbol, Placement } from 'front-end/lib/views/link';
import React, { MouseEvent } from 'react';
import { Spinner } from 'reactstrap';

export interface Props extends Omit<ButtonProps, 'button' | 'dest' | 'onClick'> {
  loading: boolean;
  onClick(e?: MouseEvent): void;
}

const Children: View<Props> = ({ loading, children = '' }) => {
  if (loading) {
    return (
      <div>
        <div className='position-absolute d-flex' style={{ top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }}>
          <Spinner color='light' size='sm' />
        </div>
        <div className='o-0'>{children}</div>
      </div>
    );
  } else {
    return (<div>{children}</div>);
  }
};

function makeEmptyLinkSymbol(s?: Placement<LinkSymbol>): Placement<LinkSymbol> | undefined {
  if (s && s.value.tag === 'icon') {
    return {
      tag: s.tag,
      value: emptyIconLinkSymbol()
    };
  } else {
    return undefined;
  }
}

const LoadingButton: View<Props> = props => {
  const className = `${props.className || ''} position-relative`;
  return (
    <Link button {...props} className={className} symbol_={props.loading ? makeEmptyLinkSymbol(props.symbol_) : props.symbol_} disabled={props.disabled !== undefined ? props.disabled : props.loading}>
      <Children {...props} />
    </Link>
  );
};

export default LoadingButton;
