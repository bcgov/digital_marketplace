import { Route } from "front-end/lib/app/types";
import { ThemeColor } from "front-end/lib/types";
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

export type GetOppEditRoute = (id: Id) => Route;

type ListOppHelpers<Opp> = {
  getOppViewRoute(id: Id): Route;
  getOppEditRoute: GetOppEditRoute;
  isOpportunityAcceptingProposals(opportunity: Opp): boolean;
  getOppDollarAmount(opportunity: Opp): number;
};

type DashboardOppHelpers<Opp extends Opportunity["value"]> = {
  getDefaultTitle(): string;
  getOppEditRoute: GetOppEditRoute;
  getOppStatusColor(status: Opp["status"]): ThemeColor;
  getOppStatusText(status: Opp["status"]): string;
};

export interface OppHelpers<Opp extends Opportunity["value"]> {
  list: ListOppHelpers<Opp>;
  dashboard: DashboardOppHelpers<Opp>;
}
