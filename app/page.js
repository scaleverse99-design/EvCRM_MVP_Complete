"use client"
// The consumer marketplace IS the homepage — render it directly at
// evcrm.in so the URL stays clean (no visible /showroom redirect). Imports
// the client component directly (not ./showroom/page, which is now a
// server wrapper exporting generateMetadata + JSON-LD for the /showroom
// route specifically — pulling that into this client-marked file would
// break the client/server boundary).
import ShowroomClient from "./showroom/ShowroomClient"

export default function HomePage() {
  return <ShowroomClient />
}
