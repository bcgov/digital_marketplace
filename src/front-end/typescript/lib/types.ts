// These types should match their configureation in front-end/sass/index.scss.

export type Color
  = 'blue'
  | 'blue-alt'
  | 'blue-dark'
  | 'blue-dark-alt'
  | 'blue-dark-alt-2'
  | 'blue-light'
  | 'white'
  | 'purple'
  | 'purple-light'
  | 'yellow'
  | 'orange'
  | 'red'
  | 'green';

export type ThemeColor
  = 'primary'
  | 'secondary'
  | 'info'
  | 'warning'
  | 'danger'
  | 'success'
  | 'body'
  | 'light'
  | 'dark'
  | Color;

export type TextColor = ThemeColor;

export type ButtonColor = ThemeColor;

export type AvatarFiletype
  = { file: File; path: string; errors: string[]; }
  | null;
