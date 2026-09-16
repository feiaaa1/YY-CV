import { gsap } from 'gsap';
import { preloadImageAssets, type ImageLoadProgress } from '../performance/imageAssets';

export const ABOUT_PROFILE_SECTIONS = [
  { id: 'portrait', label: '个人照片' },
  { id: 'about-skills', label: '关于我与技能' },
  { id: 'origin', label: '来自哪里' },
  { id: 'personal-tags', label: '个人标签' },
  { id: 'contact', label: '联系信息' },
] as const;

const assetRoot = '/assets/profile2';

const skills = [
  ['PS', 'skill-ps.webp'],
  ['PR', 'skill-pr.webp'],
  ['CapCut', 'skill-capcut.webp'],
  ['SQL', 'skill-sql.webp'],
  ['Office', 'skill-office.webp'],
  ['SPSS', 'skill-spss.webp'],
  ['Figma', 'skill-figma.webp'],
  ['Codex', 'skill-codex.webp'],
  ['秀米', 'skill-xiumi.webp'],
] as const;

const personalTags = [
  ['胡辣汤忠实粉丝', 'tag-hula-soup.webp'],
  ['面条大王', 'tag-noodle-master.webp'],
  ['ESTJ', 'tag-estj.webp'],
  ['超级大E人', 'tag-super-e.webp'],
  ['调解大师', 'tag-mediator.webp'],
  ['王者最强王者20星', 'tag-king-20.webp'],
  ['乒乓球达人', 'tag-pingpong.webp'],
] as const;

export const aboutProfileAssetUrls = [
  `${assetRoot}/01-top-left/photo-card-full.webp`,
  `${assetRoot}/02-top-right/about-skills-bg.webp`,
  `${assetRoot}/03-bottom-left/from-card-bg.webp`,
  `${assetRoot}/03-bottom-left/henan-badge-new.webp`,
  `${assetRoot}/03-bottom-left/bsu-badge-new.webp`,
  `${assetRoot}/04-bottom-center/tags-card-bg.webp`,
  `${assetRoot}/05-bottom-right/contact-card-full.webp`,
  ...skills.map(([, filename]) => `${assetRoot}/02-top-right/${filename}`),
  ...personalTags.map(([, filename]) => `${assetRoot}/04-bottom-center/${filename}`),
] as const;

export function preloadAboutProfileAssets(
  onProgress?: (progress: ImageLoadProgress) => void,
): Promise<string[]> {
  return preloadImageAssets(aboutProfileAssetUrls, onProgress, 'high');
}

const image = (src: string, alt: string, className: string, eager = false): string => (
  `<img src="${src}" alt="${alt}" class="${className}" decoding="async" loading="${eager ? 'eager' : 'lazy'}" fetchpriority="${eager ? 'high' : 'low'}">`
);

export function getAboutEntranceMotion(reducedMotion: boolean): { duration: number; stagger: number; y: number } {
  return reducedMotion
    ? { duration: 0, stagger: 0, y: 0 }
    : { duration: 0.78, stagger: 0.11, y: 48 };
}

