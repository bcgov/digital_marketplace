import { Init, PageComponent } from 'front-end/lib/framework';
import { User } from 'shared/lib/resources/user';

export interface Params {
  profileUser: User;
  viewerUser: User;
}

export interface Component<Params, State, Msg> extends Pick<PageComponent<never, never, State, Msg>, 'update' | 'view' | 'getAlerts' | 'getModal'> {
  init: Init<Params, State>;
}
