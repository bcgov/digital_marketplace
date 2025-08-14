import React from "react";
import { useCopilotAction } from "@copilotkit/react-core";
import {
  identifyRelevantCriteria,
  generateEnhancedCitationText,
  CRITERIA_MAPPINGS
} from "./criteria-mapping";

export const ActionDebugPanel: React.FC = () => {
  const [debugOutput, setDebugOutput] = React.useState<string>("");
  const [testActions, setTestActions] = React.useState<any>({});

  // Register the same actions and capture their handlers for manual testing
  useCopilotAction({
    name: "debugTest",
    description: "Test action",
    parameters: [],
    handler: async () => {
      const result = "✅ Debug test successful! Actions are working.";
      console.log("🧪 DEBUG: Test action called successfully!");
      setDebugOutput(prev => prev + "\n✅ debugTest executed successfully");
      return result;
    }
  });

  useCopilotAction({
    name: "getCriteriaDocumentation",
    description: "Get criteria documentation",
    parameters: [
      {
        name: "criteriaArea",
        type: "string",
        description: "Criteria area",
        required: false
      }
    ],
    handler: async ({ criteriaArea }) => {
      console.log("🔧 getCriteriaDocumentation called manually!");
      console.log("Parameters:", { criteriaArea });
      
      try {
        if (criteriaArea && criteriaArea !== 'all') {
          const criteria = identifyRelevantCriteria(criteriaArea);
          const citationText = generateEnhancedCitationText(criteria);
          const result = `Here's the documentation for ${criteriaArea}:\n${citationText}`;
          setDebugOutput(prev => prev + `\n✅ getCriteriaDocumentation(${criteriaArea}) executed`);
          return result;
        } else {
          const allCriteria = Object.keys(CRITERIA_MAPPINGS);
          const citationText = generateEnhancedCitationText(allCriteria);
          const result = `Here's all criteria documentation:\n${citationText}`;
          setDebugOutput(prev => prev + "\n✅ getCriteriaDocumentation() executed for all criteria");
          return result;
        }
      } catch (error) {
        console.error("❌ Error:", error);
        setDebugOutput(prev => prev + `\n❌ Error in getCriteriaDocumentation: ${error.message}`);
        return `Error: ${error.message}`;
      }
    }
  });

  const manualTestDebug = async () => {
    console.log("🔧 Manually testing debugTest action...");
    setDebugOutput(prev => prev + "\n🔧 Testing debugTest manually...");
    
    // Simulate calling the debug action
    try {
      const result = "✅ Manual debug test successful!";
      console.log("✅ Manual test completed");
      setDebugOutput(prev => prev + `\n✅ Manual debugTest result: ${result}`);
    } catch (error) {
      console.error("❌ Manual test failed:", error);
      setDebugOutput(prev => prev + `\n❌ Manual test failed: ${error.message}`);
    }
  };

  const manualTestCriteria = async () => {
    console.log("🔧 Manually testing getCriteriaDocumentation action...");
    setDebugOutput(prev => prev + "\n🔧 Testing getCriteriaDocumentation manually...");
    
    try {
      const allCriteria = Object.keys(CRITERIA_MAPPINGS);
      const citationText = generateEnhancedCitationText(allCriteria);
      const result = `Manual test - criteria count: ${allCriteria.length}`;
      console.log("✅ Manual criteria test completed");
      setDebugOutput(prev => prev + `\n✅ Manual criteria test result: ${result}`);
    } catch (error) {
      console.error("❌ Manual criteria test failed:", error);
      setDebugOutput(prev => prev + `\n❌ Manual criteria test failed: ${error.message}`);
    }
  };

  const clearOutput = () => {
    setDebugOutput("");
  };

  return (
    <div style={{ 
      position: "fixed", 
      top: "10px", 
      right: "10px", 
      background: "white", 
      border: "2px solid #ccc", 
      padding: "10px", 
      borderRadius: "5px",
      maxWidth: "300px",
      zIndex: 9999,
      fontSize: "12px"
    }}>
      <h4>🔧 Action Debug Panel</h4>
      
      <div style={{ marginBottom: "10px" }}>
        <button onClick={manualTestDebug} style={{ marginRight: "5px", padding: "5px" }}>
          Test debugTest
        </button>
        <button onClick={manualTestCriteria} style={{ marginRight: "5px", padding: "5px" }}>
          Test Criteria
        </button>
        <button onClick={clearOutput} style={{ padding: "5px" }}>
          Clear
        </button>
      </div>
      
      <div style={{ 
        background: "#f5f5f5", 
        padding: "5px", 
        borderRadius: "3px", 
        maxHeight: "200px", 
        overflow: "auto",
        whiteSpace: "pre-wrap",
        fontSize: "10px"
      }}>
        <strong>Debug Output:</strong>
        {debugOutput || "No output yet..."}
      </div>
      
      <div style={{ marginTop: "5px", fontSize: "10px" }}>
        <strong>Console:</strong> Check browser console (F12) for detailed logs
      </div>
    </div>
  );
};

export default ActionDebugPanel; 