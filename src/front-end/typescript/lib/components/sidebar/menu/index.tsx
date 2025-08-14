import { Route } from "front-end/lib/app/types";
import { component as component_ } from "front-end/lib/framework";
import Icon, { AvailableIcons } from "front-end/lib/views/icon";
import Link, {
  Dest,
  iconLinkSymbol,
  leftPlacement,
  routeDest
} from "front-end/lib/views/link";
import Sticky from "front-end/lib/views/sidebar/sticky";
import React from "react";
import { ADT, adt } from "shared/lib/types";

export interface SidebarLink {
  text: string;
  icon: AvailableIcons;
  active: boolean;
  dest?: Dest;
  newTab?: boolean;
  disabled?: boolean;
  onClick?(): void;
}

export type SidebarItem = ADT<"link", SidebarLink> | ADT<"heading", string>;

export interface BackLink {
  text: string;
  route: Route;
}

export interface State {
  isOpen: boolean;
  items: SidebarItem[];
  backLink?: BackLink;
}

export type Params = Pick<State, "items" | "backLink">;

export type Msg = ADT<"toggleOpen", boolean | undefined>;

export const init: component_.base.Init<Params, State, Msg> = ({
  backLink,
  items
}) => [
  {
    isOpen: false,
    items,
    backLink
  },
  []
];

export const update: component_.base.Update<State, Msg> = ({ state, msg }) => {
  switch (msg.tag) {
    case "toggleOpen":
      return [
        state.update("isOpen", (v) =>
          msg.value !== undefined ? msg.value : !v
        ),
        []
      ];
  }
};

interface SidebarLinkProps extends SidebarLink {
  className?: string;
  caret?: "up" | "down";
}

const SidebarLink: component_.base.View<SidebarLinkProps> = (props) => {
  const {
    caret,
    disabled,
    className = "",
    dest,
    onClick,
    newTab,
    icon,
    text,
    active
  } = props;
  const symbolColor = (() => {
    if (disabled) {
      return undefined;
    } else if (active) {
      return "c-sidebar-menu-link-active-icon";
    } else {
      return "c-sidebar-menu-link-inactive-icon";
    }
  })();
  return (
    <Link
      button
      dest={dest}
      onClick={onClick}
      disabled={disabled}
      newTab={newTab}
      symbol_={leftPlacement(iconLinkSymbol(icon))}
      symbolClassName={`align-self-start text-${symbolColor}`}
      symbolStyle={{ marginTop: "0.15rem" }}
      color={active ? "c-sidebar-menu-link-active-bg" : "light"}
      className={`${className} text-start text-wrap ${
        active
          ? "text-c-sidebar-menu-link-active-fg"
          : "text-c-sidebar-menu-link-inactive-fg"
      }`}>
      <span className={caret ? "me-2" : undefined}>{text}</span>
      {caret ? (
        <Icon
          name="caret-down"
          color="c-sidebar-menu-mobile-caret"
          className="ms-auto"
          style={{ transform: caret === "up" ? "rotate(180deg)" : undefined }}
        />
      ) : null}
    </Link>
  );
};

const SidebarHeading: component_.base.View<{
  className?: string;
  text: string;
}> = ({ text, className }) => {
  return (
    <div className={`overline mb-3 text-secondary ${className}`}>{text}</div>
  );
};

interface SidebarItemProps {
  isOpen?: boolean;
  item: SidebarItem;
  isFirst: boolean;
}

const SidebarItem: component_.base.View<SidebarItemProps> = ({
  isOpen,
  item,
  isFirst
}) => {
  switch (item.tag) {
    case "link": {
      const caret = (() => {
        switch (isOpen) {
          case true:
            return "up";
          case false:
            return "down";
          default:
            return undefined;
        }
      })();
      return <SidebarLink {...item.value} className="mb-3" caret={caret} />;
    }
    case "heading":
      return (
        <SidebarHeading
          text={item.value}
          className={isFirst ? "mb-3" : "mb-3 mt-n3 pt-5"}
        />
      );
  }
};

const BackLink: component_.base.View<BackLink> = ({ text, route }) => {
  return (
    <Link
      dest={routeDest(route)}
      symbol_={leftPlacement(iconLinkSymbol("arrow-left"))}
      className="mb-4 mb-md-6 font-size-small"
      color="secondary">
      {text}
    </Link>
  );
};

function linksOnly(items: SidebarItem[]): SidebarLink[] {
  return items.reduce((acc, item) => {
    if (item.tag === "link") {
      acc.push(item.value);
    }
    return acc;
  }, [] as SidebarLink[]);
}

const linksByActive = (links: SidebarLink[], activePredicate: boolean) =>
  links.filter((link) => link.active === activePredicate);

export const view: component_.base.ComponentView<State, Msg> = (props) => {
  const { state, dispatch } = props;
  const items = state.items;
  const links = linksOnly(items);
  if (!links.length) {
    return null;
  }
  const [activeLink] = linksByActive(links, true);
  if (!activeLink) {
    return null;
  }
  // Add p*-2 m*-n2 to Sticky to ensure link focus is not clipped.
  return (
    <Sticky className="d-print-none p-2 m-n2">
      {state.backLink ? <BackLink {...state.backLink} /> : null}
      <div className="d-none d-md-flex flex-column flex-nowrap align-items-start">
        {items.map((item, i) => (
          <SidebarItem
            item={item}
            isFirst={i === 0}
            key={`desktop-sidebar-link-${i}`}
          />
        ))}
      </div>
      <div className="d-flex flex-column flex-nowrap align-items-stretch d-md-none position-relative">
        <SidebarLink
          {...activeLink}
          caret={state.isOpen ? "up" : "down"}
          dest={undefined}
          onClick={() => {
            dispatch(adt("toggleOpen"));
          }}
        />
        <div
          className="position-absolute w-100 flex-column flex-nowrap align-items-stretch rounded overflow-hidden border shadow-sm"
          style={{
            display: state.isOpen ? "flex" : "none",
            top: "100%",
            left: 0,
            zIndex: 99
          }}>
          {links.map((link, i) => (
            <SidebarLink
              {...link}
              active={false}
              className="rounded-0"
              key={`mobile-sidebar-link-${i}`}
            />
          ))}
        </div>
      </div>
    </Sticky>
  );
};
