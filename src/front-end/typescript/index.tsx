// import "../sass/index.scss";
import "./styles/tailwind.css";

import React, { useRef, useEffect } from "react";
import ReactDOM from "react-dom/client";
// import { DndProvider } from "react-dnd";
// import { HTML5Backend } from "react-dnd-html5-backend";
import { Plate } from "@udecode/plate/react";
import { Editor, EditorContainer } from "./lib/components/platejs/editor";
import { useCreateEditor } from "./lib/components/platejs/plugins/use-create-editor";
import { editorPlugins } from "./lib/components/platejs/plugins/editor-plugins";
import { createFixedToolbarPlugin } from "./lib/components/platejs/plugins/fixed-toolbar-plugin";

function App() {
  // const [content, setContent] = useState("");
  const disabled = false;
  const placeholder = "Enter text...";

  const editor = useCreateEditor(
    {
      plugins: [...editorPlugins, createFixedToolbarPlugin("full")],
      readOnly: disabled
    },
    [disabled]
  );

  // Debounce ref for handling editor changes
  const updateTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Handle editor content changes with debouncing
  // const handleEditorChange = useCallback(
  //   (_value: any) => {
  //     // Don't handle changes if editor is disabled/readonly
  //     if (disabled || !editor) return;

  //     // Clear existing timeout
  //     if (updateTimeoutRef.current) {
  //       clearTimeout(updateTimeoutRef.current);
  //     }

  //     // Set new timeout for debounced update
  //     updateTimeoutRef.current = setTimeout(() => {
  //       try {
  //         // Serialize editor content to markdown
  //         const markdownOutput = editor.api.markdown.serialize();
  //         setContent(markdownOutput);
  //         console.log("Editor content:", markdownOutput);
  //       } catch (error) {
  //         console.warn(
  //           "Failed to serialize editor content to markdown:",
  //           error
  //         );
  //       }
  //     }, 300); // 300ms debounce
  //   },
  //   [editor, disabled]
  // );

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (updateTimeoutRef.current) {
        clearTimeout(updateTimeoutRef.current);
      }
    };
  }, []);

  return (
    <div style={{ padding: "20px" }}>
      <h1>Plate Editor Demo</h1>
      <div
        style={{
          border: "1px solid #cfd4da",
          borderRadius: "8px",
          padding: "12px",
          marginBottom: "20px"
        }}>
        {/* <DndProvider backend={HTML5Backend}> */}
        <Plate
          editor={editor}
          // onChange={disabled ? undefined : handleEditorChange}
          readOnly={disabled}>
          <EditorContainer variant="demo">
            {/* className="h-72 overflow-y-auto" */}
            <Editor placeholder={placeholder} disabled={disabled} />
          </EditorContainer>
        </Plate>
        {/* </DndProvider> */}
      </div>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
