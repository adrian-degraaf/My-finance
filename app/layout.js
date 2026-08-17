import './globals.css'

export const metadata = {
  title: 'Financial Tracker',
  description: 'Budget analysis and savings goal tracker',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
