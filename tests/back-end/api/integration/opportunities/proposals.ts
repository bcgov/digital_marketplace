import { expect } from "chai";
import {
  createCWUOpportunity,
  makeOpportunityEvaluatable,
  publishCWUOpportunity,
  submitProposal,
  validCwuOpportunity,
  validCwuProposal
} from "../../helpers/opportunity";
import {
  acceptTerms,
  AgentWithCookie,
  cleanupDatabase,
  getGovAgent,
  getVendorAgent
} from "../../helpers/user";

describe("/api/proposals/code-with-us", function () {
  let govAgent: AgentWithCookie;
  let proposal: any;
  let vendor2proposal: any;
  let opportunity: any;

  let vendorAgent: AgentWithCookie;
  let vendor2Agent: AgentWithCookie;

  context("As a vendor", function () {
    before(async function () {
      await cleanupDatabase();
      govAgent = await getGovAgent("usagop01");
      opportunity = await createCWUOpportunity();
      opportunity = await publishCWUOpportunity(opportunity);
      vendorAgent = await getVendorAgent("vendor01");
      vendor2Agent = await getVendorAgent("vendor02");
    });

    describe("[GET] Read", function () {
      it("can get my proposal", async function () {
        const response = await vendorAgent.get(
          `/api/proposals/code-with-us/?opportunity=${opportunity.id}`
        );
        expect(response.statusCode).to.eql(200);
        expect(response.body).to.have.length(0);
      });
    });
    describe("[POST] Create", function () {
      it("can't make a proposal if terms are not accepted", async function () {
        const response = await vendorAgent
          .post(`/api/proposals/code-with-us`)
          .send({
            ...validCwuProposal,
            opportunity: opportunity.id
          });
        expect(response.statusCode).to.eql(401);
      });
      it("make a proposal draft if terms are accepted", async function () {
        await acceptTerms("vendor01", vendorAgent);
        const response = await vendorAgent
          .post(`/api/proposals/code-with-us`)
          .send({
            ...validCwuProposal,
            opportunity: opportunity.id
          });
        proposal = response.body;
        expect(response.statusCode).to.eql(201);
      });
      it("can't make two proposals for the same opportunity", async function () {
        await vendorAgent
          .post(`/api/proposals/code-with-us`)
          .send({
            ...validCwuProposal,
            opportunity: opportunity.id
          })
          .expect(409);
      });
    });
    describe("[PUT] Update", function () {
      before(async function () {
        if (!proposal) {
          // Apply if previous section is not ran
          await acceptTerms("vendor01", vendorAgent);
          const response = await vendorAgent
            .post(`/api/proposals/code-with-us`)
            .send({
              ...validCwuProposal,
              opportunity: opportunity.id
            });
          proposal = response.body;
        }
      });
      it("edit a proposal draft", async function () {
        const newProposalText = Math.random().toString();
        const response = await vendorAgent
          .put(`/api/proposals/code-with-us/${proposal.id}`)
          .send({
            tag: "edit",
            value: {
              ...validCwuProposal,
              proposalText: newProposalText
            }
          })
          .expect(200);
        expect(response.body.proposalText).to.eql(newProposalText);
      });
      it("submit a proposal", async function () {
        // Create a draft
        await acceptTerms("vendor02", vendor2Agent);
        let response = await vendor2Agent
          .post(`/api/proposals/code-with-us`)
          .send({
            ...validCwuProposal,
            opportunity: opportunity.id
          })
          .expect(201);
        vendor2proposal = response.body;
        // Publish it
        response = await vendor2Agent
          .put(`/api/proposals/code-with-us/${vendor2proposal.id}`)
          .send({
            tag: "submit",
            value: "NoOp"
          })
          .expect(200);
      });
      it("withdraw a published proposal", async function () {
        await vendor2Agent
          .put(`/api/proposals/code-with-us/${vendor2proposal.id}`)
          .send({
            tag: "withdraw",
            value: "NoOp"
          })
          .expect(200);
      });
      it("can't withdraw a proposal draft", async function () {
        await vendorAgent
          .put(`/api/proposals/code-with-us/${proposal.id}`)
          .send({
            tag: "withdraw",
            value: "NoOp"
          })
          .expect(401);
      });
    });
    describe("[DELETE] Delete", function () {
      it("can't delete a published proposal", async function () {
        const response = await vendor2Agent.delete(
          `/api/proposals/code-with-us/${vendor2proposal.id}`
        );
        expect(response.statusCode).to.eql(401);
      });
      it("delete a proposal draft", async function () {
        const response = await vendorAgent.delete(
          `/api/proposals/code-with-us/${proposal.id}`
        );
        expect(response.statusCode).to.eql(200);
      });
    });
  });
  context("As a governement user", function () {
    beforeEach(async function () {
      await cleanupDatabase();
      govAgent = await getGovAgent("usagop01");

      // Opportunity
      opportunity = await createCWUOpportunity({
        ...validCwuOpportunity,
        assignmentDate: new Date()
      });
      opportunity = await publishCWUOpportunity(opportunity);

      // Agents
      vendorAgent = await getVendorAgent("vendor01");
      await acceptTerms("vendor01", vendorAgent);
      vendor2Agent = await getVendorAgent("vendor02");
      await acceptTerms("vendor02", vendor2Agent);

      // Proposals
      proposal = await submitProposal(vendorAgent, opportunity);
      vendor2proposal = await submitProposal(vendor2Agent, opportunity);
    });
    describe("[GET] Read", function () {
      it("can't get proposals of open opportunity", async function () {
        const response = await govAgent.get(
          `/api/proposals/code-with-us/?opportunity=${opportunity.id}`
        );
        expect(response.statusCode).to.eql(401);
      });
      it("can get all proposals of evaluatable opportunity", async function () {
        await makeOpportunityEvaluatable(opportunity);
        const response = await govAgent.get(
          `/api/proposals/code-with-us/?opportunity=${opportunity.id}`
        );
        expect(response.statusCode).to.eql(200);
        expect(response.body).to.have.length(2);
      });
    });
    describe("[PUT] Score / Award a proposal", function () {
      context("When opportunity is running", function () {
        it("can't score a proposal", async function () {
          const response = await govAgent
            .put(`/api/proposals/code-with-us/${proposal.id}`)
            .send({
              tag: "score",
              value: 88
            });
          expect(response.statusCode).to.eql(401);
        });
      });
      context("When opportunity is awardable", function () {
        beforeEach(function () {
          return makeOpportunityEvaluatable(opportunity);
        });
        it("can score a proposal of evaluatable opportunity", async function () {
          await govAgent
            .put(`/api/proposals/code-with-us/${proposal.id}`)
            .send({
              tag: "score",
              value: parseInt((Math.random() * 1000).toString()) / 100.0
            })
            .expect(200);
        });

        it("can award a scored proposal (even if all proposals are not scored ?!)", async function () {
          await govAgent
            .put(`/api/proposals/code-with-us/${proposal.id}`)
            .send({
              tag: "score",
              value: 88
            });
          await govAgent
            .put(`/api/proposals/code-with-us/${proposal.id}`)
            .send({
              tag: "award",
              value: "Awarded"
            })
            .expect(200);
        });

        it("can disqualify a proposal", async function () {
          await govAgent
            .put(`/api/proposals/code-with-us/${proposal.id}`)
            .send({
              tag: "disqualify",
              value: "Disqualified for self-identification."
            })
            .expect(200);
        });

        it("can't award a not-scored proposal", async function () {
          await govAgent
            .put(`/api/proposals/code-with-us/${proposal.id}`)
            .send({
              tag: "award",
              value: "Awarded"
            })
            .expect(401);
        });

        context("When no proposal is awarded", function () {
          it("can cancel the opportunity", async function () {
            const response = await govAgent
              .put(`/api/opportunities/code-with-us/${opportunity.id}`)
              .send({
                tag: "cancel",
                value: "Opportunity cancelled."
              });
            expect(response.statusCode).to.eql(200);
            //.expect(200);
          });

          // Maybe that's what we want ...
          //
          // it("can award two proposals when done simultanously", async () => {
          //   await Promise.all([proposal, vendor2proposal].map(prop => (
          //     govAgent
          //     .put(`/api/proposals/code-with-us/${prop.id}`)
          //     .send({
          //       tag: "score",
          //       value: 88,
          //     })
          //     .expect(200)
          //   )))
          //   await Promise.all([proposal, vendor2proposal].map(prop => (
          //     govAgent
          //     .put(`/api/proposals/code-with-us/${prop.id}`)
          //     .send({
          //       tag: "award",
          //       value: "Awarded",
          //     })
          //     .expect(200)
          //   )))
          // });
        });

        context("When a proposal is awarded", function () {
          beforeEach(async function () {
            await govAgent
              .put(`/api/proposals/code-with-us/${proposal.id}`)
              .send({
                tag: "score",
                value: 88
              })
              .expect(200);
            await govAgent
              .put(`/api/proposals/code-with-us/${vendor2proposal.id}`)
              .send({
                tag: "score",
                value: 88
              })
              .expect(200);
            await govAgent
              .put(`/api/proposals/code-with-us/${proposal.id}`)
              .send({
                tag: "award",
                value: "Awarded"
              })
              .expect(200);
          });

          it("can award two proposals (??)", async function () {
            await govAgent
              .put(`/api/proposals/code-with-us/${vendor2proposal.id}`)
              .send({
                tag: "award",
                value: "Awarded"
              })
              .expect(200);
          });

          it("can't cancel the opportunity", async function () {
            await govAgent
              .put(`/api/opportunities/code-with-us/${opportunity.id}`)
              .send({
                tag: "cancel",
                value: "Opportunity cancelled."
              })
              .expect(401);
          });
        });
      });
    });
  });
});
