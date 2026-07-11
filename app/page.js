"use client"
// The consumer marketplace IS the homepage — render it directly at
// evcrm.in so the URL stays clean (no visible /showroom redirect).
import ShowroomPage from "./showroom/page"

export default function HomePage() {
  return <ShowroomPage />
}
