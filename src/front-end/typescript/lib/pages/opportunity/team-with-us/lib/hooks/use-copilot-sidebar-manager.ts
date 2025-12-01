import { useCopilotChat } from "@copilotkit/react-core";
import { Role, TextMessage } from "@copilotkit/runtime-client-gql";
import { TWUOpportunity } from "shared/lib/resources/opportunity/team-with-us";
import { UNIFIED_SYSTEM_INSTRUCTIONS } from "../ai";

export type SidebarContext = "create" | "edit";

interface UseCopilotSidebarManagerProps {
  context: SidebarContext;
  opportunity?: TWUOpportunity | null;
}

export function useCopilotSidebarManager({
  context,
  opportunity
}: UseCopilotSidebarManagerProps) {
  const { appendMessage, reset, visibleMessages } = useCopilotChat();

  const handleSidebarOpen = (isOpen: boolean) => {
    console.log("handleSidebarOpen(), sidebar open:", isOpen);

    if (!isOpen) return; // Only handle when opening

    if (context === "edit") {
      // For edit page, check if opportunity exists
      if (!opportunity) {
        console.log("No opportunity available for sidebar setup");
        return;
      }

      console.log("setting up chat for opportunity:", opportunity);

      // Clear chat history first for a fresh conversation
      reset();

      // Append system message with timeout to ensure reset is complete
      setTimeout(() => {
        console.log("appending system message for edit");
        appendMessage(
          new TextMessage({
            content: UNIFIED_SYSTEM_INSTRUCTIONS,
            role: Role.System,
            id: Math.random().toString()
          })
        );
      }, 200); // timeout required to ensure copilotreadable and actions are set up
    } else if (context === "create") {
      // For create page, check if no messages exist
      if (!visibleMessages || visibleMessages.length > 0) {
        console.log(
          "Messages already exist, skipping system message for create"
        );
        return;
      }

      console.log("appending system message for create");
      appendMessage(
        new TextMessage({
          content: UNIFIED_SYSTEM_INSTRUCTIONS,
          role: Role.System,
          id: "action-instructions-create"
        })
      );
    }
  };

  return {
    onSidebarOpen: handleSidebarOpen
  };
}
