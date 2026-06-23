import { test, expect, Page, Locator } from '@playwright/test';

const POSITION_ID = 1;
const BASE_API = 'http://localhost:3010';

const mockInterviewFlow = {
  interviewFlow: {
    positionName: 'Senior Backend Developer',
    interviewFlow: {
      interviewSteps: [
        { id: 1, name: 'CV Review', orderIndex: 1 },
        { id: 2, name: 'Phone Screen', orderIndex: 2 },
        { id: 3, name: 'Technical Interview', orderIndex: 3 },
        { id: 4, name: 'Offer', orderIndex: 4 },
      ],
    },
  },
};

const mockCandidates = [
  { candidateId: 1, fullName: 'Alice Johnson', currentInterviewStep: 'CV Review', applicationId: 101, averageScore: 3 },
  { candidateId: 2, fullName: 'Bob Smith', currentInterviewStep: 'Technical Interview', applicationId: 102, averageScore: 4 },
  { candidateId: 3, fullName: 'Carol White', currentInterviewStep: 'CV Review', applicationId: 103, averageScore: 2 },
];

// react-beautiful-dnd requires gradual mouse movement to detect drag start
async function simulateDrag(page: Page, source: Locator, target: Locator): Promise<void> {
  const sourceBox = await source.boundingBox();
  const targetBox = await target.boundingBox();

  if (!sourceBox || !targetBox) throw new Error('Cannot get bounding box for drag elements');

  const sourceX = sourceBox.x + sourceBox.width / 2;
  const sourceY = sourceBox.y + sourceBox.height / 2;
  const targetX = targetBox.x + targetBox.width / 2;
  const targetY = targetBox.y + targetBox.height / 2;

  await page.mouse.move(sourceX, sourceY);
  await page.mouse.down();

  // Gradual movement triggers react-beautiful-dnd drag detection threshold
  const STEPS = 10;
  for (let i = 1; i <= STEPS; i++) {
    const x = sourceX + (targetX - sourceX) * (i / STEPS);
    const y = sourceY + (targetY - sourceY) * (i / STEPS);
    await page.mouse.move(x, y);
    await page.waitForTimeout(20);
  }

  await page.mouse.move(targetX, targetY);
  await page.waitForTimeout(100);
  await page.mouse.up();
}

test.describe('Candidate stage change', () => {
  test('moves candidate from CV Review to Phone Screen', async ({ page }) => {
    // Mock interview flow and candidates
    await page.route(`${BASE_API}/positions/${POSITION_ID}/interviewFlow`, (route) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(mockInterviewFlow) })
    );
    await page.route(`${BASE_API}/positions/${POSITION_ID}/candidates`, (route) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(mockCandidates) })
    );

    // Intercept PUT and capture request data for assertions
    let capturedCandidateId = '';
    let capturedBody: { applicationId: number; currentInterviewStep: number } | null = null;

    await page.route(`${BASE_API}/candidates/**`, async (route) => {
      const req = route.request();
      capturedCandidateId = req.url().split('/').pop() ?? '';
      capturedBody = req.postDataJSON();
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ message: 'Candidate stage updated successfully' }),
      });
    });

    await page.goto(`/positions/${POSITION_ID}`);

    // Wait for full page load (both fetches resolved)
    await expect(page.locator('.card-title', { hasText: 'Alice Johnson' })).toBeVisible();

    const aliceCard = page.locator('.card.mb-2').filter({
      has: page.locator('.card-title', { hasText: 'Alice Johnson' }),
    });
    const phoneScreenColumn = page.locator('.card.mb-4').filter({
      has: page.locator('.card-header', { hasText: 'Phone Screen' }),
    });
    const cvReviewColumn = page.locator('.card.mb-4').filter({
      has: page.locator('.card-header', { hasText: 'CV Review' }),
    });

    // Capture PUT response before triggering drag
    const putResponsePromise = page.waitForResponse(
      (resp) => resp.url().includes('/candidates/') && resp.request().method() === 'PUT'
    );

    await simulateDrag(page, aliceCard, phoneScreenColumn);

    const putResponse = await putResponsePromise;

    // API assertions
    expect(capturedCandidateId).toBe('1');
    expect(capturedBody).not.toBeNull();
    expect(capturedBody!.applicationId).toBe(101);
    expect(capturedBody!.currentInterviewStep).toBe(2); // Phone Screen ID from interviewSteps
    expect(putResponse.status()).toBe(200);

    // UI assertions
    await expect(cvReviewColumn.locator('.card-title', { hasText: 'Alice Johnson' })).not.toBeVisible();
    await expect(phoneScreenColumn.locator('.card-title', { hasText: 'Alice Johnson' })).toBeVisible();
  });
});
