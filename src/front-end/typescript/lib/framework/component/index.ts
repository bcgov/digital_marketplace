export * as base from "front-end/lib/framework/component/base";
export * as global from "front-end/lib/framework/component/global";
export * as page from "front-end/lib/framework/component/page";
export * as app from "front-end/lib/framework/component/app";
export type { Cmd } from "front-end/lib/framework/component/cmd";
export * as cmd from "front-end/lib/framework/component/cmd";
/**
 * @remarks
 * Component - In the framework, a "component" is part
 * of the UI that encapsulates both the View and State
 *  Management. The objectives of a component are:
 *
 * 1. Separation of Concerns - A single component
 * should only be concerned with its problem domain by
 * defining three Types: Params, State, Msg and three
 * functions: Init, Update, View
 *
 * 2. Composability - We should be able to safely use
 * components inside other components, ane re-use them
 * multiple times. A related term used in the industry
 * is "unidirectional data flow".
 */
