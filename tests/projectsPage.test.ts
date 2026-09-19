import { describe, expect, it } from 'vitest';
import {
  buildProjectsPageMarkup,
  projectCardMotion,
  projectStillScale,
  PROJECT_RETREAT_START,
} from '../src/projects/projectsPage';
import { portfolioContent } from '../src/content/portfolio';
import { projectShowcases } from '../src/content/projectExperience';

const cardHeight = 640;
const dwell = 240;

describe('项目经历页面', () => {
  it('prints one full-screen card per project, alternating sides', () => {
    const markup = buildProjectsPageMarkup(projectShowcases);

    expect(markup.match(/data-project-scene/g)).toHaveLength(7);
    expect(markup.match(/data-project-card\b/g)).toHaveLength(7);
    // Cards 04 and 06 swap the single detail button for one button per link:
    // five WeChat articles and six 视频号 films.
    expect(markup.match(/data-project-action=/g)).toHaveLength(5);
    expect(markup.match(/data-project-source="3"/g)).toHaveLength(5);
    expect(markup.match(/data-project-source="5"/g)).toHaveLength(6);
    expect(markup.match(/data-project-source=/g)).toHaveLength(11);
    // Cards 02, 04 and 06 hug the right edge; the rest hug the left one.
    expect(markup.match(/data-flip="true"/g)).toHaveLength(3);
    expect(markup).toContain('项目经历');
    expect(markup).toContain(projectShowcases[0]!.title.zh);
    expect(markup).toContain(projectShowcases[0]!.aside.zh);
    expect(markup).toContain(projectShowcases[5]!.title.zh);
    expect(markup).toContain(projectShowcases[6]!.title.zh);
    expect(markup).toContain('data-project-video');
    expect(markup).toContain('data-media-scan="true"');
    expect(markup).toContain('data-project-gallery');
    expect(markup).toContain('data-project-slide="2"');
    expect(markup).toContain('data-project-pdf="1"');
    // The Henan TV card is an article index: its slides print the extracted
    // headline and every article keeps its own link button.
    expect(markup).toContain('class="project-card__slide-note"');
    expect(markup).toContain(projectShowcases[3]!.mediaItems![0]!.caption!);
    expect(markup).toContain(projectShowcases[3]!.mediaItems![0]!.meta!);
  });

  it('reads the fifth folder content instead of the old sample projects', () => {
    const category = portfolioContent.categories[4]!;
    const markup = buildProjectsPageMarkup(category.projectShowcases ?? []);

    expect(category.presentation).toBe('projects');
    expect(category.title.zh).toBe('项目经历');
    expect(category.projects).toHaveLength(0);
    expect(markup.match(/data-project-scene/g)).toHaveLength(7);
  });

  it('lifts the numbered tabs to the top when the stills carry their own captions', () => {
    const card = projectShowcases[6]!;
    const markup = buildProjectsPageMarkup([card]);

    expect(card.mediaTabsPosition).toBe('top');
    expect(markup).toContain('data-tabs-position="top"');
    expect(markup.match(/data-project-slide=/g)).toHaveLength(9);
    // Each numbered tab still names the contest it opens, and each picture can
    // be opened on its own.
    for (const entry of card.mediaItems!) {
      expect(markup).toContain(`>${entry.label}</span>`);
      expect(markup).toContain(`aria-label="放大查看：${entry.alt}"`);
    }
    expect(markup).toContain('data-project-preview="0"');
  });

  it('opens the current still from a gallery that has no film to play', () => {
    const card = projectShowcases[4]!;
    const slides = card.mediaItems!;
    const markup = buildProjectsPageMarkup([card]);

    expect(card.mediaKind).toBe('gallery');
    expect(slides).toHaveLength(8);
    expect(markup.match(/data-project-slide=/g)).toHaveLength(slides.length);
    // The aside button walks the stills instead of claiming a video player.
    expect(markup).toContain('data-project-preview="0"');
    expect(markup).not.toContain('data-project-video-toggle');
    for (const slide of slides) {
      expect(markup).toContain(`>${slide.label}</span>`);
      expect(markup).toContain(slide.badge!);
    }
  });

  it('lets every still open the viewer from the picture itself or its own button', () => {
    const card = projectShowcases[4]!;
    const stills = card.mediaItems!;
    const markup = buildProjectsPageMarkup([card]);

    expect(markup).toContain('data-project-lightbox');
    expect(markup).toContain('data-project-lightbox-image');
    // One zoom button around the picture plus one quick button in the aside.
    expect(markup.match(/data-project-still=/g)).toHaveLength(stills.length);
    expect(markup.match(/data-project-zoom="0"/g)).toHaveLength(stills.length);
    for (const still of stills) {
      expect(markup).toContain(`aria-label="放大查看：${still.alt}"`);
    }
    expect(markup).toContain('data-project-zoom-slide="7"');
  });

  it('blows a small clip up to the window instead of printing it at its own size', () => {
    // A 240×135 clip fills a 1440×1000 window at the five-fold cap.
    const clipScale = projectStillScale(240, 135, 1440, 1000);
    expect(clipScale).toBe(5);
    expect(Math.round(240 * clipScale)).toBe(1200);

    // A large still is only ever scaled down to fit the window.
    const photoScale = projectStillScale(2276, 1280, 1440, 1000);
    expect(photoScale).toBeLessThan(1);
    expect(Math.round(2276 * photoScale)).toBeLessThanOrEqual(Math.round(1440 * 0.92));

    // A phone keeps the clip inside its own width.
    expect(Math.round(240 * projectStillScale(240, 135, 390, 844))).toBeLessThanOrEqual(359);

    // A picture that has not loaded yet never divides by zero.
    expect(projectStillScale(0, 0, 1440, 1000)).toBe(1);
  });

  it('holds every card at full size until the next screen is about to take over', () => {
    expect(projectCardMotion({ offset: 0, cardHeight, dwell }))
      .toEqual({ y: 0, scale: 1, opacity: 1, retreat: 0, rise: 1 });

    // Most of the card's screen is spent at rest: no lift, no fade yet.
    const holding = projectCardMotion({ offset: dwell * 0.5, cardHeight, dwell });
    expect(holding).toEqual({ y: 0, scale: 1, opacity: 1, retreat: 0, rise: 1 });
    const stillHolding = projectCardMotion({
      offset: dwell * (PROJECT_RETREAT_START - 0.02),
      cardHeight,
      dwell,
    });
    expect(stillHolding).toEqual({ y: 0, scale: 1, opacity: 1, retreat: 0, rise: 1 });

    // The hand-over: lifted, smaller and faded as the next card arrives.
    const leaving = projectCardMotion({ offset: dwell, cardHeight, dwell });
    expect(leaving.y).toBeLessThan(-60);
    expect(leaving.scale).toBeLessThan(0.93);
    expect(leaving.opacity).toBeLessThan(0.4);
    expect(leaving.retreat).toBe(1);
  });

  it('brings the next card in large and lets it settle back, and never retires the last one', () => {
    const arriving = projectCardMotion({ offset: -cardHeight, cardHeight, dwell });
    expect(arriving.rise).toBe(0);
    expect(arriving.retreat).toBe(0);
    expect(arriving.opacity).toBeLessThan(0.7);
    // The incoming card arrives from the front, so it starts bigger than its
    // resting size instead of growing into it from below.
    expect(arriving.scale).toBeGreaterThan(1);

    // It then eases back down to exactly 1, never overshooting underneath it.
    const halfway = projectCardMotion({ offset: -cardHeight * 0.4, cardHeight, dwell });
    expect(halfway.scale).toBeLessThan(arriving.scale);
    expect(halfway.scale).toBeGreaterThan(1);
    expect(projectCardMotion({ offset: 0, cardHeight, dwell }).scale).toBe(1);

    // The card that hands over is the one that recedes smaller.
    const leaving = projectCardMotion({ offset: dwell, cardHeight, dwell });
    expect(leaving.scale).toBeLessThan(0.9);

    // The last screen has nothing to hand over to, so it stays untouched.
    const last = projectCardMotion({ offset: 400, cardHeight, dwell: 0 });
    expect(last).toEqual({ y: 0, scale: 1, opacity: 1, retreat: 0, rise: 1 });
  });
});
