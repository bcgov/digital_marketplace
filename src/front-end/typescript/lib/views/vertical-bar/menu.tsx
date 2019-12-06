import { ComponentViewProps, View } from 'front-end/lib/framework';
import Icon from 'front-end/lib/views/icon';
import {AvailableIcons} from 'front-end/lib/views/icon';
import Link from 'front-end/lib/views/link';
import React from 'react';

interface SidebarLinkParams {
  target: string;
  text: string;
  active: boolean;
  icon: AvailableIcons;
}

function SidebarLink(params: SidebarLinkParams) {
  return (
    <div>
      <Link button className={`${params.active ? 'btn-secondary' : ''} mb-2 p-2 ta-left`}>
        <Icon name={params.icon}></Icon>
        <span className='pl-2'>{params.text}</span>
      </Link>
    </div>
  );
}

function makeVerticalBar<State, Msg, Props = ComponentViewProps<State, Msg>>(links: SidebarLinkParams[]): View<Props> {
  return props => {
    return (
      <div className=''>
        {
          links.map( linkParams => {
            return( SidebarLink(linkParams) );
          })
        }
      </div>
    );
  };
}

export default makeVerticalBar;
