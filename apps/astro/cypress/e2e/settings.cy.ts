/**
 * Copyright (c) 2025 Foia Stream
 * Settings Page E2E Tests
 */

describe('Settings Page', () => {
  beforeEach(() => {
    cy.loginMock();

    // Mock MFA status
    cy.intercept('GET', '**/auth/mfa/status', {
      statusCode: 200,
      body: { enabled: false },
    }).as('getMFAStatus');

    // Mock sessions
    cy.intercept('GET', '**/auth/sessions', {
      statusCode: 200,
      body: [],
    }).as('getSessions');

    // Mock API key
    cy.intercept('GET', '**/auth/api-key', {
      statusCode: 200,
      body: null,
    }).as('getApiKey');

    cy.visit('/settings');
    cy.wait(500);
  });

  describe('Page Loading', () => {
    it('should load the settings page', () => {
      cy.url().should('include', '/settings');
    });

    it('should display Settings header', () => {
      cy.contains('Settings').should('be.visible');
    });

    it('should display Manage your account preferences text', () => {
      cy.contains('Manage your account preferences').should('be.visible');
    });

    it('should have back to dashboard link', () => {
      cy.get('a[href="/dashboard"]').should('exist');
    });
  });

  describe('Navigation Tabs', () => {
    it('should display Profile tab', () => {
      cy.contains('Profile').should('be.visible');
    });

    it('should display Security tab', () => {
      cy.contains('Security').should('be.visible');
    });

    it('should display Preferences tab', () => {
      cy.contains('Preferences').should('be.visible');
    });

    it('should display API Keys tab', () => {
      cy.contains('API Keys').should('be.visible');
    });

    it('should display Danger Zone tab', () => {
      cy.contains('Danger Zone').should('be.visible');
    });
  });

  describe('Profile Tab', () => {
    it('should display Profile Information section', () => {
      cy.contains('Profile Information').should('be.visible');
    });

    it('should display First Name field', () => {
      cy.contains('First Name').should('be.visible');
      cy.get('input#settings-first-name').should('exist');
    });

    it('should display Last Name field', () => {
      cy.contains('Last Name').should('be.visible');
      cy.get('input#settings-last-name').should('exist');
    });

    it('should display Email Address field', () => {
      cy.contains('Email Address').should('be.visible');
      cy.get('input#settings-email').should('exist');
    });

    it('should have Edit button', () => {
      cy.contains('button', 'Edit').should('be.visible');
    });
  });

  describe('Security Tab', () => {
    beforeEach(() => {
      cy.contains('button', 'Security').click();
      cy.wait(300);
    });

    it('should display Password section', () => {
      cy.contains('Password').should('be.visible');
      cy.contains('Change Password').should('be.visible');
    });

    it('should display Two-Factor Authentication section', () => {
      cy.contains('Two-Factor Authentication').should('be.visible');
    });

    it('should display Active Sessions section', () => {
      cy.contains('Active Sessions').should('be.visible');
      cy.contains('View Sessions').should('be.visible');
    });
  });

  describe('Preferences Tab', () => {
    beforeEach(() => {
      cy.contains('button', 'Preferences').click();
      cy.wait(300);
    });

    it('should display Password Change Reminder section', () => {
      cy.contains('Password Change Reminder').should('be.visible');
    });

    it('should display Email Notifications section', () => {
      cy.contains('Email Notifications').should('be.visible');
    });

    it('should have notification toggle options', () => {
      cy.contains('Request Updates').should('be.visible');
      cy.contains('Deadline Reminders').should('be.visible');
      cy.contains('Weekly Digest').should('be.visible');
    });

    it('should display Export Your Data section', () => {
      cy.contains('Export Your Data').should('be.visible');
    });

    it('should have Save Preferences button', () => {
      cy.contains('button', 'Save Preferences').should('be.visible');
    });
  });

  describe('API Keys Tab', () => {
    beforeEach(() => {
      cy.contains('button', 'API Keys').click();
      cy.wait(300);
    });

    it('should display API Key section', () => {
      cy.contains('API Key').should('be.visible');
    });

    it('should display key security notice', () => {
      cy.contains(/Keep it secret|never share it publicly/i).should('be.visible');
    });
  });

  describe('Danger Zone Tab', () => {
    beforeEach(() => {
      cy.contains('button', 'Danger Zone').click();
      cy.wait(300);
    });

    it('should display danger zone warning', () => {
      cy.contains(/Delete|dangerous|irreversible/i).should('be.visible');
    });
  });

  describe('Responsive Design', () => {
    it('should work on mobile', () => {
      cy.viewport('iphone-x');
      cy.get('body').should('be.visible');
      cy.contains('Settings').should('be.visible');
    });

    it('should work on tablet', () => {
      cy.viewport('ipad-2');
      cy.get('body').should('be.visible');
      cy.contains('Profile').should('be.visible');
    });
  });
});
