import Shell from "../../../components/layout/Shell"
import PulseDetailEngine from "./PulseDetailEngine"

// Sovereign Build Bridge: Allows dynamic slugs in a static export
export function generateStaticParams() {
  return [{ slug: 'latest' }] 
}
export const dynamicParams = true

export default function PulseDetailPage() {
  return (
    <Shell title="Sovereign Pulse Intelligence">
      <PulseDetailEngine />
    </Shell>
  )
}
