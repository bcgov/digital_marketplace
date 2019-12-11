import { Route } from 'front-end/lib/app/types';
import { ComponentViewProps, View } from 'front-end/lib/framework';
import Icon from 'front-end/lib/views/icon';
import { AvailableIcons } from 'front-end/lib/views/icon';
import Link from 'front-end/lib/views/link';
import Sticky from 'front-end/lib/views/sidebar/lib/sticky';
import React from 'react';

interface SidebarLinkProps {
  target: string;
  text: string;
  active: boolean;
  icon: AvailableIcons;
  route: Route;
}

const SidebarLink: View<SidebarLinkProps> = props => {
  return (
    <Link button route={props.route} className={`${props.active ? 'btn-secondary' : ''} mb-2 p-2 ta-left`}>
      <Icon name={props.icon}></Icon>
      <span className='pl-2'>{props.text}</span>
    </Link>
  );
};

function makeVerticalBar<State, Msg, Props = ComponentViewProps<State, Msg>>(links: SidebarLinkProps[]): View<Props> {
  return props => {
    return (
      <Sticky>
        {links.map((props, i) => (<SidebarLink {...props} key={`sidebar-link-${i}`} />))}
      </Sticky>
    );
  };
}

export default makeVerticalBar;
