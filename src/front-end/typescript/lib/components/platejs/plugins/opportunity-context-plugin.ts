import { createPlatePlugin } from "@udecode/plate/react";

export interface OpportunityContext {
  title?: string;
  teaser?: string;
}

export const OpportunityContextPlugin = createPlatePlugin({
  key: "opportunityContext",
  options: {
    context: {
      title: "",
      teaser: ""
    } as OpportunityContext
  }
});
