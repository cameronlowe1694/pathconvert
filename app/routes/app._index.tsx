import { redirect, type LoaderFunctionArgs } from "@remix-run/node";
import { authenticate } from "../shopify.server";

/**
 * App Index Route
 * Redirects to the main dashboard
 */
export const loader = async ({ request }: LoaderFunctionArgs) => {
  await authenticate.admin(request);

  // Redirect to dashboard
  return redirect("/app/dashboard");
};

export default function Index() {
  return null;
}
