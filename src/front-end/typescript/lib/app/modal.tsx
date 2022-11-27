import { Msg, State } from "front-end/lib/app/types";
import * as AcceptNewTerms from "front-end/lib/components/accept-new-app-terms";
import { component } from "front-end/lib/framework";
import { adt } from "shared/lib/types";

const getModal: component.page.GetModal<State, Msg> = (state) => {
  if (!state.showModal) {
    return component.page.modal.hide();
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
