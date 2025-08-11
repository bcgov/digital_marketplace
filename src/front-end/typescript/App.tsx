import { EditorContainer, Editor } from '@/components/ui/editor';
import { EditorKit } from '@/components/editor/editor-kit';
import { Plate, usePlateEditor } from 'platejs/react';
import React from 'react';




export default function App() {
  const editor = usePlateEditor({
    plugins: EditorKit,
    // value: DEMO_VALUES[id],
  });


  return (
    <>
    <div>marketplace test</div>
    <Plate editor={editor}>
      <EditorContainer>
        <Editor />
      </EditorContainer>
    </Plate>
    </>
  );
}
