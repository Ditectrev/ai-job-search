import { getAdapter } from "@/lib/adapter";
import { errorResponse } from "@/lib/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const run = await getAdapter().getRun(id);
    if (!run) return Response.json({ error: "No run with that id." }, { status: 404 });
    return Response.json({ run });
  } catch (error) {
    return errorResponse(error);
  }
}
