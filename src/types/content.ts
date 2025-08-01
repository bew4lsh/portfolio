// Shared types for content collections and components

export type ProjectData = {
  title: string;
  description: string;
  publishDate: Date;
  tags: string[];
  img: string;
  img_alt?: string;
  featured?: boolean;
  github?: string;
  demo?: string;
  tools?: string[];
};

export type BlogPostData = {
  title: string;
  description: string;
  publishDate: Date;
  updatedDate?: Date;
  tags: string[];
  img?: string;
  img_alt?: string;
  draft?: boolean;
  featured?: boolean;
  category?: string;
};

export type PillSize = 'small' | 'medium';

export type IconName = 
  | 'terminal-window'
  | 'trophy'
  | 'strategy'
  | 'paper-plane-tilt'
  | 'arrow-right'
  | 'arrow-left'
  | 'code'
  | 'microphone-stage'
  | 'pencil-line'
  | 'rocket-launch'
  | 'list'
  | 'heart'
  | 'moon-stars'
  | 'sun'
  | 'twitter-logo'
  | 'codepen-logo'
  | 'github-logo'
  | 'twitch-logo'
  | 'youtube-logo'
  | 'dribbble-logo'
  | 'discord-logo'
  | 'linkedin-logo'
  | 'instagram-logo'
  | 'tiktok-logo'
  | 'external-link';

// Utility type to make specific properties required
export type RequiredFields<T, K extends keyof T> = T & Required<Pick<T, K>>;

// Utility type for safe content rendering
export type SafeContent<T> = {
  [K in keyof T]: T[K] extends string | undefined 
    ? string 
    : T[K] extends Date | undefined 
    ? Date 
    : T[K] extends Array<any> | undefined 
    ? Array<NonNullable<T[K]>[number]>
    : T[K];
};