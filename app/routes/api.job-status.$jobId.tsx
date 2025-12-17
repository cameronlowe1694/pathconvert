import { json, type LoaderFunctionArgs } from "@remix-run/node";
import { authenticate } from "~/shopify.server";
import { getJobStatus } from "~/services/jobQueue.server";

export async function loader({ request, params }: LoaderFunctionArgs) {
  await authenticate.admin(request);

  const { jobId } = params;

  if (!jobId) {
    return json({ error: "Job ID required" }, { status: 400 });
  }

  const job = await getJobStatus(jobId);

  if (!job) {
    return json({ error: "Job not found" }, { status: 404 });
  }

  return json({
    id: job.id,
    type: job.type,
    status: job.status,
    progressPercent: job.progressPercent,
    step: job.step,
    errorMessage: job.errorMessage,
    createdAt: job.createdAt,
    updatedAt: job.updatedAt,
  });
}
