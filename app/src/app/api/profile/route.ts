import { getAdapter } from "@/lib/adapter";
import { errorResponse } from "@/lib/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const profile = await getAdapter().getProfile();
    return Response.json({ profile });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function PUT(request: Request) {
  try {
    const body: unknown = await request.json().catch(() => ({}));
    const profile = await getAdapter().saveProfile(body);
    return Response.json({ profile });
  } catch (error) {
    return errorResponse(error);
  }
}
