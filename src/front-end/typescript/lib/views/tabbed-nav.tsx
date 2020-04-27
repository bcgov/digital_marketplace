import { View } from 'front-end/lib/framework';
import Badge from 'front-end/lib/views/badge';
import Link from 'front-end/lib/views/link';
import React from 'react';
import { Nav, NavItem } from 'reactstrap';

export interface Tab {
  text: string;
  active?: boolean;
  disabled?: boolean;
  count?: number;
  onClick(): void;
}

export interface Props {
  tabs: Tab[];
  className?: string;
}

const TabbedNav: View<Props> = ({ tabs, className = '' }) => {
  if (!tabs.length) { return null; }
  return (
    <div style={{ overflowX: 'auto' }} className={`d-flex ${className}`}>
      <Nav tabs className='flex-nowrap flex-grow-1'>
        {tabs.map((t, i) => (
          <NavItem key={`tabbed-nav-item-${i}`}>
            <Link
              nav
              onClick={t.onClick}
              disabled={t.disabled}
              focusable={!t.active}
              color={t.active ? 'body' : 'primary'}
              className={`${t.active ? 'active' : ''}`}>
              {t.count
                ? (<span className='small' style={{ marginTop: '-0.1rem', marginRight: '0.35rem' }}><Badge pill color='warning' text={String(t.count)} /></span>)
                : null}
              {t.text}
            </Link>
          </NavItem>
        ))}
      </Nav>
    </div>
  );
};

export default TabbedNav;