export function buildAboutProfileMarkup(): string {
  const skillMarkup = skills.map(([name, filename]) => image(
    `${assetRoot}/02-top-right/${filename}`,
    name,
    'about-profile__skill',
  )).join('');
  const tagRows = [personalTags.slice(0, 3), personalTags.slice(3, 5), personalTags.slice(5, 7)]
    .map((row) => `<div class="about-profile__tag-row">${row.map(([name, filename]) => image(
      `${assetRoot}/04-bottom-center/${filename}`,
      name,
      'about-profile__tag',
    )).join('')}</div>`)
    .join('');

  return `
    <div class="about-profile-page" data-about-page data-motion-ready="false" role="dialog" aria-modal="true" aria-labelledby="about-profile-title">
      <h1 id="about-profile-title" class="about-profile__sr-title">韩婧仪 Ginny · 个人介绍</h1>
      <button class="about-profile__close" type="button" data-about-close aria-label="关闭个人介绍并返回作品目录">
        <span aria-hidden="true">←</span><span>返回作品目录</span>
      </button>
      <main class="about-profile__viewport">
        <div class="about-profile__layout">
          <div class="about-profile__left-column">
            <section class="about-profile__section about-profile__portrait" data-about-section="portrait" aria-label="个人照片">
              ${image(`${assetRoot}/01-top-left/photo-card-full.webp`, '韩婧仪 Ginny 个人照片', 'about-profile__artwork', true)}
            </section>
            <section class="about-profile__section about-profile__origin" data-about-section="origin" aria-label="来自哪里">
              ${image(`${assetRoot}/03-bottom-left/from-card-bg.webp`, '来自哪里', 'about-profile__artwork')}
              <div class="about-profile__origin-badges" data-about-items>
                ${image(`${assetRoot}/03-bottom-left/henan-badge-new.webp`, '河南 老家', 'about-profile__origin-badge')}
                ${image(`${assetRoot}/03-bottom-left/bsu-badge-new.webp`, '北京体育大学', 'about-profile__origin-badge')}
              </div>
            </section>
          </div>
          <div class="about-profile__right-column">
            <section class="about-profile__section about-profile__skills" data-about-section="about-skills" aria-label="关于我与技能">
              ${image(`${assetRoot}/02-top-right/about-skills-bg.webp`, 'About me 与技能', 'about-profile__artwork', true)}
              <div class="about-profile__skill-grid" data-about-items>${skillMarkup}</div>
            </section>
            <div class="about-profile__bottom-row">
              <section class="about-profile__section about-profile__tags" data-about-section="personal-tags" aria-label="个人标签">
                ${image(`${assetRoot}/04-bottom-center/tags-card-bg.webp`, '个人标签', 'about-profile__artwork')}
                <div class="about-profile__tag-grid" data-about-items>${tagRows}</div>
              </section>
              <section class="about-profile__section about-profile__contact" data-about-section="contact" aria-label="联系信息">
                ${image(`${assetRoot}/05-bottom-right/contact-card-full.webp`, '联系信息', 'about-profile__artwork')}
              </section>
            </div>
          </div>
        </div>
      </main>
    </div>`;
}

export type AboutProfilePageHandle = {
  dispose: () => void;
};

