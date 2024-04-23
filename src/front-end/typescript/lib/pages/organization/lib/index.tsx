import { AffiliationEvent } from "shared/lib/resources/affiliation";
import { OrganizationHistoryRecord } from "shared/lib/resources/organization";

export function OrganizationHistoryTypeToTitleCase(
  t: OrganizationHistoryRecord["type"]
): string {
  switch (t) {
    case AffiliationEvent.AdminStatusGranted:
      return "Admin Rights Given";
    case AffiliationEvent.AdminStatusRevoked:
      return "Admin Rights Removed";
    case AffiliationEvent.OwnerStatusGranted:
      return "Owner Rights Given";
    case AffiliationEvent.OwnerStatusRevoked:
      return "Owner Rights Removed";
    default:
      // Remove default case after fully enumerating organization events
      return "";
  }
}
