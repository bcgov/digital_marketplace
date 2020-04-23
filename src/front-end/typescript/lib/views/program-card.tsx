import { View, ViewElement } from 'front-end/lib/framework';
import { TextColor } from 'front-end/lib/types';
import Link, { ButtonProps, Props as LinkProps } from 'front-end/lib/views/link';
import React from 'react';
import { Col } from 'reactstrap';

interface ProgramCardProps {
  img: string;
  title: string;
  description: ViewElement;
  className?: string;
  links: LinkProps[];
  wideLinks?: boolean;
}

export const ProgramCard: View<ProgramCardProps> = ({ img, title, description, links, wideLinks }) => {
  return (
    <Col xs='12' md='6' className='mb-4 mb-md-0'>
      <div className='d-flex flex-column align-items-center bg-white rounded-lg border p-4 p-sm-5 text-center h-100'>
        <img src={img} className='w-100' style={{ maxHeight: '200px' }} alt={`${title} Image`} />
        <h1 className='my-4'>{title}</h1>
        <p className='mb-4 mb-sm-5'>{description}</p>
        <div className={`mt-auto d-flex flex-column mb-n3 ${wideLinks ? 'align-self-stretch' : ''} `}>
          {links.map((link, index) => (
            <Link
              key={index}
              button
              outline={(link as ButtonProps).outline || false}
              color={link.color as TextColor || 'info'}
              dest={link.dest}
              className='justify-content-center mb-3'
            >
              {link.children}
            </Link>
          ))}
        </div>
      </div>
    </Col>
  );
};
