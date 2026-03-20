export const metadata = {
  title: "Ev.CRM — EV Dealer Sales OS",
  description: "India's first sales platform built for EV dealers",
  icons: {
    icon: "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'><rect width='32' height='32' rx='8' fill='%23F9FAFB'/><text y='23' x='3' font-size='18' font-weight='900' fill='%23059669' font-family='Georgia,serif'>E</text></svg>"
  }
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1"/>
      </head>
      <body style={{ margin:0 }}>{children}</body>
    </html>
  )
}
