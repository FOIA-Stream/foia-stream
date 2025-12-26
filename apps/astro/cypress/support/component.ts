/**
 * Copyright (c) 2025 Foia Stream
 * Cypress Component Testing Support File
 */

// Import commands
import './commands';

// Import mount from cypress/react
declare global {
  namespace Cypress {
    interface Chainable {
      mount: typeof import('cypress/react18')['mount'];
    }
  }
}

// Mount command will be added by Cypress automatically
// when using the React framework
