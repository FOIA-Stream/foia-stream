/**
 * Copyright (c) 2025 Foia Stream
 * Legal Pages E2E Tests (Privacy, Terms, FAQ)
 */

describe('Privacy Policy Page', () => {
  beforeEach(() => {
    cy.visit('/privacy');
  });

  it('should display privacy policy page', () => {
    cy.contains(/Privacy/i).should('be.visible');
  });

  it('should have content sections', () => {
    cy.get('h1, h2, h3').should('have.length.at.least', 1);
  });

  it('should be scrollable', () => {
    cy.scrollTo('bottom');
    cy.scrollTo('top');
  });

  it('should work on mobile', () => {
    cy.viewport('iphone-x');
    cy.get('body').should('be.visible');
  });
});

describe('Terms of Service Page', () => {
  beforeEach(() => {
    cy.visit('/terms');
  });

  it('should display terms page', () => {
    cy.contains(/Terms/i).should('be.visible');
  });

  it('should have content sections', () => {
    cy.get('h1, h2, h3').should('have.length.at.least', 1);
  });

  it('should be scrollable', () => {
    cy.scrollTo('bottom');
    cy.scrollTo('top');
  });

  it('should work on mobile', () => {
    cy.viewport('iphone-x');
    cy.get('body').should('be.visible');
  });
});

describe('FAQ Page', () => {
  beforeEach(() => {
    cy.visit('/faq');
  });

  it('should display FAQ page', () => {
    cy.contains(/FAQ|Frequently Asked|Questions/i).should('be.visible');
  });

  it('should have FAQ items', () => {
    cy.get('[data-testid="faq-item"], details, .faq-item').should('have.length.at.least', 1);
  });

  it('should expand FAQ items when clicked', () => {
    // Click the first FAQ toggle button
    cy.get('.faq-toggle').first().click();
  });

  it('should have searchable content', () => {
    cy.get('input[type="search"], input[placeholder*="Search"]').should('exist');
  });

  it('should work on mobile', () => {
    cy.viewport('iphone-x');
    cy.get('body').should('be.visible');
  });
});
