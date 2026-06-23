import { test, expect } from '@playwright/test';

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

test.describe('Position page load', () => {
  test.beforeEach(async ({ page }) => {
    await page.route(`${BASE_API}/positions/${POSITION_ID}/interviewFlow`, (route) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(mockInterviewFlow) })
    );

    await page.route(`${BASE_API}/positions/${POSITION_ID}/candidates`, (route) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(mockCandidates) })
    );

    await page.goto(`/positions/${POSITION_ID}`);
  });

  test('shows position title', async ({ page }) => {
    const title = page.locator('h2.text-center');
    await expect(title).toBeVisible();
    await expect(title).toHaveText('Senior Backend Developer');
  });

  test('shows all hiring phase columns', async ({ page }) => {
    const columnHeaders = page.locator('.card-header');
    await expect(columnHeaders).toHaveCount(4);
    await expect(columnHeaders.nth(0)).toHaveText('CV Review');
    await expect(columnHeaders.nth(1)).toHaveText('Phone Screen');
    await expect(columnHeaders.nth(2)).toHaveText('Technical Interview');
    await expect(columnHeaders.nth(3)).toHaveText('Offer');
  });

  test('shows candidate cards in correct columns', async ({ page }) => {
    // Wait for candidates to render (both fetches must have resolved)
    await expect(page.locator('.card-title').filter({ hasText: 'Alice Johnson' })).toBeVisible();

    const cvReviewColumn = page.locator('.card.mb-4').filter({
      has: page.locator('.card-header', { hasText: 'CV Review' }),
    });
    const phoneScreenColumn = page.locator('.card.mb-4').filter({
      has: page.locator('.card-header', { hasText: 'Phone Screen' }),
    });
    const technicalColumn = page.locator('.card.mb-4').filter({
      has: page.locator('.card-header', { hasText: 'Technical Interview' }),
    });

    // Alice Johnson and Carol White in CV Review
    await expect(cvReviewColumn.locator('.card-title', { hasText: 'Alice Johnson' })).toBeVisible();
    await expect(cvReviewColumn.locator('.card-title', { hasText: 'Carol White' })).toBeVisible();

    // Bob Smith in Technical Interview
    await expect(technicalColumn.locator('.card-title', { hasText: 'Bob Smith' })).toBeVisible();

    // Phone Screen column has no candidate cards
    await expect(phoneScreenColumn.locator('.card-title')).toHaveCount(0);
  });
});
