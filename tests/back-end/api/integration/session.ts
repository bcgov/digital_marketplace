import { expect } from "chai";
import {
  AgentWithCookie,
  getAdminAgent,
  getGovAgent,
  getVendorAgent
} from "../helpers/user";

describe("API", function () {
  describe("Login", function () {
    describe("Admin", function () {
      let adminAgent: AgentWithCookie;
      beforeEach(async function () {
        adminAgent = await getAdminAgent();
      });

      it("Logs in admin", async function () {
        await expect(adminAgent).to.exist;
      });
    });
    describe("Gov", function () {
      let govAgent: AgentWithCookie;
      beforeEach(async function () {
        govAgent = await getGovAgent();
      });

      it("Logs in governement's user", async function () {
        await expect(govAgent).to.exist;
      });
    });
    describe("Vendor", function () {
      let vendorAgent: AgentWithCookie;
      beforeEach(async function () {
        vendorAgent = await getVendorAgent("vendor01");
      });

      it("Logs in vendor", async function () {
        await expect(vendorAgent).to.exist;
      });
    });
  });
});
