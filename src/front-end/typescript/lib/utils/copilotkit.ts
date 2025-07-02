/**
 * CopilotKit Configuration and Utilities
 * =====================================
 * 
 * This file contains all CopilotKit-related configuration, themes, labels,
 * and utility functions to keep them separate from React components.
 */

// CopilotKit theme configuration matching site's color scheme
export const copilotKitTheme = {
  colors: {
    primary: "#0c99d6", // $blue
    primaryHover: "#08658e", // $link-hover-color  
    secondary: "#6c757d", // $gray-600
    background: "#ffffff", // $white
    foreground: "#212529", // $gray-900 / $body-color
    muted: "#f8f9fa", // $gray-100
    mutedForeground: "#6c757d", // $gray-600
    border: "#ced4da", // $gray-400 / $border-color
    input: "#ffffff", // $white
    accent: "#e9f5fb", // $blue-light-alt
    accentForeground: "#003366", // $blue-dark
    destructive: "#dc3545", // $red
    destructiveForeground: "#ffffff", // $white
    warning: "#fd7e14", // $orange
    success: "#2e8540", // $green
    info: "#0f4c8b", // $blue-dark-alt-2
    sidebar: {
      background: "#ffffff", // $white
      foreground: "#212529", // $gray-900
      border: "#ced4da", // $gray-400
      primary: "#0c99d6", // $blue
      primaryForeground: "#ffffff", // $white
      accent: "#e9f5fb", // $blue-light-alt
      accentForeground: "#003366" // $blue-dark
    }
  },
  fontFamily: '"BCSans", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
  fontSize: {
    xs: "0.75rem",
    sm: "0.875rem", 
    base: "1rem",
    lg: "1.125rem",
    xl: "1.25rem"
  },
  borderRadius: {
    sm: "0.2rem",
    md: "0.3rem", 
    lg: "0.5rem"
  },
  spacing: {
    xs: "0.25rem",
    sm: "0.5rem",
    md: "1rem", 
    lg: "1.5rem",
    xl: "3rem"
  }
};

// Custom labels to replace CopilotKit branding with Marketplace AI
export const copilotKitLabels = {
  title: "Marketplace AI",
  placeholder: "Ask Marketplace AI anything...",
  ariaLabel: "Marketplace AI Chat",
  initial: "Hello! I'm Marketplace AI, your digital procurement assistant. How can I help you today?",
  thinking: "Marketplace AI is thinking...",
  loading: "Loading Marketplace AI...",
  error: "Marketplace AI encountered an error. Please try again.",
  retry: "Retry",
  close: "Close Marketplace AI",
  minimize: "Minimize Marketplace AI",
  expand: "Expand Marketplace AI"
};

// Navigation height constants for positioning calculations
export const NAV_HEIGHTS = {
  TOP_BANNER: 67, // px
  BOTTOM_NAVBAR: 56, // px
  FULL_NAV: 123 // TOP_BANNER + BOTTOM_NAVBAR
} as const;

/**
 * Updates CopilotKit sidebar positioning based on navigation scroll state
 */
export function updateCopilotSidebarPosition(): void {
  const nav = document.querySelector('nav.main-nav') as HTMLElement;
  if (!nav) return;

  const navRect = nav.getBoundingClientRect();
  const isTopBannerVisible = navRect.top >= -NAV_HEIGHTS.TOP_BANNER;
  
  const root = document.documentElement;
  if (isTopBannerVisible) {
    // Full navigation visible
    root.style.setProperty('--copilot-sidebar-top', `${NAV_HEIGHTS.FULL_NAV}px`);
    root.style.setProperty('--copilot-sidebar-height', `calc(100vh - ${NAV_HEIGHTS.FULL_NAV}px)`);
  } else {
    // Only bottom navbar visible
    root.style.setProperty('--copilot-sidebar-top', `${NAV_HEIGHTS.BOTTOM_NAVBAR}px`);
    root.style.setProperty('--copilot-sidebar-height', `calc(100vh - ${NAV_HEIGHTS.BOTTOM_NAVBAR}px)`);
  }
}

/**
 * Replaces CopilotKit branding text with Marketplace AI branding
 */
export function replaceCopilotKitText(): void {
  // Find and replace text content
  const walker = document.createTreeWalker(
    document.body,
    NodeFilter.SHOW_TEXT
  );
  
  let node;
  const textNodes: Node[] = [];
  while ((node = walker.nextNode())) {
    if (node.textContent && node.textContent.includes('CopilotKit')) {
      textNodes.push(node);
    }
  }
  
  textNodes.forEach(node => {
    if (node.textContent) {
      node.textContent = node.textContent.replace(/CopilotKit/g, 'Marketplace AI');
    }
  });
  
  // Replace attribute values
  const elementsWithCopilotKit = document.querySelectorAll('*');
  elementsWithCopilotKit.forEach(element => {
    // Replace title attributes
    if (element.getAttribute('title')?.includes('CopilotKit')) {
      element.setAttribute('title', element.getAttribute('title')!.replace(/CopilotKit/g, 'Marketplace AI'));
    }
    
    // Replace aria-label attributes
    if (element.getAttribute('aria-label')?.includes('CopilotKit')) {
      element.setAttribute('aria-label', element.getAttribute('aria-label')!.replace(/CopilotKit/g, 'Marketplace AI'));
    }
    
    // Replace placeholder attributes
    if (element.getAttribute('placeholder')?.includes('CopilotKit')) {
      element.setAttribute('placeholder', element.getAttribute('placeholder')!.replace(/CopilotKit/g, 'Marketplace AI'));
    }
  });
}

/**
 * Sets up scroll listener for CopilotKit sidebar positioning
 * @returns Cleanup function to remove the event listener
 */
export function setupCopilotSidebarPositioning(): () => void {
  // Update on scroll
  window.addEventListener('scroll', updateCopilotSidebarPosition);
  // Update on initial load
  updateCopilotSidebarPosition();

  return () => {
    window.removeEventListener('scroll', updateCopilotSidebarPosition);
  };
}

/**
 * Sets up text replacement for CopilotKit branding
 * @returns Cleanup function to clear the interval and disconnect observer
 */
export function setupCopilotKitTextReplacement(): () => void {
  // Run immediately
  replaceCopilotKitText();
  
  // Run periodically to catch dynamically added content
  const interval = setInterval(replaceCopilotKitText, 1000);
  
  // Also run on DOM mutations
  const observer = new MutationObserver(replaceCopilotKitText);
  observer.observe(document.body, {
    childList: true,
    subtree: true,
    characterData: true,
    attributes: true,
    attributeFilter: ['title', 'aria-label', 'placeholder']
  });
  
  return () => {
    clearInterval(interval);
    observer.disconnect();
  };
} 