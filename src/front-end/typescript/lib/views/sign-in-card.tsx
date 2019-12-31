// import { Route } from 'front-end/lib/app/types';
import { getSignInUrl } from 'front-end/lib/index';
import Icon, { AvailableIcons } from 'front-end/lib/views/icon';
import Link, { externalDest } from 'front-end/lib/views/link';
import React from 'react';
import { Col, Row } from 'reactstrap';
import { UserType } from 'shared/lib/resources/user';

export interface SignInCardProps {
  title: string;
  description: string;
  buttonText: string;
  userType: UserType.Vendor | UserType.Government;
}

function userTypeToIcon(userType: SignInCardProps['userType']): AvailableIcons {
  switch (userType) {
    case UserType.Vendor:
      return 'vendor';
    case UserType.Government:
      return 'government';
  }
}

export function SignInCard(props: SignInCardProps) {
  return (
    <Row>
      <Col xs='12'>
        <div className='mx-auto bg-white p-4 shadow mb-4 border rounded-sm'>
          <h3 className='d-flex align-items-start flex-nowrap'>
            <Icon
              name={userTypeToIcon(props.userType)}
              width={1.75}
              height={1.75}
              className='mt-1'
              color='info' />
            <span className='pl-2'>{props.title}</span>
          </h3>
          <p>{props.description}</p>
          <Link
            button
            dest={externalDest(getSignInUrl(props.userType))}
            className='btn-primary'>
            {props.buttonText}
          </Link>
        </div>
      </Col>
    </Row>
  );
}
