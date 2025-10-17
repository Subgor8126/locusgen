import type { Metadata } from "next";
import { Rubik } from "next/font/google";
import "./globals.css";
import { ReduxProvider } from "../store/Provider";
import { AuthContextProvider } from "../contexts/AuthContext";

const rubik = Rubik({
  variable: "--font-rubik",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "LocusGen",
  description: "Create immersive 3D scenes from natural language descriptions using AI",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body
        className={`${rubik.variable} font-rubik antialiased text-white`}
        style={{ backgroundColor: '#111112' }}
      >
        <AuthContextProvider>
          <ReduxProvider>
            {children}
          </ReduxProvider>
        </AuthContextProvider>
      </body>
    </html>
  );
}
