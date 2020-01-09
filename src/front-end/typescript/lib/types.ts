export type BootstrapColor = 'body' | 'primary' | 'secondary' | 'success' | 'danger' | 'warning' | 'info' | 'light' | 'dark' | 'muted' | 'white' | 'info-alt' | 'light-blue' | 'permissions';

export type TextColor = BootstrapColor;

export type AvatarFiletype
  = { file: File; path: string; errors: string[]; }
  | null
  ;

export type ButtonColor
  = Exclude<BootstrapColor, 'body' | 'muted'>
  | 'link';
