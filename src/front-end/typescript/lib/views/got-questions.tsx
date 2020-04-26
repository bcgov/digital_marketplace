import { CONTACT_EMAIL } from 'front-end/config';
import { View } from 'front-end/lib/framework';
import Icon from 'front-end/lib/views/icon';
import Link, { emailDest, iconLinkSymbol, leftPlacement } from 'front-end/lib/views/link';
import React from 'react';

export interface Props {
  className?: string;
}

const GotQuestions: View<Props> = ({ className = '' }) => {
  return (
    <div className='sticky-md'>
      <div className={`rounded bg-blue-light-alt px-4 py-5 position-relative overflow-hidden ${className}`}>
        <Icon
        name='question-circle-outline'
        width={12}
        height={12}
        className='position-absolute'
        style={{ top: '-2rem', right: '-2rem', opacity: '0.12' }}
        color='blue-alt-2' />
        <h5 className='mb-3'>Got Questions?</h5>
        <p className='mb-4'>If you have questions about this opportunity, send an email to the Procurement team by clicking the "Contact" button below.</p>
        <Link
          dest={emailDest(CONTACT_EMAIL)}
          symbol_={leftPlacement(iconLinkSymbol('envelope'))}
          color='info'
          size='sm'
          outline
          button>
          Contact
        </Link>
      </div>
    </div>
  );
};

export default GotQuestions;
