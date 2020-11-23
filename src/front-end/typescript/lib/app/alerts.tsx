import { Msg, State } from 'front-end/lib/app/types';
import { AppGetAlerts, emptyPageAlerts } from 'front-end/lib/framework';
import Link, { routeDest } from 'front-end/lib/views/link';
import React from 'react';
import { COPY } from 'shared/config';
import { adt } from 'shared/lib/types';

const getAlerts: AppGetAlerts<State, Msg> = ({ state, dispatch }) => {
  if (state.shared.session?.user.acceptedTermsAt) {
    return emptyPageAlerts();
  } else {
    return {
      ...emptyPageAlerts(),
      warnings: [{
        text: (
          <div>
            The <i>{COPY.appTermsTitle}</i> have been updated. Please save what you are working on, <Link newTab dest={routeDest(adt('content', 'terms-and-conditions'))}>review the latest version</Link> and <Link onClick={() => dispatch(adt('showModal', 'acceptNewTerms' as const))}> agree to the updated terms</Link>.
          </div>
        )
      }]
    };
  }
};

export default getAlerts;
