import { APP_TERMS_CONTENT_ID } from 'front-end/typescript/config';
import { Msg, State } from 'front-end/typescript/lib/app/types';
import { AppGetAlerts, emptyPageAlerts } from 'front-end/typescript/lib/framework';
import Link, { routeDest } from 'front-end/typescript/lib/views/link';
import React from 'react';
import { COPY } from 'shared/config';
import { adt } from 'shared/lib/types';

const getAlerts: AppGetAlerts<State, Msg> = ({ state, dispatch }) => {
  const user = state.shared.session?.user;
  if (user && user.lastAcceptedTermsAt && !user.acceptedTermsAt) {
    return {
      ...emptyPageAlerts(),
      warnings: [{
        text: (
          <div>
            The <i>{COPY.appTermsTitle}</i> have been updated. Please save what you are working on, <Link newTab dest={routeDest(adt('contentView', APP_TERMS_CONTENT_ID))}>review the latest version</Link> and <Link onClick={() => dispatch(adt('showModal', 'acceptNewTerms' as const))}> agree to the updated terms</Link>.
          </div>
        )
      }]
    };
  } else {
    return emptyPageAlerts();
  }
};

export default getAlerts;
