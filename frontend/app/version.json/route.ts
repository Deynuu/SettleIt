import { BUILD_COMMIT, BUILD_TIME, CHAIN_ID, CONTRACT_ADDRESS, REPO_URL } from "@/lib/genlayer/config";

// Static build provenance. Matches the Git commit Vercel built and the address the app talks to.
export const dynamic = "force-static";

export function GET() {
  return Response.json({
    app: "settleit-frontend",
    commit: BUILD_COMMIT,
    builtAt: BUILD_TIME,
    chainId: CHAIN_ID,
    network: "GenLayer StudioNet",
    contractAddress: CONTRACT_ADDRESS,
    repository: REPO_URL,
  });
}
