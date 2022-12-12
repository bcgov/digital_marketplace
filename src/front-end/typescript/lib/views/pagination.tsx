import { component } from "front-end/lib/framework";
import React, { Fragment } from "react";
import { Pagination, PaginationItem, PaginationLink } from "reactstrap";

export interface Props {
  page: number;
  numPages: number;
  disabled?: boolean;
  onPageChange(newPage: number): void;
}

const extraPageLinks = 2; // On either side of the active page.

const PaginationView: component.base.View<Props> = ({
  page,
  numPages,
  disabled,
  onPageChange
}) => {
  const onClick = (newPage: number) =>
    disabled ? undefined : () => onPageChange(newPage);
  const pages: component.base.ViewElement[] = [];
  const startingPageLink = Math.max(
    1,
    Math.min(numPages - extraPageLinks * 2, page - extraPageLinks)
  );
  const endingPageLink = Math.min(
    numPages,
    Math.max(1 + extraPageLinks * 2, page + extraPageLinks)
  );
  for (let i = startingPageLink; i <= endingPageLink; i++) {
    const isActive = i === page;
    pages.push(
      <PaginationItem
        onClick={isActive ? undefined : onClick(i)}
        disabled={disabled}
        active={isActive}
        key={`pagination-${i}`}>
        <PaginationLink>{i}</PaginationLink>
      </PaginationItem>
    );
  }
  const isFirst = page === 1;
  const isLast = page === numPages;
  return (
    <Pagination>
      <PaginationItem
        disabled={disabled || isFirst}
        onClick={isFirst ? undefined : onClick(Math.max(1, page - 1))}>
        <PaginationLink previous />
      </PaginationItem>
      <Fragment>{pages}</Fragment>
      <PaginationItem
        disabled={disabled || isLast}
        onClick={isLast ? undefined : onClick(Math.min(numPages, page + 1))}>
        <PaginationLink next />
      </PaginationItem>
    </Pagination>
  );
};

export default PaginationView;
