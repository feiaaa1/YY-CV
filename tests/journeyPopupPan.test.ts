import { describe, expect, test } from 'vitest';
import { portfolioContent } from '../src/content/portfolio';
import { createJourneyModel } from '../src/models/journey';

const journeyCategory = portfolioContent.categories.find((category) => category.presentation === 'journey')!;

function openFirstStation() {
  const journey = createJourneyModel(journeyCategory, true);
  journey.root.userData.targetScale = 1;
  journey.root.userData.popupScale = 1;
  return journey;
}

describe('internship detail sheet panning', () => {
  test('opens at the top of a sheet that is taller than the viewport', async () => {
    const journey = openFirstStation();
    journey.root.userData.popupFit = { overflowX: 0, overflowY: 2 };

    await journey.actions.setProject(0);
    journey.update(1 / 60, 0);

    const sheet = journey.parts.get('internship-detail-migu')!;
    expect(sheet.position.y).toBeCloseTo(0.08 - 1, 5);
    expect(journey.root.userData.popupPan).toEqual({ x: 0, y: -1 });
    journey.dispose();
  });

  test('scrolls the sheet when the pan moves and keeps it when the timeline is idle', async () => {
    const journey = openFirstStation();
    journey.root.userData.popupFit = { overflowX: 0, overflowY: 2 };
    await journey.actions.setProject(0);

    journey.root.userData.popupPan = { x: 0, y: 0.75 };
    journey.update(1 / 60, 0);

    const sheet = journey.parts.get('internship-detail-migu')!;
    expect(sheet.position.y).toBeCloseTo(0.08 + 0.75, 5);
    journey.dispose();
  });

  test('centres a sheet that fits and clears the pan when the sheet closes', async () => {
    const journey = openFirstStation();
    journey.root.userData.popupFit = { overflowX: 0, overflowY: 0 };

    await journey.actions.setProject(0);
    journey.update(1 / 60, 0);
    expect(journey.parts.get('internship-detail-migu')!.position.y).toBeCloseTo(0.08, 5);

    journey.root.userData.popupPan = { x: 0, y: 0.4 };
    journey.update(1 / 60, 0);
    await journey.actions.setProject(-1);

    expect(journey.root.userData.popupPan).toEqual({ x: 0, y: 0 });
    journey.dispose();
  });
});
