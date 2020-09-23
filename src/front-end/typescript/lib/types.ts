// These types should match their configureation in front-end/sass/index.scss.

export type Grays
  = 'gray-100'
  | 'gray-200'
  | 'gray-300'
  | 'gray-400'
  | 'gray-500'
  | 'gray-600'
  | 'gray-700'
  | 'gray-800'
  | 'gray-900';

export type Color
  = 'blue'
  | 'blue-alt'
  | 'blue-alt-2'
  | 'blue-dark'
  //| 'blue-dark-alt'
  | 'blue-light'
  | 'blue-light-alt'
  | 'blue-light-alt-2'
  | 'white'
  | 'purple'
  | 'purple-light'
  | 'yellow'
  | 'orange'
  | 'red'
  | 'green';

export type UtilityColor
  = 'TODO';

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
  | 'bcgov-blue'
  | 'bcgov-yellow'
  | Color
  | UtilityColor
  | Grays;

export type TextColor = ThemeColor;

export type ButtonColor = ThemeColor;

export type AvatarFiletype
  = { file: File; path: string; errors: string[]; }
  | null;
