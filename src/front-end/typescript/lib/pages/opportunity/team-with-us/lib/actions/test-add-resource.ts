import { adt } from "shared/lib/types";
import { TAB_NAMES } from "front-end/lib/pages/opportunity/team-with-us/lib/ai";

export type GenericFormState = {
  form?: any;
  [key: string]: any;
};

export type GenericDispatch = (msg: any) => void;

export const testAddResourceAction = async (
  state: GenericFormState,
  dispatch: GenericDispatch
): Promise<string> => {
  console.log("🧪 Testing basic resource addition");

  if (!state.form) {
    return "❌ Error: Form not available";
  }

  try {
    // Switch to Resource Details tab
    const switchTabMsg = adt(
      "form",
      adt("tabbedForm", adt("setActiveTab", TAB_NAMES.RESOURCE_DETAILS as any))
    );
    dispatch(switchTabMsg as any);
    await new Promise((resolve) => setTimeout(resolve, 100));

    // Add a new resource
    const addResourceMsg = adt("form", adt("resources", adt("addResource")));
    console.log("🔄 Dispatching test resource add:", addResourceMsg);
    dispatch(addResourceMsg as any);
    await new Promise((resolve) => setTimeout(resolve, 200));

    const resources = state.form?.resources?.resources || [];
    console.log("📋 Resources after test add:", resources.length);

    return `✅ Test resource addition completed! Total resources: ${resources.length}`;
  } catch (error: any) {
    console.error("❌ Test resource addition failed:", error);
    return `❌ Test failed: ${error.message}`;
  }
};

export const testAddResourceCopilotAction = {
  name: "testAddResource",
  description:
    "Simple test to add a blank resource without any parameters. Use this to test if basic resource addition is working.",
  parameters: [],
  action: testAddResourceAction
};
