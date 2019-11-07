import { NODE_ENV } from 'front-end/config';
import app from 'front-end/lib/app/index';
import { start } from 'front-end/lib/framework';
import { set } from 'lodash';

const element = document.getElementById('main') || document.body;
const debug = NODE_ENV === 'development';
start(app, element, debug)
  .then(stateManager => {
    if (debug) {
      set(window, 'stateManager', stateManager);
    }
  });
