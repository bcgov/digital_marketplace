import { getAllDocumentsWithLinks } from "front-end/lib/pages/opportunity/team-with-us/lib/criteria-mapping";

// Generic types for the wrapper
export type GenericFormState = {
  [key: string]: any;
};

export type GenericDispatch = (msg: any) => void;

// Action function
export const listAvailableDocumentsAction = async (
  _state: GenericFormState,
  _dispatch: GenericDispatch
): Promise<string> => {
  try {
    const documents = getAllDocumentsWithLinks();
    console.log("Available documents:", documents);

    let response = "📋 **Available Team With Us Reference Documents:**\n\n";

    documents.forEach((doc, index) => {
      if (doc.url) {
        response += `${index + 1}. **[${doc.name}](${doc.url})**\n`;
        response += `   *Authority: ${doc.authority}*\n\n`;
      } else {
        response += `${index + 1}. **${doc.name}**\n`;
        response += `   *Authority: ${doc.authority}*\n`;
        response += `   *(Link not available)*\n\n`;
      }
    });

    response +=
      "\n💡 **Tip:** Click on any document title to access it directly. These documents contain the official guidelines, requirements, and procedures for Team With Us procurement.";

    return response;
  } catch (error: any) {
    console.error("❌ Error in listAvailableDocuments:", error);
    return `Error retrieving document list: ${error.message}`;
  }
};

// Export the complete useCopilotAction configuration
export const listAvailableDocumentsCopilotAction = {
  name: "listAvailableDocuments",
  description:
    "Get a list of all available Team With Us reference documents with clickable links. Use this when users ask for all documents, want to see what's available, or need a complete reference list.",
  parameters: [],
  action: listAvailableDocumentsAction
};
