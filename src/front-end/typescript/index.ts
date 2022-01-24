// import { NODE_ENV } from 'front-end/config';
import app from 'front-end/lib/app';
import { start } from 'front-end/lib/framework';
import { debounce, set } from 'lodash';
import { adt } from 'shared/lib/types';

const element = document.getElementById('main') || document.body;
// brianna take this out later
// const debug = NODE_ENV === 'development';
const debug = true;
start(app, element, debug)
  .then(stateManager => {
    // Expose state manager in development.
    if (debug) {
      set(window, 'stateManager', stateManager);
    }
    const hideNavMenus = debounce(() => {
      stateManager.dispatch(adt('nav', adt('toggleMobileMenu' as const, false)));
      stateManager.dispatch(adt('nav', adt('toggleDesktopAccountDropdown' as const, false)));
      stateManager.dispatch(adt('nav', adt('toggleDesktopContextualDropdown' as const, false)));
      stateManager.dispatch(adt('nav', adt('toggleMobileContextualDropdown' as const, false)));
    }, 500, { leading: true });
    // Collapse nav menus on window resize.
    window.addEventListener('resize', hideNavMenus);
  });
