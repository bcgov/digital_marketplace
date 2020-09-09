import { View, ViewElement } from 'front-end/lib/framework';
import Link, { ButtonProps } from 'front-end/lib/views/link';
import React from 'react';
import { Col } from 'reactstrap';

export interface Props {
  img: string;
  title: string;
  description: ViewElement;
  className?: string;
  links: ButtonProps[];
  wideLinks?: boolean;
}

const ProgramCard: View<Props> = ({ img, title, description, links, wideLinks, className }) => {
  return (
    <Col xs='12' md='6' className={className}>
      <div className='d-flex flex-column align-items-center bg-blue-light rounded-lg border p-4 p-sm-5 text-center h-100 shadow-hover'>
        <img src={img} className='w-100' style={{ maxHeight: '200px' }} alt={`${title} Image`} />
        <h2 className='roboto font-weight-normal my-4'>{title}</h2>
        <div className='mb-4 mb-sm-5'>{description}</div>
        <div className={`mt-auto d-flex flex-column ${wideLinks ? 'align-self-stretch' : ''} `}>
          {links.map((link, index) => (
            <Link
              {...link}
              className={`justify-content-center ${index < links.length - 1 ? 'mb-3' : ''}`}
              key={`program-card-link-${index}`}
            />
          ))}
        </div>
      </div>
    </Col>
  );
};

export default ProgramCard;
