import { Msg, State } from "front-end/lib/app/types";
import * as AcceptNewTerms from "front-end/lib/components/accept-new-app-terms";
import { PageGetModal } from "front-end/lib/framework";
import { adt } from "shared/lib/types";

const getModal: PageGetModal<State, Msg> = (state) => {
  if (!state.showModal) {
    return null;
  }
  switch (state.showModal) {
    case "acceptNewTerms": {
      const loading = state.acceptNewTermsLoading > 0;
      return AcceptNewTerms.makeModal<Msg>({
        loading,
        disabled: !AcceptNewTerms.getCheckbox(state.acceptNewTerms) || loading,
        state: state.acceptNewTerms,
        mapMsg: (msg) => adt("acceptNewTerms", msg) as Msg,
        onSubmitMsg: adt("submitAcceptNewTerms"),
        onCloseMsg: adt("hideModal")
      });
    }
  }
};

export default getModal;
