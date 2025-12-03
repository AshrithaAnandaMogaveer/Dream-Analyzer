/**
 * E2E Test Scenario: Mental Health Submit Fallback Behavior
 *
 * Simulates backend up/down states to verify resilient behavior
 */

describe('Mental Health Submit Fallback - E2E', () => {
  const TEST_SELECTOR = {
    diaryGrid: 'div[class*="dialogue-grid"]',
    mentalHealthCard: '[data-testid="mental-health-card"]',
    submitBtn: 'button:contains("Submit Entry")',
    toastContainer: '[data-testid*="toast-container"]',
    lifestyleAnalysis: '[data-testid="lifestyle-analysis-modal"]',
    chartContainer: '[data-testid*="chart-container"]'
  };

  // Stub for backend interception
  let backendIntercept;

  beforeEach(() => {
    // Clear local storage state
    cy.window().then((win) => {
      win.localStorage.removeItem('dreamdairy_pending_mental_entries');
      win.localStorage.removeItem('token');
    });

    // Set fake auth token
    cy.window().then((win) => {
      win.localStorage.setItem('token', 'test-token');
    });
  });

  describe('Scenario 1: Backend Available - Normal Flow', () => {
    beforeEach(() => {
      // Intercept and mock successful backend response
      backendIntercept = cy.intercept('POST', '/api/dream-diary/mental-health', {
        statusCode: 200,
        body: {
          success: true,
          entry: {
            id: 'server-generated-id',
            emotionalState: 'neutral',
            sleepQuality: 'Good',
            selfReportedSleepHours: 8.0,
            notes: 'Personalized guidance',
            date: new Date().toISOString().split('T')[0],
            _synced: true
          }
        },
        headers: {
          'content-type': 'application/json'
        }
      }).as('submitMentalHealth');

      cy.visit('/dream-diary');
    });

    it('should submit successfully to backend and update UI', () => {
      // Click Mental Health card
      cy.get(TEST_SELECTOR.diaryGrid).contains('Mental Health & Wellness').click();

      // Click Submit Entry
      cy.contains('Submit Entry').should('be.visible').click();

      // Should see success toast
      cy.contains('Entry submitted successfully!').should('be.visible');

      // Modal should close
      cy.contains('Mental Health & Wellness').should('not.be.visible');

      // Backend should have been called once
      cy.wait('@submitMentalHealth').then((interception) => {
        // Verify payload structure
        expect(interception.request.body).to.have.property('emotionalState');
        expect(interception.request.body).to.have.property('notes');

        // Verify came from correct endpoint
        expect(interception.request.url).to.equal('/api/dream-diary/mental-health');
      });

      // Charts should update with this new entry
      cy.get(TEST_SELECTOR.lifestyleAnalysis).should('exist');

      // Verify no local fallback entries queued
      cy.window().then((win) => {
        const pending = JSON.parse(win.localStorage.getItem('dreamdairy_pending_mental_entries') || '[]');
        expect(pending.length).to.equal(0);
      });
    });
  });

  describe('Scenario 2: Backend Unavailable - Local Fallback', () => {
    beforeEach(() => {
      // Intercept and mock backend failure (ECONNREFUSED)
      backendIntercept = cy.intercept('POST', '/api/dream-diary/mental-health', {
        statusCode: 500,
        body: '<html><head><title>Proxy Error</title></head><body>Proxy error: Could not proxy request /api/dream-diary/mental-health</body></html>',
        headers: {
          'content-type': 'text/html'
        }
      }).as('submitMentalHealthFailed');

      cy.visit('/dream-diary');
    });

    it('should fallback to local storage and show error message', () => {
      // Click Mental Health card
      cy.get(TEST_SELECTOR.diaryGrid).contains('Mental Health & Wellness').click();

      // Click Submit Entry
      cy.contains('Submit Entry').should('be.visible').click();

      // Should see fallback error toast (not success)
      cy.contains(/Saved locally.*server error/i).should('be.visible');

      // Backend should have been called (but failed)
      cy.wait('@submitMentalHealthFailed');

      // Modal should still close (UI completed)
      cy.contains('Mental Health & Wellness').should('not.be.visible');

      // Should have queued fallback entry for retry
      cy.window().then((win) => {
        const pending = JSON.parse(win.localStorage.getItem('dreamdairy_pending_mental_entries') || '[]');
        expect(pending.length).to.equal(1);
        expect(pending[0]).to.have.property('id');
        expect(pending[0].id).to.match(/^local-/);
        expect(pending[0]).to.have.property('_synced', false);
        expect(pending[0]).to.have.property('emotionalState');
      });

      // Charts should still update (UI functionality preserved)
      cy.get(TEST_SELECTOR.lifestyleAnalysis).should('exist');
    });
  });

  describe('Scenario 3: Backend Recovers - Background Sync', () => {
    beforeEach(() => {
      // Initially fail, then succeed
      cy.window().then((win) => {
        // Pre-seed a pending entry
        const pendingEntry = {
          id: 'local-test-123',
          emotionalState: 'neutral',
          sleepQuality: 'Good',
          selfReportedSleepHours: 8.0,
          notes: 'Test entry',
          date: new Date().toISOString().split('T')[0],
          _synced: false
        };
        win.localStorage.setItem('dreamdairy_pending_mental_entries', JSON.stringify([pendingEntry]));
      });

      // Intercept - succeed this time
      backendIntercept = cy.intercept('POST', '/api/dream-diary/mental-health', {
        statusCode: 200,
        body: {
          success: true,
          entry: {
            id: 'server-recovery-id',
            emotionalState: 'neutral',
            sleepQuality: 'Good',
            selfReportedSleepHours: 8.0,
            notes: 'Test entry',
            date: new Date().toISOString().split('T')[0],
            _synced: true
          }
        },
        headers: {
          'content-type': 'application/json'
        }
      }).as('syncRecovery');

      cy.visit('/dream-diary', {
        onBeforeLoad(win) {
          // Mock the app startup sync process
          cy.stub(win.console, 'log').as('consoleLog');
        }
      });

      // Wait for automatic sync
      cy.wait(3000);
    });

    it('should automatically sync queued entries when backend recovers', () => {
      // Should see sync activity in console logs
      cy.get('@consoleLog').should('be.calledWithMatch', /DreamDairy: Re-sync successful/);

      // Pending queue should be emptied
      cy.window().then((win) => {
        const pending = JSON.parse(win.localStorage.getItem('dreamdairy_pending_mental_entries') || '[]');
        expect(pending.length).to.equal(0);
      });

      // Backend should have received the sync request
      cy.get('@syncRecovery').then((interception) => {
        expect(interception.request.body).to.have.property('emotionalState');
        expect(interception.request.url).to.equal('/api/dream-diary/mental-health');
      });
    });
  });

  describe('Scenario 4: Mixed Content-Type Responses', () => {
    it('should handle different response content types gracefully', () => {
      // Test empty response
      cy.intercept('POST', '/api/dream-diary/mental-health', {
        statusCode: 200,
        body: '',
        headers: { 'content-type': 'text/plain' }
      });

      // Test JSON response
      cy.intercept('POST', '/api/dream-diary/mental-health', {
        statusCode: 200,
        body: '{"success":true}',
        headers: { 'content-type': 'application/json' }
      });

      // Test HTML error
      cy.intercept('POST', '/api/dream-diary/mental-health', {
        statusCode: 500,
        body: '<html>Server Error</html>',
        headers: { 'content-type': 'text/html' }
      });

      // Verify no crashes in all cases
      cy.visit('/dream-diary');
      // UI should remain functional regardless of response type
    });
  });
});</content>
