import { connectToDatabase } from "back-end/index";
import { findOneUserByTypeAndUsername } from "back-end/lib/db";
import { randomUUID } from "crypto";
import {
  AgentWithCookie,
  cleanupDatabase,
  getGovAgent,
  getVendorAgent
} from "../helpers/user";
import { UserType } from "shared/lib/resources/user";

describe("API", function () {
  describe("/api/files", function () {
    context("As a vendor", function () {
      describe("Create a public file", function () {
        let vendorAgent: AgentWithCookie;
        let fileId: string;
        before(async function () {
          await cleanupDatabase();
          vendorAgent = await getVendorAgent("vendor01");
          const response = await vendorAgent
            .post("/api/files")
            .attach("file", __filename, {
              filename: "MyFile.md",
              contentType: "application/text"
            })
            .field("name", "ferret")
            .field("metadata", JSON.stringify([{ tag: "any" }]))
            .expect(201);
          fileId = response.body.id;
        });

        it("is readable by vendor", async function () {
          await vendorAgent.get(`/api/files/${fileId}`).expect(200);
        });

        it("is readable by another vendor", async function () {
          const vendor2 = await getVendorAgent("vendor02");
          await vendor2.get(`/api/files/${fileId}`).expect(200);
        });
      });

      describe("Create a private file", function () {
        let vendorAgent: AgentWithCookie;
        let fileId: string;
        before(async function () {
          await cleanupDatabase();
          vendorAgent = await getVendorAgent("vendor01");
          const dbConnexion = connectToDatabase("");
          const vendor = await findOneUserByTypeAndUsername(
            dbConnexion,
            UserType.Vendor,
            "vendor01"
          );
          const response = await vendorAgent
            .post("/api/files")
            .attach("file", __filename, {
              filename: "MyFile.md",
              contentType: "application/text"
            })
            .field("name", randomUUID())
            .field(
              "metadata",
              JSON.stringify([{ tag: "user", value: vendor.value?.id }])
            )
            .expect(201);
          fileId = response.body.id;
        });

        it("is readable by the vendor", async function () {
          await vendorAgent.get(`/api/files/${fileId}`).expect(200);
        });

        it("is not readable by another vendor", async function () {
          const vendor2 = await getVendorAgent("vendor02");
          await vendor2.get(`/api/files/${fileId}`).expect(401);
        });
      });
      describe("Create a file for Gov", function () {
        let vendor2: AgentWithCookie;
        let fileId: string;
        before(async function () {
          await cleanupDatabase();
          vendor2 = await getVendorAgent("vendor02");
          const response = await vendor2
            .post("/api/files")
            .attach("file", __filename, {
              filename: "MyFile.md",
              contentType: "application/text"
            })
            .field("name", "forGov")
            .field(
              "metadata",
              JSON.stringify([{ tag: "userType", value: "GOV" }])
            )
            .expect(201);
          fileId = response.body.id;
        });

        it("is readable by the vendor", async function () {
          const vendor2 = await getVendorAgent("vendor02");
          await vendor2.get(`/api/files/${fileId}`).expect(200);
        });

        it("is readable by the gov user", async function () {
          const gov = await getGovAgent("usagop01");
          await gov.get(`/api/files/${fileId}`).expect(200);
        });

        it("is not readable by a another vendor", async function () {
          const vendor1 = await getVendorAgent("vendor01");
          await vendor1.get(`/api/files/${fileId}`).expect(401);
        });
      });
    });
  });
});
