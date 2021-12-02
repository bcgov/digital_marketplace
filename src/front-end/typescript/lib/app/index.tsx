import init from 'front-end/typescript/lib/app/init';
import router from 'front-end/typescript/lib/app/router';
import { Msg, Route, State } from 'front-end/typescript/lib/app/types';
import update from 'front-end/typescript/lib/app/update';
import view from 'front-end/typescript/lib/app/view';
import { AppComponent } from 'front-end/typescript/lib/framework';

const app: AppComponent<State, Msg, Route> = {
  init,
  update,
  view,
  router
};

export default app;
