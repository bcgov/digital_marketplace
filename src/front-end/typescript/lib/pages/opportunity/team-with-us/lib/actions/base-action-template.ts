import { adt } from "shared/lib/types";

// Unified context interface for all actions
export interface UnifiedActionContext {
  workflow: "create" | "review";
  isEditing?: boolean;
  form?: any;
  opportunity?: any;
  [key: string]: any;
}

// Generic types for all unified actions
export type GenericFormState = UnifiedActionContext;
export type GenericDispatch = (msg: any) => void;

// Workflow detection utility
export function detectWorkflowType(state: any): "create" | "review" {
  // Auto-detect based on state structure and available properties
  if (state.isEditing !== undefined) {
    return "review";
  }
  if (
    state.opportunity &&
    state.opportunity.status === "draft" &&
    !state.isEditing
  ) {
    return "create";
  }
  return "create"; // Default to create workflow
}

// Enhanced error handling
export function createActionError(
  title: string,
  message: string,
  suggestion?: string
): string {
  const suggestionText = suggestion
    ? `\n\n💡 **Suggestion:** ${suggestion}`
    : "";
  return `❌ **${title}**\n\n${message}${suggestionText}`;
}

// Success response formatting
export function createActionSuccess(
  title: string,
  message: string,
  details?: string
): string {
  const detailsText = details ? `\n\n📝 **Details:** ${details}` : "";
  return `✅ **${title}**\n\n${message}${detailsText}`;
}

// Common form field update helper
export function updateFormField(
  state: GenericFormState,
  dispatch: GenericDispatch,
  fieldPath: string[],
  value: any,
  _workflow: "create" | "review"
): boolean {
  try {
    if (!state.form) {
      return false;
    }

    // Build the ADT message path
    const adtPath = fieldPath.reduce((acc, field, index) => {
      if (index === 0) {
        return adt(field as any, acc);
      }
      return adt(field as any, acc);
    }, value);

    // Create the form message
    const formMsg = adt("form", adtPath);

    // Dispatch the message
    dispatch(formMsg);
    return true;
  } catch (error) {
    console.error(`Error updating form field ${fieldPath.join(".")}:`, error);
    return false;
  }
}

// Common validation helpers
export function validateFormExists(
  state: GenericFormState,
  actionName: string
): string | null {
  if (!state.form) {
    return createActionError(
      "Form Not Available",
      `The form is not available for the ${actionName} action.`,
      "Please ensure you are on the correct page and try refreshing if the issue persists."
    );
  }
  return null;
}

export function validateEditMode(
  state: GenericFormState,
  actionName: string
): string | null {
  if (state.workflow === "review" && !state.isEditing) {
    return createActionError(
      "Edit Mode Required",
      `You must be in edit mode to use the ${actionName} action.`,
      "Click the 'Edit' button to enter editing mode, then try again."
    );
  }
  return null;
}

// Common action result formatting
export function formatActionResult(
  success: boolean,
  title: string,
  message: string,
  details?: string
): string {
  return success
    ? createActionSuccess(title, message, details)
    : createActionError(title, message, details);
}
