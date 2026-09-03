export type LocalizedText = {
  zh: string;
  en: string;
};

export type DetailPresentation = 'about' | 'scrapbook' | 'journey' | 'book' | 'ticket';

export type Project = {
  id: string;
  title: LocalizedText;
  year: string;
  summary: LocalizedText;
  tags: string[];
  accent: string;
};

export type ScrapbookPage = {
  id: string;
  title: LocalizedText;
  subtitle: LocalizedText;
  kicker: string;
  palette: [string, string, string];
  motif: 'intro' | 'mobile' | 'editorial' | 'process' | 'contact';
  leftContent?: {
    mainText?: string;
    bullets?: string[];
    photo?: { label: string; subtitle: string };
    note?: { title: string; subtitle: string };
  };
  rightContent?: {
    noteTitle?: string;
    bullets?: string[];
    decorativeText?: string[];
    photo?: { label: string; subtitle: string };
    sticker?: { title: string; subtitle: string };
  };
};

export type JourneyExperience = {
  id: string;
  company: LocalizedText;
  role: LocalizedText;
  period: string;
  location: LocalizedText;
  summary: LocalizedText;
  icon: 'badge' | 'studio' | 'office' | 'growth';
  accent: string;
};

export type Category = {
  id: string;
  title: LocalizedText;
  description: LocalizedText;
  shortTitle: string;
  color: string;
  secondaryColor: string;
  presentation: DetailPresentation;
  projects: Project[];
  scrapbookPages?: ScrapbookPage[];
  journeyExperiences?: JourneyExperience[];
};

export type PortfolioContent = {
  title: LocalizedText;
  owner: LocalizedText;
  role: LocalizedText;
  contact: string;
  categories: Category[];
};
