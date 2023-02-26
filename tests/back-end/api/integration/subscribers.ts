import {
  createCWUOpportunity,
  publishCWUOpportunity
} from "../helpers/opportunity";
import { AgentWithCookie, getVendorAgent } from "../helpers/user";

describe("/api/subscribers/code-with-us", function () {
  let opportunity: any;
  before(async function () {
    opportunity = await createCWUOpportunity();
    opportunity = await publishCWUOpportunity(opportunity);
  });

  context("As a vendor", function () {
    let vendorAgent: AgentWithCookie;
    before(async function () {
      vendorAgent = await getVendorAgent("vendor01");
    });
    describe("[POST] Subscribe", function () {
      it("can subscribe to an opportunity", async function () {
        await vendorAgent
          .post(`/api/subscribers/code-with-us`)
          .send({ opportunity: opportunity.id })
          .expect(201);
      });
    });
  });
});
