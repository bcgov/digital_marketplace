import { PageModal, View } from 'front-end/lib/framework';
import { userAvatarPath } from 'front-end/lib/pages/user/lib';
import Badge from 'front-end/lib/views/badge';
import Capabilities from 'front-end/lib/views/capabilities';
import React from 'react';
import { AffiliationMember } from 'shared/lib/resources/affiliation';

interface MakeViewTeamMemberModalParams<Msg> {
  member: AffiliationMember;
  onCloseMsg: Msg;
}

export function makeViewTeamMemberModal<Msg>(params: MakeViewTeamMemberModalParams<Msg>): PageModal<Msg> {
  const { onCloseMsg, member } = params;
  return {
    title: 'View Team Member',
    onCloseMsg,
    body: () => {
      const numCapabilities = member.user.capabilities.length + 1;
      return (
        <div>
          <div className='d-flex flex-nowrap align-items-center mb-4'>
            <img
              className='rounded-circle border'
              style={{
                width: '4rem',
                height: '4rem',
                objectFit: 'cover'
              }}
              src={userAvatarPath(member.user)} />
            <div className='ml-3 d-flex flex-column align-items-start'>
              <strong className='mb-2'>{member.user.name}</strong>
              <span className='font-size-small'>{numCapabilities} Capabilit{numCapabilities === 1 ? 'y' : 'ies'}</span>
            </div>
          </div>
          <div className='border-top border-left'>
            <Capabilities
              capabilities={member.user.capabilities.map(capability => ({
                capability,
                checked: true
              }))} />
          </div>
        </div>
      );
    },
    actions: []
  };
}

export const PendingBadge: View<{ className?: string; }> = ({ className }) => (
  <Badge text='pending' color='yellow' className={className} />
);
