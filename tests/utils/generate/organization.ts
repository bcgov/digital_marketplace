import {
  Organization,
  OrganizationAdmin,
  OrganizationSlim
} from "shared/lib/resources/organization";
import { fakerEN_CA as faker } from "@faker-js/faker";
import { buildUserSlim } from "./user";
import { getEmail, getFullName, getId, getPhoneNumber } from ".";

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

function buildOrganization({
  createdAt = new Date(),
  ...overrides
}: Partial<Organization> = {}): Organization {
  return {
    ...buildOrganizationAdmin(),
    id: getId(),
    createdAt,
    updatedAt: createdAt,
    legalName: faker.company.name(),
    streetAddress1: faker.location.streetAddress(),
    streetAddress2: faker.location.secondaryAddress(),
    city: faker.location.city(),
    region: faker.location.state(),
    mailCode: faker.location.zipCode(),
    country: "Canada",
    contactName: getFullName(),
    contactEmail: getEmail(),
    contactTitle: faker.person.jobTitle(),
    contactPhone: getPhoneNumber(),
    websiteUrl: faker.internet.url(),
    active: true,
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

export { buildOrganizationAdmin, buildOrganization, buildOrganizationSlim };
