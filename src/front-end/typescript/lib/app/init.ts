import { TWU_BANNER_ACKNOWLEDGED } from "front-end/config";
import { State, Msg } from "front-end/lib/app/types";
import * as Nav from "front-end/lib/app/view/nav";
import * as AcceptNewTerms from "front-end/lib/components/accept-new-app-terms";
import { immutable, component } from "front-end/lib/framework";
import { adt } from "shared/lib/types";

const init: component.base.Init<null, State, Msg> = () => {
  const [acceptNewTermsState, acceptNewTermsCmds] = AcceptNewTerms.init({
    errors: [],
    child: {
      value: false,
      id: "global-accept-new-terms"
    }
  });
  const [navState, navCmds] = Nav.init(null);
  return [
    {
      showTWUBanner: false,
      ready: false,
      incomingRoute: null,
      toasts: [],
      showModal: null,
      acceptNewTerms: immutable(acceptNewTermsState),
      acceptNewTermsLoading: 0,
      shared: {
        session: null
      },
      activeRoute: adt("landing", null),
      nav: immutable(navState),
      pages: {}
    },
    [
      ...component.cmd.mapMany(
        acceptNewTermsCmds,
        (msg) => adt("acceptNewTerms", msg) as Msg
      ),
      ...component.cmd.mapMany(navCmds, (msg) => adt("nav", msg) as Msg),
      component.cmd.localStorage.getItem(TWU_BANNER_ACKNOWLEDGED, (msg) =>
        adt("setShowTWUBanner", !msg)
      )
    ]
  ];
};

export default init;
