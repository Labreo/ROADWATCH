export type FontSizeLevel = 'small' | 'default' | 'large';
export type ContrastMode = 'normal' | 'high';
export type Locale = string;
export type UserRole = 'citizen' | 'admin';

export interface A11yState {
  contrastMode: ContrastMode;
  fontSize: FontSizeLevel;
  locale: Locale;
  reducedMotion: boolean;
  userRole: UserRole;
}