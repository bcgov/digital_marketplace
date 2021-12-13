import React from 'react';
import {render} from '@testing-library/react'
// "front-end" means the path "front-end/typescript" per the front-end tsconfig, so have to use the same alias here. IDE might show a TS error but test should run.
import ProgramType from '../../src/front-end/lib/views/program-type'



jest.mock('front-end/lib/framework')
jest.mock('front-end/lib/views/icon', () =>
function MockedIcon() {
  return (<div>Mocked Icon</div>)
}
)

describe('ProgramType contains the correct text based on prop type_', function() {
    it("has correct text for CWU opportunity", function() {
        const { getByText} = render(
            <ProgramType type_='cwu'  />
          );
          expect(getByText("Code With Us")).toBeTruthy();
      });

      it("has correct text for SWU opportunity", function() {
        const { getByText} = render(
            <ProgramType type_='swu'  />
          );
          expect(getByText("Sprint With Us")).toBeTruthy();
      });
    })
