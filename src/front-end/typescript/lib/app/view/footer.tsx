import { PROCUREMENT_CONCIERGE_URL, SOURCE_CODE_URL } from "front-end/config";
import { View } from "front-end/lib/framework";
import Link, {
  AnchorProps,
  emailDest,
  externalDest,
  iconLinkSymbol,
  leftPlacement,
  rightPlacement,
  routeDest
} from "front-end/lib/views/link";
import Separator from "front-end/lib/views/separator";
import React from "react";
import { Col, Container, Row } from "reactstrap";
import { CONTACT_EMAIL, COPY } from "shared/config";
import { adt } from "shared/lib/types";

const links: AnchorProps[] = [
  {
    children: "Home",
    dest: routeDest(adt("landing", null))
  },
  {
    children: "About",
    dest: routeDest(adt("contentView", "about"))
  },
  {
    children: "Disclaimer",
    dest: routeDest(adt("contentView", "disclaimer"))
  },
  {
    children: "Privacy",
    dest: routeDest(adt("contentView", "privacy"))
  },
  {
    children: "Accessibility",
    dest: routeDest(adt("contentView", "accessibility"))
  },
  {
    children: "Copyright",
    dest: routeDest(adt("contentView", "copyright"))
  },
  {
    children: "Contact Us",
    dest: emailDest([CONTACT_EMAIL])
  },
  {
    children: "Source Code",
    dest: externalDest(SOURCE_CODE_URL),
    newTab: true,
    symbol_: leftPlacement(iconLinkSymbol("github"))
  },
  {
    children: "Procurement Concierge",
    dest: externalDest(PROCUREMENT_CONCIERGE_URL),
    newTab: true,
    symbol_: rightPlacement(iconLinkSymbol("external-link"))
  }
];

const Footer: View<Record<string, never>> = () => {
  return (
    <footer className="w-100 bg-c-footer-bg text-light d-print-none">
      <Container>
        <Row>
          <Col
            xs="12"
            className="d-flex flex-row flex-wrap align-items-center pt-3">
            {links.map((link, i) => (
              <div key={`footer-link-${i}`} className="mb-3">
                <Link {...link} className="o-75" color="white" button={false} />
                {i < links.length - 1 ? (
                  <Separator spacing="2" color="c-footer-separator">
                    |
                  </Separator>
                ) : null}
              </div>
            ))}
          </Col>
          <Col xs="12" className="small pb-3 o-75 text-white">
            Owned and operated by the {COPY.gov.name.short}.
          </Col>
        </Row>
      </Container>
    </footer>
  );
};

export default Footer;
