import React from 'react'
import Settings from './settings'

describe('<Settings />', () => {
  it('renders', () => {
    // see: https://on.cypress.io/mounting-react
    cy.mount(<Settings />)
  })
})