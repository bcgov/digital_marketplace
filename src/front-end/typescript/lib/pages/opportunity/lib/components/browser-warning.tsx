import { component } from "front-end/lib/framework";
import React from "react";

// Browser detection helper functions
export const isSafari = (): boolean => {
  const userAgent = navigator.userAgent.toLowerCase();
  return (
    userAgent.includes("safari") &&
    !userAgent.includes("chrome") &&
    !userAgent.includes("chromium")
  );
};

export const isFirefox = (): boolean => {
  const userAgent = navigator.userAgent.toLowerCase();
  return userAgent.includes("firefox");
};

export const isUnsupportedBrowser = (): boolean => {
  return isSafari() || isFirefox();
};

export interface Props {
  // No props needed for this component
}

const BrowserWarning: component.base.View<Props> = () => {
  const browserName = isSafari()
    ? "Safari"
    : isFirefox()
    ? "Firefox"
    : "this browser";

  return (
    <div className="alert alert-warning alert-dismissible mb-4" role="alert">
      <div className="d-flex">
        <div className="flex-shrink-0 me-3">
          <i className="fas fa-exclamation-triangle"></i>
        </div>
        <div>
          <h5 className="alert-heading mb-2">Browser Compatibility Warning</h5>
          <p className="mb-0">
            You are using <strong>{browserName}</strong>, which may cause text
            boxes to be truncated or display incorrectly on this page. For the
            best experience, please use <strong>Chrome</strong>,{" "}
            <strong>Edge</strong>, or <strong>Opera</strong>.
          </p>
        </div>
      </div>
    </div>
  );
};

export { BrowserWarning };

export default BrowserWarning;
