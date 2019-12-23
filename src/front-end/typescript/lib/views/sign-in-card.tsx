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
          <h2>
            <Icon
              name={userTypeToIcon(props.userType)}
              width={1.5}
              height={1.5}
              color='primary' />
            <span className='pl-1'>{props.title}</span>
          </h2>
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
