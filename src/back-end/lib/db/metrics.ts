import { tryDb } from "back-end/lib/db";
import { generateCWUOpportunityQuery as cwuQuery } from "back-end/lib/db/opportunity/code-with-us";
import { generateSWUOpportunityQuery as swuQuery } from "back-end/lib/db/opportunity/sprint-with-us";
import { generateTWUOpportunityQuery as twuQuery } from "back-end/lib/db/opportunity/team-with-us";
import { valid } from "shared/lib/http";
import { OpportunityMetrics } from "shared/lib/resources/metrics";
import { CWUOpportunityStatus } from "shared/lib/resources/opportunity/code-with-us";
import { SWUOpportunityStatus } from "shared/lib/resources/opportunity/sprint-with-us";
import { TWUOpportunityStatus } from "shared/lib/resources/opportunity/team-with-us";

export const readOpportunityMetrics = tryDb<[], OpportunityMetrics>(
  async (connection) => {
    const totals: OpportunityMetrics = {
      totalCount: 0,
      totalAwarded: 0
    };
    const cwuResult = await cwuQuery(connection).where({
      "stat.status": CWUOpportunityStatus.Awarded
    });

    totals.totalCount += cwuResult?.length || 0;
    totals.totalAwarded += cwuResult.reduce(
      (acc: number, val: Record<string, number>) => acc + val.reward,
      0
    );

    const swuResult = await swuQuery(connection).where({
      "statuses.status": SWUOpportunityStatus.Awarded
    });

    totals.totalCount += swuResult?.length || 0;
    totals.totalAwarded += swuResult.reduce(
      (acc: number, val: Record<string, number>) => acc + val.totalMaxBudget,
      0
    );

    const twuResult = await twuQuery(connection).where({
      "statuses.status": TWUOpportunityStatus.Awarded
    });

    totals.totalCount += twuResult?.length || 0;
    totals.totalAwarded += twuResult.reduce(
      (acc: number, val: Record<string, number>) => acc + val.maxBudget,
      0
    );

    return valid(totals);
  }
);
