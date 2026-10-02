import { createClient } from "genlayer-js";
import { CHAIN } from "./config";

let readClient: ReturnType<typeof createClient> | null = null;

/** Read-only client: talks to the StudioNet RPC directly, no wallet needed. */
export function getReadClient() {
  if (!readClient) readClient = createClient({ chain: CHAIN });
  return readClient;
}

/** Write client: signing goes through the injected wallet for `account`. */
export function getWriteClient(account: `0x${string}`) {
  return createClient({ chain: CHAIN, account });
}
