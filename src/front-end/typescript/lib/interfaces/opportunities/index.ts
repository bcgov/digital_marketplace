import cwu from "front-end/lib/interfaces/opportunities/code-with-us";
import swu from "front-end/lib/interfaces/opportunities/sprint-with-us";
import twu from "front-end/lib/interfaces/opportunities/team-with-us";
import {
  OppHelpers,
  Opportunity
} from "front-end/lib/interfaces/opportunities/types";
import { ProgramType } from "front-end/lib/views/program-type";

function oppHelpers(
  opportunity: Opportunity
): OppHelpers<Opportunity["value"]> {
  return (
    {
      cwu,
      swu,
      twu
    } as Record<ProgramType, OppHelpers<Opportunity["value"]>>
  )[opportunity.tag];
}

export default oppHelpers;
