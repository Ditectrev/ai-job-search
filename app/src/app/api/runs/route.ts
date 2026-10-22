import { getAdapter } from "@/lib/adapter";
import { errorResponse } from "@/lib/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const runs = await getAdapter().listRuns();
    return Response.json({ runs });
  } catch (error) {
    return errorResponse(error);
  }
}
