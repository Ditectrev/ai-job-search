import { getAdapter } from "@/lib/adapter";
import { assertCanEnqueue } from "@/lib/extensions";
import { errorResponse } from "@/lib/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    assertCanEnqueue();
    const body: unknown = await request.json().catch(() => ({}));
    const run = await getAdapter().enqueueApply(body);
    return Response.json({ run }, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}
