import Shell from "../../../components/layout/Shell"
import LeadDetailEngine from "./LeadDetailEngine"

// Sovereign Build Bridge: Allows dynamic IDs in a static export
export function generateStaticParams() {
  return [{ id: 'latest' }] 
}
export const dynamicParams = true

export default function LeadDetailPage() {
  return (
    <Shell title="Sovereign Lead Intel">
      <LeadDetailEngine />
    </Shell>
  )
}
