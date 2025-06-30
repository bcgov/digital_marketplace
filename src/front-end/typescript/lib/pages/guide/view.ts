import { Route, SharedState } from "front-end/lib/app/types";
import { immutable, component } from "front-end/lib/framework";
import * as api from "front-end/lib/http/api";
import { adt } from "shared/lib/types";
import { valid } from "shared/lib/validation";
import { InnerMsg, Msg, State } from "front-end/lib/pages/content/view";
import { ProgramType } from "front-end/lib/views/program-type";

export const GUIDE_AUDIENCE = {
  Vendor: "vendor-guide",
  Ministry: "ministry-guide"
} as const;
export type GuideAudience = typeof GUIDE_AUDIENCE[keyof typeof GUIDE_AUDIENCE];

export type RouteParams = {
  guideAudience: GuideAudience;
};

export function isGuideAudience(
  guideAudience?: string
): guideAudience is GuideAudience {
  return Object.values(GUIDE_AUDIENCE).includes(guideAudience as GuideAudience);
}

function programTypeToFirstProgramWord(programType: ProgramType): string {
  switch (programType) {
    case "cwu":
      return "code";
    case "swu":
      return "sprint";
    case "twu":
      return "team";
  }
}

function guideAudienceToProcurementArtifactType(
  guideAudience: GuideAudience
): string {
  switch (guideAudience) {
    case "ministry-guide":
      return "opportunity";
    case "vendor-guide":
      return "proposal";
  }
}

export const init: component.page.Init<
  RouteParams,
  SharedState,
  State,
  InnerMsg,
  Route
> = ({ routePath, routeParams }) => {
  const contentSlug = `${programTypeToFirstProgramWord(
    routePath.split("/")[1] as ProgramType
  )}-with-us-${guideAudienceToProcurementArtifactType(
    routeParams.guideAudience
  )}-guide`;

  return [
    valid(immutable({ routePath, content: null })),
    [
      api.content.readOne<Msg>()(contentSlug, (msg) =>
        adt("onContentResponse", msg)
      )
    ]
  ];
};
