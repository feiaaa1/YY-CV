import { describe, expect, it } from 'vitest';
import {
  ABOUT_PROFILE_SECTIONS,
  buildAboutProfileMarkup,
  getAboutEntranceMotion,
} from '../src/about/aboutProfilePage';

describe('about profile page', () => {
  it('renders all five supplied artwork sections with a clear return action', () => {
    const markup = buildAboutProfileMarkup();

    expect(ABOUT_PROFILE_SECTIONS.map((section) => section.id)).toEqual([
      'portrait',
      'about-skills',
      'origin',
      'personal-tags',
      'contact',
    ]);
    expect(markup.match(/<section/g)).toHaveLength(5);
    expect(markup).toContain('data-about-close');
    expect(markup).toContain('返回作品目录');
  });

  it('keeps contact artwork decorative instead of adding copy, phone, or WeChat actions', () => {
    const markup = buildAboutProfileMarkup();

    expect(markup).not.toContain('tel:');
    expect(markup).not.toContain('clipboard');
    expect(markup).not.toContain('data-copy');
    expect(markup).not.toContain('data-wechat');
  });

  it('disables entrance movement when reduced motion is requested', () => {
    expect(getAboutEntranceMotion(true)).toEqual({ duration: 0, stagger: 0, y: 0 });
    expect(getAboutEntranceMotion(false)).toEqual({ duration: 0.78, stagger: 0.11, y: 48 });
  });
});
