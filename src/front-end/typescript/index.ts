import { NODE_ENV } from 'front-end/config';
import app from 'front-end/lib/app/index';
import { start } from 'front-end/lib/framework';
import { set } from 'lodash';
import { adt } from 'shared/lib/types';

const element = document.getElementById('main') || document.body;
const debug = NODE_ENV === 'development';
start(app, element, debug)
  .then(stateManager => {
    // Expose state manager in development.
    if (debug) {
      set(window, 'stateManager', stateManager);
    }
    // Collapse nav menus on window resize.
    window.addEventListener('resize', () => {
      stateManager.dispatch(adt('nav', adt('toggleMobileMenu' as const, false)));
      stateManager.dispatch(adt('nav', adt('toggleDesktopAccountDropdown' as const, false)));
      stateManager.dispatch(adt('nav', adt('toggleContextualDropdown' as const, false)));
    });
  });
