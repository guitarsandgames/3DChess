export interface SiteConfig {
  name: string;
  shortName: string;
  description: string;
  version: string;
  author: {
    name: string;
    email?: string;
  };
  deployment: {
    platform: 'github-pages' | 'custom';
    base: string;
  };
  features: {
    threeD: boolean;
    aiEngine: boolean;
    passAndPlay: boolean;
    soundFx: boolean;
    clockTimer: boolean;
  };
}

export const siteConfig: SiteConfig = {
  name: '3D Chess',
  shortName: 'Chess3D',
  description:
    'An interactive 3D chess game with customizable board views, smooth piece animations, valid move indicators, and AI or pass-and-play modes.',
  version: '1.0.0',
  author: {
    name: 'Lydia Goyal',
    email: 'Lydia.Goyal@gmail.com',
  },
  deployment: {
    platform: 'github-pages',
    base: './',
  },
  features: {
    threeD: true,
    aiEngine: true,
    passAndPlay: true,
    soundFx: true,
    clockTimer: true,
  },
};

export default siteConfig;
