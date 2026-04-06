import Link from "next/link";

import "./globals.css";

export const metadata = {
  title: "Polymarket Monitor",
  description: "Local monitoring dashboard"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen">
        <header className="border-b border-slate-800 bg-[#070d1a]/90 sticky top-0 backdrop-blur z-20">
          <div className="max-w-[1480px] mx-auto px-4 py-2 flex items-center justify-between">
            <div className="text-[13px] font-semibold tracking-wide">POLYMARKET MONITOR</div>
            <nav className="flex gap-4 text-[12px]">
              <Link href="/" className="muted hover:text-white">Dashboard</Link>
              <Link href="/events" className="muted hover:text-white">Events</Link>
            </nav>
          </div>
        </header>
        {children}
      </body>
    </html>
  );
}
