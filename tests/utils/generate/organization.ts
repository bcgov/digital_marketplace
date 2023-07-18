import {
  OrganizationAdmin,
  OrganizationSlim
} from "shared/lib/resources/organization";
import { faker } from "@faker-js/faker";
import { buildUserSlim } from "./user";
import { getId } from ".";

function buildOrganizationAdmin(
  overrides: Partial<OrganizationAdmin> = {}
): OrganizationAdmin {
  return {
    owner: buildUserSlim(),
    acceptedSWUTerms: null,
    acceptedTWUTerms: null,
    possessAllCapabilities: false,
    possessOneServiceArea: false,
    numTeamMembers: 1,
    serviceAreas: [],
    ...overrides
  };
}

function buildOrganizationSlim(
  overrides: Partial<OrganizationSlim> = {}
): OrganizationSlim {
  return {
    ...buildOrganizationAdmin(),
    id: getId(),
    legalName: faker.company.name(),
    active: true,
    ...overrides
  };
}

export { buildOrganizationAdmin, buildOrganizationSlim };
