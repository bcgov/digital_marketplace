import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { CopilotKit } from "@copilotkit/react-core";

import "./globals.css";
import "@copilotkit/react-ui/styles.css";
import "@copilotkit/react-textarea/styles.css";


const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "CopilotKit Todos",
  description: "A simple todo app using CopilotKit",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (

    <html lang="en">

        <body className={inter.className}>
        <CopilotKit runtimeUrl="http://localhost:3000/copilotkit">
          {children}
          </CopilotKit>
        </body>

    </html>
  );
}
