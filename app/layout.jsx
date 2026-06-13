import Nav from "./components/Nav.jsx";

export const metadata = {
  title: "World Cup Ticket",
  description: "Anti-scalp NFT tickets on Hedera with World ID",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body style={{ fontFamily: "system-ui, sans-serif", margin: 0, padding: "2rem", maxWidth: 800 }}>
        <Nav />
        {children}
      </body>
    </html>
  );
}
