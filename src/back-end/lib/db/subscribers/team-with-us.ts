import { Id } from "shared/lib/types";

export interface RawSWUOpportunitySubscriber {
  opportunity: Id;
  user: Id;
  createdAt: Date;
}
