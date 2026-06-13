export const metadata = {
  title: "World Cup Ticket — Onboarding",
  description: "Verify with World ID to create your Hedera ticket wallet",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body style={{ fontFamily: "system-ui, sans-serif", margin: 0, padding: "2rem", maxWidth: 640 }}>
        {children}
      </body>
    </html>
  );
}
