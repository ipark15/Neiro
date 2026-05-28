import { ScrollViewStyleReset } from 'expo-router/html';

// Web-only: configures the root HTML for every web page.
// Runs only in Node.js during static rendering — no DOM/browser APIs available here.
export default function Root({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no" />

        {/* iOS PWA: makes "Add to Home Screen" launch as a full-screen standalone app */}
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="Neiro" />
        <link rel="apple-touch-icon" href="/assets/icon.png" />

        <ScrollViewStyleReset />
      </head>
      <body>{children}</body>
    </html>
  );
}
