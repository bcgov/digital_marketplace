import { State } from 'front-end/lib/app/types';
import { Init } from 'front-end/lib/framework';

const init: Init<null, State> = async () => {
  return {
    ready: false,
    transitionLoading: 0,
    isNavOpen: false,
    modal: {
      open: false,
      content: {
        title: '',
        body: '',
        onCloseMsg: { tag: 'noop', value: undefined },
        actions: []
      }
    },
    shared: {
      session: undefined
    },
    activeRoute: { tag: 'hello', value: null },
    pages: {}
  };
};

export default init;
