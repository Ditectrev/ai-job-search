import { AdapterError } from "@ai-job-search/adapter";

export function errorResponse(error: unknown): Response {
  if (error instanceof AdapterError) {
    return Response.json({ error: error.message }, { status: error.status });
  }
  console.error(error);
  return Response.json({ error: "The request could not be saved." }, { status: 500 });
}
