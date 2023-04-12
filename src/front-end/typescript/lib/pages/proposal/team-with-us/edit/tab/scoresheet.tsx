// import { EMPTY_STRING } from "front-end/config";
// import { Route } from "front-end/lib/app/types";
// import * as Table from "front-end/lib/components/table";
// import {
//   Immutable,
//   immutable,
//   component as component_
// } from "front-end/lib/framework";
// import * as Tab from "front-end/lib/pages/proposal/team-with-us/edit/tab";
// import { twuProposalStatusToTitleCase } from "front-end/lib/pages/proposal/team-with-us/lib";
// import EditTabHeader from "front-end/lib/pages/proposal/team-with-us/lib/views/edit-tab-header";
// import ReportCardList from "front-end/lib/views/report-card-list";
// import React from "react";
// import { Col, Row } from "reactstrap";
// import { formatAmount } from "shared/lib";
// import {
//   NUM_SCORE_DECIMALS,
//   showScoreAndRankToProponent,
//   TWUProposalStatus
// } from "shared/lib/resources/proposal/team-with-us";
// import { UserType } from "shared/lib/resources/user";
// import { adt, ADT } from "shared/lib/types";
//
// export interface State extends Tab.Params {
//   table: Immutable<Table.State>;
// }
//
// export type InnerMsg = ADT<"table", Table.Msg>;
//
// export type Msg = component_.page.Msg<InnerMsg, Route>;
//
// const init: component_.base.Init<Tab.Params, State, Msg> = (params) => {
//   const [tableState, tableCmds] = Table.init({
//     idNamespace: "twu-proposal-edit-scoresheet"
//   });
//   return [
//     {
//       ...params,
//       table: immutable(tableState)
//     },
//     component_.cmd.mapMany(tableCmds, (msg) => adt("table", msg))
//   ];
// };
//
// const update: component_.base.Update<State, Msg> = ({ state, msg }) => {
//   switch (msg.tag) {
//     case "table":
//       return component_.base.updateChild({
//         state,
//         childStatePath: ["table"],
//         childUpdate: Table.update,
//         childMsg: msg.value,
//         mapChildMsg: (value) => adt("table", value)
//       });
//     default:
//       return [state, []];
//   }
// };
//
// function tableHeadCells(): Table.HeadCells {
//   return [
//     {
//       children: "Resource Questions",
//       className: "text-nowrap"
//     },
//     {
//       children: "Challenge",
//       className: "text-nowrap"
//     },
//     {
//       children: "Price",
//       className: "text-nowrap"
//     },
//     {
//       children: "Total Score",
//       className: "text-nowrap"
//     }
//   ];
// }
//
// function tableBodyRows(state: Immutable<State>): Table.BodyRows {
//   return [
//     [
//       {
//         children: String(
//           state.proposal.questionsScore === undefined
//             ? EMPTY_STRING
//             : `${state.proposal.questionsScore.toFixed(NUM_SCORE_DECIMALS)}%`
//         )
//       },
//       {
//         children: String(
//           state.proposal.challengeScore === undefined
//             ? EMPTY_STRING
//             : `${state.proposal.challengeScore.toFixed(NUM_SCORE_DECIMALS)}%`
//         )
//       },
//       {
//         children: String(
//           state.proposal.priceScore === undefined
//             ? EMPTY_STRING
//             : `${state.proposal.priceScore.toFixed(NUM_SCORE_DECIMALS)}%`
//         )
//       },
//       {
//         children: String(
//           state.proposal.totalScore === undefined
//             ? EMPTY_STRING
//             : `${state.proposal.totalScore.toFixed(NUM_SCORE_DECIMALS)}%`
//         )
//       }
//     ]
//   ];
// }
//
// const Rank: component_.base.ComponentView<State, Msg> = ({ state }) => {
//   if (!showScoreAndRankToProponent(state.proposal) || !state.proposal.rank) {
//     return null;
//   }
//   return (
//     <Row>
//       <Col>
//         <div className="mt-5">
//           <ReportCardList
//             reportCards={[
//               {
//                 icon: "trophy",
//                 name: "Ranking",
//                 iconColor: "c-report-card-icon-highlight",
//                 value: formatAmount(state.proposal.rank, undefined, true)
//               }
//             ]}
//           />
//         </div>
//       </Col>
//     </Row>
//   );
// };
//
// const NotAvailable: component_.base.View<Pick<State, "proposal">> = ({
//                                                                        proposal
//                                                                      }) => {
//   switch (proposal.status) {
//     case TWUProposalStatus.Disqualified:
//     case TWUProposalStatus.Withdrawn: {
//       const withdrawn = twuProposalStatusToTitleCase(
//         TWUProposalStatus.Withdrawn,
//         UserType.Vendor
//       );
//       const disqualified = twuProposalStatusToTitleCase(
//         TWUProposalStatus.Disqualified,
//         UserType.Vendor
//       );
//       return (
//         <div>
//           Scoresheets are not available for {withdrawn} or {disqualified}{" "}
//           proposals.
//         </div>
//       );
//     }
//     default:
//       return (
//         <div>
//           This proposal{"'"}s scoresheet will be available once the opportunity
//           has been awarded.
//         </div>
//       );
//   }
// };
//
// const Scoresheet: component_.base.ComponentView<State, Msg> = ({
//                                                                  state,
//                                                                  dispatch
//                                                                }) => {
//   return (
//     <Row>
//       <Col xs="12">
//         <div className="mt-5 pt-5 border-top">
//           <h3 className="mb-4">Scoresheet</h3>
//           {showScoreAndRankToProponent(state.proposal) ? (
//             <Table.view
//               headCells={tableHeadCells()}
//               bodyRows={tableBodyRows(state)}
//               state={state.table}
//               dispatch={component_.base.mapDispatch(dispatch, (v) =>
//                 adt("table" as const, v)
//               )}
//             />
//           ) : (
//             <NotAvailable proposal={state.proposal} />
//           )}
//         </div>
//       </Col>
//     </Row>
//   );
// };
//
// const view: component_.base.ComponentView<State, Msg> = (props) => {
//   const { state } = props;
//   return (
//     <div>
//       <EditTabHeader proposal={state.proposal} viewerUser={state.viewerUser} />
//       <Rank {...props} />
//       <Scoresheet {...props} />
//     </div>
//   );
// };
//
// export const component: Tab.Component<State, Msg> = {
//   init,
//   update,
//   view,
//   onInitResponse() {
//     return component_.page.readyMsg();
//   }
// };
