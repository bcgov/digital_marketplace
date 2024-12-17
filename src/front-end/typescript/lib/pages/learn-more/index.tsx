import { component } from "front-end/lib/framework";
import Link from "front-end/lib/views/link";
import React from "react";
import { ReactElement } from "react";
import { Alert } from "reactstrap";
import {
  isPublicSectorEmployee,
  User,
  UserType
} from "shared/lib/resources/user";

type CostRecoveryLearnMoreProps = {
  children: ReactElement;
  user?: User;
};

export const CostRecoveryLearnMore: component.base.View<
  CostRecoveryLearnMoreProps,
  ReactElement | null
> = ({ children, user }) => {
  return isPublicSectorEmployee(user ?? { type: UserType.Vendor }) ? (
    <Alert className="mb-0 mt-4 mr-5" color="primary" fade={false}>
      <div style={{ color: "black" }}>{children}</div>
      <Link>
        See Service Level Agreement for more details on Cost Recovery and
        Services provided
      </Link>
    </Alert>
  ) : null;
};
