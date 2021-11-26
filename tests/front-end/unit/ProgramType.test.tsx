import React from 'react';
import {render} from '@testing-library/react'
// "front-end" aliases "front-end/typescript" per the front-end tsconfig, so have to use the same alias here. IDE might show a TS error but test should run.
import ProgramType from '../../src/front-end/lib/views/program-type'


jest.mock('front-end/lib/framework')
jest.mock('front-end/lib/views/icon', () => () => (<div>Mocked Icon</div>))

describe('ProgramType contains the correct text based on prop type_', () => {
    it("has correct text for CWU opportunity", () => {
        const { getByText} = render(
            <ProgramType type_='cwu'  />
          );
          expect(getByText("Code With Us")).toBeTruthy();
      });

      it("has correct text for SWU opportunity", () => {
        const { getByText} = render(
            <ProgramType type_='swu'  />
          );
          expect(getByText("Sprint With Us")).toBeTruthy();
      });
      it("has correct text for New Product opportunity", () => {
        const { getByText} = render(
            <ProgramType type_='new'  />
          );
          expect(getByText("New Product")).toBeTruthy();
      });
    })