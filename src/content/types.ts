export type LocalizedText = {
  zh: string;
  en: string;
};

export type DetailPresentation = 'about' | 'scrapbook' | 'journey' | 'book' | 'ticket' | 'accordion' | 'projects';

export type Project = {
  id: string;
  title: LocalizedText;
  year: string;
  summary: LocalizedText;
  tags: string[];
  accent: string;
};

export type ScrapbookPage = {
  education?: import('../education/layout').EducationSpread;
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

/**
 * One screen of the fifth folder's scroll deck. The card prints the picture,
 * the story and the tags; the aside lives in the blank space beside the card
 * and holds the invitation to look closer.
 */
export type ProjectShowcaseMediaItem = {
  kind: 'image' | 'video';
  src: string;
  poster?: string;
  alt: string;
  /** `object-position` for the preview so a tall screenshot keeps its top. */
  position?: string;
  /** How the preview should behave inside the shared 16:9 media frame. */
  fit?: 'cover' | 'contain' | 'scan';
  /** Short label used by the gallery tabs and media badge. */
  label: string;
  /** Longer caption printed over the media frame. */
  badge?: string;
  /** Button label while this slide is active. */
  action: string;
  /**
   * Original article this slide reprints. A gallery whose slides carry an
   * `href` is an article index: the aside button opens the active slide's
   * source in a new tab instead of the shared video player.
   */
  href?: string;
  /** Headline reprinted over the slide while it is the active one. */
  caption?: string;
  /** Account, date and any other line printed under the headline. */
  meta?: string;
  /** Opening lines of the article, printed under the headline. */
  excerpt?: string;
};

export type ProjectShowcase = {
  id: string;
  /** Printed number, e.g. "01". */
  code: string;
  title: LocalizedText;
  /** Short label above the title, e.g. "品类运营 · 内容增长". */
  kicker: LocalizedText;
  summary: LocalizedText;
  /** Faint caption printed along the bottom edge of the card. */
  note: LocalizedText;
  /** Copy printed in the blank area beside the card. */
  aside: LocalizedText;
  /** Label of the aside button, which opens the detail popup. */
  action: string;
  year: string;
  tags: string[];
  /** Card fill, blended from `accent` to `accentTo`. */
  accent: string;
  accentTo: string;
  /** The card can print one still, one video, or a multi-slide gallery. */
  mediaKind?: 'image' | 'video' | 'gallery';
  media: string;
  mediaAlt: string;
  /** `object-position` for the preview so a tall screenshot keeps its top. */
  mediaPosition: string;
  /**
   * How the preview should behave inside the shared 16:9 media frame.
   * `scan` slowly moves a tall overview image while the card is active.
   */
  mediaFit?: 'cover' | 'contain' | 'scan';
  /** Small label printed over the media frame. */
  mediaBadge?: string;
  /**
   * Where a gallery prints its numbered tabs. Stills that carry their own
   * captions along the bottom edge put the tabs on top instead.
   */
  mediaTabsPosition?: 'top' | 'bottom';
  /** MP4 source used when `mediaKind` is `video`. */
  video?: string;
  /** First card's three supplied pieces: hero, long board and film. */
  mediaItems?: ProjectShowcaseMediaItem[];
  /**
   * A card that collects several sources prints one button per link beside the
   * card, so any of them can be opened without stepping through the slides.
   */
  sourceList?: boolean;
  /** Opens the source document directly from the card's detail button. */
  detailPdf?: string;
  /**
   * Extra reading that belongs to the card but is not one of its pictures:
   * every entry prints its own button beside the card and opens in a new tab.
   */
  links?: ProjectShowcaseLink[];
};

export type ProjectShowcaseLink = {
  /** Short label printed on the button, e.g. "NeurIPS 论文". */
  label: string;
  href: string;
  /** Full headline, used for the tooltip and the button's accessible name. */
  headline?: string;
  /** Small second line inside the button; defaults to 「阅读原文」. */
  action?: string;
};

export type SkillSection = {
  label: LocalizedText;
  text: LocalizedText;
};

export type SkillBullets = {
  label: LocalizedText;
  items: LocalizedText[];
};

export type SkillImage = {
  src: string;
  /** Higher-resolution copy of the same picture, fetched only when zoomed. */
  full?: string;
  /** Natural width / height, used to print the tile at the image's own shape. */
  aspect?: number;
  caption?: LocalizedText;
};

export type SkillImageGroup = {
  label: LocalizedText;
  images: SkillImage[];
};

/**
 * One panel of the skills accordion. The collapsed strip shows the cover
 * artwork and the code; hovering widens the panel to reveal every section, the
 * bullet list and the screenshot groups.
 */
export type SkillPanel = {
  id: string;
  /** Printed number, e.g. "01". */
  code: string;
  /** Latin label that stays readable on a collapsed strip. */
  shortTitle: string;
  title: LocalizedText;
  tagline: LocalizedText;
  accent: string;
  cover: string;
  sections: SkillSection[];
  bullets?: SkillBullets;
  imageGroups: SkillImageGroup[];
};

export type Category = {
  id: string;
  title: LocalizedText;
  description: LocalizedText;
  shortTitle: string;
  color: string;
  secondaryColor: string;
  presentation: DetailPresentation;
  initialProjectIndex?: number;
  projects: Project[];
  scrapbookPages?: ScrapbookPage[];
  journeyExperiences?: JourneyExperience[];
  skillPanels?: SkillPanel[];
  projectShowcases?: ProjectShowcase[];
};

export type PortfolioContent = {
  title: LocalizedText;
  owner: LocalizedText;
  contact: string;
  contactEmail: string;
  categories: Category[];
};
