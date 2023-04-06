import { TWUServiceArea } from "./opportunity/team-with-us";

export interface TWUServiceAreaRecord {
  id: number;
  serviceArea: TWUServiceArea;
  name: string;
}

export type ServiceAreaId = TWUServiceAreaRecord["id"];
