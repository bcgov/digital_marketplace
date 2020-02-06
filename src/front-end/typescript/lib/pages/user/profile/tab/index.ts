import { Init, PageComponent } from 'front-end/lib/framework';
import { User } from 'shared/lib/resources/user';

export interface Params {
  profileUser: User;
  viewerUser: User;
}

export interface Component<State, Msg> extends Pick<PageComponent<never, never, State, Msg>, 'update' | 'view' | 'getAlerts' | 'getModal' | 'getContextualActions'> {
  init: Init<Params, State>;
}
