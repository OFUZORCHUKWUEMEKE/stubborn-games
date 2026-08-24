import { NextResponse } from 'next/server'
import { resolveRoomRedirect } from '@/lib/rooms'

export const dynamic = 'force-dynamic'

/**
 * S1 (v2 rooms): the shareable link a bet's opener sends into their group
 * chat. Resolution logic lives in lib/rooms.ts (resolveRoomRedirect) so it's
 * unit-testable without mocking Next's request/response machinery — this
 * route is just a thin wrapper around it.
 */
export async function GET(request: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const result = resolveRoomRedirect(token)

  if (!result.found) {
    return NextResponse.json({ error: 'Room not found' }, { status: 404 })
  }

  return NextResponse.redirect(new URL(result.path, request.url), 307)
}
