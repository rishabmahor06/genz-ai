import "./globals.css";

export const metadata = {
  title: "Gen-Z || Ai Chatbot",
  description: "Gen-Z AI chatbot powered by Gemini",
  icons: { icon: "/genz-logo-white.png" },
};

export const viewport = { width: "device-width", initialScale: 1 };

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* apply the saved (or OS) theme before first paint to avoid a flash */}
        <script
          dangerouslySetInnerHTML={{
            __html: `try{var t=localStorage.getItem("genz-theme");if(!t)t=matchMedia("(prefers-color-scheme: light)").matches?"light":"dark";document.documentElement.dataset.theme=t}catch(e){document.documentElement.dataset.theme="dark"}`,
          }}
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
