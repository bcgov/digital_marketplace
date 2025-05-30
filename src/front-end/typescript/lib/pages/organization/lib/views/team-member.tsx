import { component } from "front-end/lib/framework";
import { userAvatarPath } from "front-end/lib/pages/user/lib";
import Badge from "front-end/lib/views/badge";
import Capabilities from "front-end/lib/views/capabilities";
import React from "react";
import { AffiliationMember } from "shared/lib/resources/affiliation";

interface MakeViewTeamMemberModalParams<Msg> {
  member: AffiliationMember;
  onCloseMsg: Msg;
}

export function makeViewTeamMemberModal<Msg>(
  params: MakeViewTeamMemberModalParams<Msg>
): component.page.Modal<Msg> {
  const { onCloseMsg, member } = params;
  return component.page.modal.show({
    title: "View Team Member",
    onCloseMsg,
    body: () => {
      const numCapabilities = member.user.capabilities.length;
      return (
        <div>
          <div className="d-flex flex-nowrap align-items-center">
            <img
              className="rounded-circle border"
              style={{
                width: "4rem",
                height: "4rem",
                objectFit: "cover"
              }}
              src={userAvatarPath(member.user)}
            />
            <div className="ms-3 d-flex flex-column align-items-start">
              <strong className="mb-1">{member.user.name}</strong>
              <span className="font-size-small">
                {numCapabilities} Capabilit{numCapabilities === 1 ? "y" : "ies"}
              </span>
            </div>
          </div>
          {numCapabilities ? (
            <Capabilities
              className="mt-4"
              capabilities={member.user.capabilities.map((capability) => ({
                capability,
                checked: true
              }))}
            />
          ) : null}
        </div>
      );
    },
    actions: []
  });
}

export const PendingBadge: component.base.View<{ className?: string }> = ({
  className
}) => <Badge text="Pending" color="warning" className={className} />;

export const OwnerBadge: component.base.View<{ className?: string }> = ({
  className
}) => <Badge text="Owner" color="success" className={className} />;
