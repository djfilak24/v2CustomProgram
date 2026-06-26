import type React from "react"
import type { Metadata } from "next"
import { GeistMono } from "geist/font/mono"
import { Poppins } from "next/font/google"
import { Suspense } from "react"
import "./globals.css"

// NELSON brand font. The theme token already references "Poppins"; load it here
// so it actually applies (previously it fell back to a system sans).
const poppins = Poppins({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-poppins",
  display: "swap",
})

export const metadata: Metadata = {
  title: "NELSON Workplace Programming Tool",
  description: "Interactive tool for workplace design teams and real estate stakeholders",
  generator: "v0.app",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className={poppins.variable}>
      <body className={`font-sans ${GeistMono.variable}`}>
        <Suspense fallback={null}>{children}</Suspense>
      </body>
    </html>
  )
}
