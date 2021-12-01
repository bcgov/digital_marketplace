import {React, element} from 'react';
// "front-end" means the path "front-end/typescript" per the front-end tsconfig, so have to use the same alias here. IDE might show a TS error but test should run.
import {tableBodyRows} from '../../../src/front-end/lib/pages/organization/list'



describe('SWU Qualified column on organizations has correct icon', () => {

  it("returns a checkmark icon if organization is SWU qualified", () => {
    const testState = {
      "loading": 0,
      "page": 1,
      "numPages": 1,
      "organizations": [
        {
          "id": "5d37727a-ccbf-419b-aabf-4769afe0ab8e",
          "legalName": "Test Organization",
          "owner": {
              "id": "00af658f-36f1-4737-ac3d-f9d192500e97",
              "name": "Organization Owner",
              "avatarImageFile": null
          },
          "acceptedSWUTerms": "2021-11-29T17:51:08.939Z",
          "possessAllCapabilities": true,
          "active": true,
          "numTeamMembers": 5
      }
      ],
      "table": {
          "idNamespace": "org-list-table",
          "activeTooltipThIndex": null,
          "activeTooltipTdIndex": null
      },
      "sessionUser": null
    }

    console.dir(tableBodyRows(testState),{ depth: null })

    // const completeReturn = [
    //   [
    //     {
    //       children: {
    //         '$$typeof': Symbol(react.element),
    //         type: [Function: Link],
    //         key: null,
    //         ref: null,
    //         props: {
    //           dest: {
    //             tag: 'route',
    //             value: {
    //               tag: 'orgEdit',
    //               value: { orgId: '5d37727a-ccbf-419b-aabf-4769afe0ab8e' }
    //             }
    //           },
    //           children: 'Test Organization'
    //         },
    //         _owner: null,
    //         _store: {}
    //       }
    //     },
    //     {
    //       children: {
    //         '$$typeof': Symbol(react.element),
    //         type: [Function: Icon],
    //         key: null,
    //         ref: null,
    //         props: { name: 'check', color: 'success' },
    //         _owner: null,
    //         _store: {}
    //       }
    //     }
    //   ]
    // ]


    const partial = [
      [
        {
          children: {
            props: 
              { 
                name: 'check', 
                color: 'success' 
            },
          }
        }
      ]
    ]


    const full = tableBodyRows(testState)
    expect(full).toMatchObject(partial)
    // expect(full).toEqual(expect.arrayContaining(expected))
    
    });

    it('practice with toMatchObject', ()=>{
        // const fullObj = [[{a: 1, b:2, c:3}]]
        const fullObj = [[{children: {d:4, e:5}, b:2, c:3}]]

        // const partial = [[{a: {d:4, e:5}}]];
        const partial = [[{children: {d:4}}]];
        expect(fullObj).toMatchObject(partial)

    })

    // it("returns an X icon if organization hasn't accepted terms, has fewer than 2 team members, and does not possess all capabilities", () => {
    //   const testState = {
    //     "loading": 0,
    //     "page": 1,
    //     "numPages": 1,
    //     "organizations": [
    //       {
    //         "id": "5d37727a-ccbf-419b-aabf-4769afe0ab8e",
    //         "legalName": "Test Organization",
    //         "owner": {
    //             "id": "00af658f-36f1-4737-ac3d-f9d192500e97",
    //             "name": "Organization Owner",
    //             "avatarImageFile": null
    //         },
    //         "acceptedSWUTerms": null,
    //         "possessAllCapabilities": false,
    //         "active": true,
    //         "numTeamMembers": 1
    //     }
    //     ],
    //     "table": {
    //         "idNamespace": "org-list-table",
    //         "activeTooltipThIndex": null,
    //         "activeTooltipTdIndex": null
    //     },
    //     "sessionUser": null
    //   }

    //   const expected = [
    //     [
    //       {
    //         children: {
    //           '$$typeof': Symbol(react.element),
    //           type: [Function: Link],
    //           key: null,
    //           ref: null,
    //           props: {
    //             dest: {
    //               tag: 'route',
    //               value: {
    //                 tag: 'orgEdit',
    //                 value: { orgId: '5d37727a-ccbf-419b-aabf-4769afe0ab8e' }
    //               }
    //             },
    //             children: 'Test Organization'
    //           },
    //           _owner: null,
    //           _store: {}
    //         }
    //       },
    //       {
    //         children: {
    //           '$$typeof': Symbol(react.element),
    //           type: [Function: Icon],
    //           key: null,
    //           ref: null,
    //           props: { name: 'times', color: 'body' },
    //           _owner: null,
    //           _store: {}
    //         }
    //       }
    //     ]
    //   ]

    //   const result = tableBodyRows(testState)
    //   expect(result).toEqual(expected);
    //   });
      
    })

    