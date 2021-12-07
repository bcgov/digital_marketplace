import { State } from 'front-end/lib/app/types';
import * as Nav from 'front-end/lib/app/view/nav';
import * as AcceptNewTerms from 'front-end/lib/components/accept-new-app-terms';
import { immutable, Init } from 'front-end/lib/framework';

const init: Init<null, State> = async () => {
  return {
    ready: false,
    transitionLoading: 0,
    toasts: [],
    showModal: null,
    acceptNewTerms: immutable(await AcceptNewTerms.init({
      errors: [],
      child: {
        value: false,
        id: 'global-accept-new-terms'
      }
    })),
    acceptNewTermsLoading: 0,
    shared: {
      session: null
    },
    activeRoute: { tag: 'landing', value: null },
    nav: immutable(await Nav.init(null)),
    pages: {}
  };
};

export default init;
