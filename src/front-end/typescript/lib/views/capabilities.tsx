import { View } from 'front-end/lib/framework';
import Icon from 'front-end/lib/views/icon';
import React from 'react';
import { Col, Row } from 'reactstrap';

export interface Capability {
  capability: string;
  checked: boolean;
}

export interface Props {
  className?: string;
  capabilities: Capability[];
  grid?: boolean;
}

interface CapabilityProps extends Capability {
  index: number;
}

const Capability: View<CapabilityProps> = ({ capability, checked, index }) => {
  return (
    <div className='border-right border-bottom d-flex flex-nowrap align-items-center p-2'>
      <Icon name={checked ? 'check-circle' : 'circle'} color={checked ? 'success' : 'secondary'} className='mr-2' width={0.9} height={0.9} />
      <div className={`py-1 font-size-small text-nowrap ${checked ? 'text-body' : 'text-secondary'}`}>{capability}</div>
    </div>
  );
};

const Capabilities: View<Props> = ({ className = '', capabilities, grid }) => {
  return (
    <Row noGutters className={`border-top border-left ${className}`}>
      {capabilities.map((c, i) => (
        <Col xs='12' md={grid ? '6' : undefined} key={`phase-capability-${i}`}>
          <Capability
            {...c}
            index={i} />
        </Col>
      ))}
    </Row>
  );
};

export default Capabilities;
