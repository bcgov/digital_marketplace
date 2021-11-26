import React from 'react';
import {render} from '@testing-library/react'
// "front-end" aliases "front-end/typescript" per the front-end tsconfig, so have to use the same alias here
import ProgramType from 'front-end/lib/views/program-type'

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
    })