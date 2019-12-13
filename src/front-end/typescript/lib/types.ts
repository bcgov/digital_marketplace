export type BootstrapColor = 'body' | 'primary' | 'secondary' | 'success' | 'danger' | 'warning' | 'info' | 'light' | 'dark' | 'muted' | 'white' | 'info-alt' | 'light-blue';

export type TextColor = BootstrapColor;

export type ButtonColor
  = Exclude<BootstrapColor, 'body' | 'muted'>
  | 'link';
