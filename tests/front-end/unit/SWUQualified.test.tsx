import { doesOrganizationMeetSWUQualification } from "shared/lib/resources/organization";

describe("Determine if organizations are SWU qualified", () => {
  it("returns true if organization is SWU qualified (accepted terms, >2 team members, possesses all capabilities)", () => {
    const testOrganization = {
      id: "5d37727a-ccbf-419b-aabf-4769afe0ab8e",
      legalName: "Test Org",
      owner: {
        id: "00af658f-36f1-4737-ac3d-f9d192500e97",
        name: "Org Ownder",
        avatarImageFile: null,
      },
      acceptedSWUTerms: "2021-11-29T17:51:08.939Z",
      possessAllCapabilities: true,
      active: true,
      numTeamMembers: 2,
    };
    const expected = true;
    const result = doesOrganizationMeetSWUQualification(testOrganization);
    expect(result).toBe(expected);
  });

  it("returns false if organization is not SWU qualified (didn't accept terms)", () => {
    const testOrganization = {
      id: "c25e6999-aa1f-40c3-bcce-576c0ee860c3",
      legalName: "Test Org",
      owner: {
        id: "00af658f-36f1-4737-ac3d-f9d192500e97",
        name: "Org Owner",
        avatarImageFile: null,
      },
      acceptedSWUTerms: null,
      possessAllCapabilities: false,
      active: true,
      numTeamMembers: 3,
    };
    const expected = false;
    const result = doesOrganizationMeetSWUQualification(testOrganization);
    expect(result).toBe(expected);
  });

  it("returns false if organization is not SWU qualified (fewer than 2 members)", () => {
    const testOrganization = {
      id: "edd19de6-3747-4151-ac6c-dfc0adcb7ee5",
      legalName: "Test Org",
      owner: {
        id: "00af658f-36f1-4737-ac3d-f9d192500e97",
        name: "Org Owner",
        avatarImageFile: null,
      },
      acceptedSWUTerms: "2021-11-27T00:20:09.082Z",
      possessAllCapabilities: true,
      active: true,
      numTeamMembers: 1,
    };
    const expected = false;
    const result = doesOrganizationMeetSWUQualification(testOrganization);
    expect(result).toBe(expected);
  });

  it("returns false if organization is not SWU qualified (does not possess all qualifications)", () => {
    const testOrganization = {
      id: "a76d06a6-6cfa-456a-9cf9-d7a4db620a83",
      legalName: "Test Org",
      owner: {
        id: "00af658f-36f1-4737-ac3d-f9d192500e97",
        name: "Org Owner",
        avatarImageFile: null,
      },
      acceptedSWUTerms: null,
      possessAllCapabilities: false,
      active: true,
      numTeamMembers: 5,
    };
    const expected = false;
    const result = doesOrganizationMeetSWUQualification(testOrganization);
    expect(result).toBe(expected);
  });
});
