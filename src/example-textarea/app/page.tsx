"use client";

import { EmailThread } from "@/components/EmailThread";
import { EmailsProvider } from "@/lib/hooks/use-emails";
import { CopilotPopup } from "@copilotkit/react-ui";


export default function Home() {

  return (
    <div className="h-screen">

        <EmailsProvider>
          <EmailThread />
        </EmailsProvider>

        <CopilotPopup
          labels={{
            title: "Your Assistant",
            initial: "Hi! 👋 How can I assist you today?",
          }}
        />
    </div>
  );
}
