import { Route } from "front-end/lib/app/types";
import {
  CWUOpportunity,
  CWUOpportunitySlim
} from "shared/lib/resources/opportunity/code-with-us";
import {
  SWUOpportunity,
  SWUOpportunitySlim
} from "shared/lib/resources/opportunity/sprint-with-us";
import {
  TWUOpportunity,
  TWUOpportunitySlim
} from "shared/lib/resources/opportunity/team-with-us";
import { ADT, Id } from "shared/lib/types";

export type Opportunity =
  | ADT<"cwu", CWUOpportunity | CWUOpportunitySlim>
  | ADT<"swu", SWUOpportunity | SWUOpportunitySlim>
  | ADT<"twu", TWUOpportunity | TWUOpportunitySlim>;

type ListOppHelpers<Opp> = {
  getOppViewRoute(id: Id): Route;
  getOppEditRoute(id: Id): Route;
  isOpportunityAcceptingProposals(opportunity: Opp): boolean;
  getOppDollarAmount(opportunity: Opp): number;
};

export interface OppHelpers<Opp extends Opportunity["value"]> {
  list: ListOppHelpers<Opp>;
}