export function mountAboutProfilePage(
  container: HTMLElement,
  options: { reducedMotion: boolean; onClose: () => void },
): AboutProfilePageHandle {
  container.insertAdjacentHTML('beforeend', buildAboutProfileMarkup());
  const page = container.querySelector<HTMLElement>('[data-about-page]');
  if (!page) throw new Error('Unable to mount about profile page');

  const closeButton = page.querySelector<HTMLButtonElement>('[data-about-close]');
  const sections = Array.from(page.querySelectorAll<HTMLElement>('[data-about-section]'));
  const motion = getAboutEntranceMotion(options.reducedMotion);
  let disposed = false;
  let closing = false;
  let observer: IntersectionObserver | null = null;
  const removeInteractions: Array<() => void> = [];

  const context = gsap.context(() => {
    if (options.reducedMotion) {
      gsap.set(sections, { autoAlpha: 1, y: 0 });
      page.dataset.motionReady = 'true';
    } else {
      gsap.set(sections, { autoAlpha: 0, y: motion.y, scale: 0.965 });
      page.dataset.motionReady = 'true';
      const reveal = (section: HTMLElement) => {
        if (section.dataset.revealed === 'true') return;
        section.dataset.revealed = 'true';
        const sectionIndex = sections.indexOf(section);
        gsap.fromTo(section, {
          autoAlpha: 0,
          y: motion.y,
          scale: 0.965,
          rotation: sectionIndex % 2 === 0 ? -0.45 : 0.45,
        }, {
          autoAlpha: 1,
          y: 0,
          scale: 1,
          rotation: 0,
          duration: motion.duration,
          ease: 'power3.out',
        });
        const items = section.querySelectorAll('img:not(.about-profile__artwork)');
        if (items.length > 0) {
          gsap.fromTo(items, { autoAlpha: 0, y: 18, scale: 0.9, rotation: -1.5 }, {
            autoAlpha: 1,
            y: 0,
            scale: 1,
            rotation: 0,
            duration: 0.52,
            stagger: motion.stagger,
            ease: 'back.out(1.45)',
            delay: 0.2,
          });
        }
      };

      if ('IntersectionObserver' in window) {
        observer = new IntersectionObserver((entries) => {
          for (const entry of entries) {
            if (!entry.isIntersecting) continue;
            reveal(entry.target as HTMLElement);
            observer?.unobserve(entry.target);
          }
        }, { root: page, threshold: 0.12 });
        sections.forEach((section) => observer?.observe(section));
      } else {
        sections.forEach(reveal);
      }
      gsap.fromTo(closeButton, { autoAlpha: 0, y: -12 }, { autoAlpha: 1, y: 0, duration: 0.45, ease: 'power2.out' });
    }

    sections.forEach((section, sectionIndex) => {
      const onSectionEnter = () => {
        gsap.set(section, { zIndex: 2 });
        gsap.to(section, {
          y: options.reducedMotion ? 0 : -7,
          scale: options.reducedMotion ? 1.01 : 1.015,
          rotation: options.reducedMotion ? 0 : (sectionIndex % 2 === 0 ? -0.22 : 0.22),
          filter: 'drop-shadow(0 14px 18px rgba(36, 29, 42, 0.18))',
          duration: options.reducedMotion ? 0.12 : 0.3,
          ease: 'power2.out',
          overwrite: 'auto',
        });
      };
      const onSectionLeave = () => {
        gsap.to(section, {
          y: 0,
          scale: 1,
          rotation: 0,
          filter: 'drop-shadow(0 0 0 rgba(36, 29, 42, 0))',
          duration: options.reducedMotion ? 0.12 : 0.34,
          ease: 'power2.out',
          overwrite: 'auto',
          onComplete: () => { section.style.zIndex = ''; },
        });
      };
      section.addEventListener('pointerenter', onSectionEnter);
      section.addEventListener('pointerleave', onSectionLeave);
      removeInteractions.push(() => {
        section.removeEventListener('pointerenter', onSectionEnter);
        section.removeEventListener('pointerleave', onSectionLeave);
      });

      const labels = Array.from(section.querySelectorAll<HTMLElement>('img:not(.about-profile__artwork)'));
      labels.forEach((label, labelIndex) => {
        const onLabelEnter = () => {
          gsap.set(label, { zIndex: 3 });
          gsap.to(label, {
            y: options.reducedMotion ? 0 : -6,
            scale: options.reducedMotion ? 1.04 : 1.08,
            rotation: options.reducedMotion ? 0 : (labelIndex % 2 === 0 ? -1.5 : 1.5),
            filter: 'drop-shadow(0 8px 7px rgba(36, 29, 42, 0.2))',
            duration: options.reducedMotion ? 0.12 : 0.24,
            ease: 'back.out(1.7)',
            overwrite: 'auto',
          });
        };
        const onLabelLeave = () => {
          gsap.to(label, {
            y: 0,
            scale: 1,
            rotation: 0,
            filter: 'drop-shadow(0 0 0 rgba(36, 29, 42, 0))',
            duration: options.reducedMotion ? 0.12 : 0.28,
            ease: 'power2.out',
            overwrite: 'auto',
            onComplete: () => { label.style.zIndex = ''; },
          });
        };
        label.addEventListener('pointerenter', onLabelEnter);
        label.addEventListener('pointerleave', onLabelLeave);
        removeInteractions.push(() => {
          label.removeEventListener('pointerenter', onLabelEnter);
          label.removeEventListener('pointerleave', onLabelLeave);
        });
      });
    });
  }, page);

  const finishClose = () => {
    if (disposed) return;
    options.onClose();
  };
  const requestClose = () => {
    if (closing || disposed) return;
    closing = true;
    if (options.reducedMotion) {
      finishClose();
      return;
    }
    gsap.to(page, { autoAlpha: 0, y: 16, duration: 0.28, ease: 'power2.in', onComplete: finishClose });
  };
  closeButton?.addEventListener('click', requestClose);
  closeButton?.focus({ preventScroll: true });

  return {
    dispose: () => {
      if (disposed) return;
      disposed = true;
      observer?.disconnect();
      removeInteractions.forEach((removeInteraction) => removeInteraction());
      closeButton?.removeEventListener('click', requestClose);
      context.revert();
      page.remove();
    },
  };
}
