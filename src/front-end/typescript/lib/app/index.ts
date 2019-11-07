import init from 'front-end/lib/app/init';
import router from 'front-end/lib/app/router';
import { Msg, Route, State } from 'front-end/lib/app/types';
import update from 'front-end/lib/app/update';
import view from 'front-end/lib/app/view';
import { AppComponent } from 'front-end/lib/framework';

const app: AppComponent<State, Msg, Route> = {
  init,
  update,
  view,
  router
};

export default app;
