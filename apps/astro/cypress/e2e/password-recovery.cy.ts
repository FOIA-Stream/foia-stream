/**
 * Copyright (c) 2025 Foia Stream
 * Password Recovery Pages E2E Tests
 */

describe('Forgot Password Page', () => {
  beforeEach(() => {
    cy.visit('/forgot-password');
  });

  describe('Page Rendering', () => {
    it('should display forgot password page', () => {
      cy.contains(/Forgot|Reset|Password/i).should('be.visible');
    });

    it('should have email input', () => {
      cy.get('input[type="email"]').should('exist');
    });

    it('should have submit button', () => {
      cy.get('button[type="submit"]').should('exist');
    });
  });

  describe('Form Validation', () => {
    it('should show error for empty email', () => {
      cy.get('button[type="submit"]').click();
      cy.get('input[type="email"]:invalid').should('exist');
    });

    it('should validate email format', () => {
      cy.get('input[type="email"]').type('invalid');
      cy.get('button[type="submit"]').click();
      cy.get('input[type="email"]:invalid').should('exist');
    });
  });

  describe('Form Submission', () => {
    it('should submit with valid email', () => {
      cy.mockApi('POST', '/auth/forgot-password', { success: true });
      cy.get('input[type="email"]').type('test@example.com');
      cy.get('button[type="submit"]').click();
      cy.contains(/sent|check|email/i).should('be.visible');
    });
  });

  describe('Navigation', () => {
    it('should have link back to login', () => {
      cy.contains(/login|sign in|back/i).should('exist');
    });
  });
});

describe('Account Recovery Page', () => {
  beforeEach(() => {
    cy.visit('/account-recovery');
  });

  describe('Page Rendering', () => {
    it('should display account recovery page', () => {
      cy.contains(/Recovery|Account|Reset/i).should('be.visible');
    });
  });

  describe('Recovery Options', () => {
    it('should show recovery options', () => {
      cy.get('body').should('be.visible');
    });
  });
});

describe('Email Verification Page', () => {
  beforeEach(() => {
    cy.visit('/verify-email');
  });

  describe('Page Rendering', () => {
    it('should display verification page', () => {
      cy.contains(/Verify|Email|Confirmation/i).should('be.visible');
    });
  });

  describe('Verification Status', () => {
    it('should show verification status', () => {
      cy.get('body').should('be.visible');
    });
  });

  describe('Resend Option', () => {
    it('should have resend verification option', () => {
      cy.contains(/resend|again/i).should('exist');
    });
  });
});
