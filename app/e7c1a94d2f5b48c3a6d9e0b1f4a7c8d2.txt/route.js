import { INDEXNOW_KEY } from "../../lib/indexnow"

// IndexNow key-verification file — the protocol requires the key be
// served as plain text at https://evcrm.in/{key}.txt so the search
// engines can confirm we own the host we're pinging for. The folder name
// of this route MUST stay equal to `${INDEXNOW_KEY}.txt` (lib/indexnow.js).
export const dynamic = "force-static"

export async function GET() {
  return new Response(INDEXNOW_KEY, {
    headers: { "Content-Type": "text/plain" },
  })
}
