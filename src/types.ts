import { NostrEvent } from "nostr-tools";

export type JobContext = {
    request: NostrEvent;
    wasEncrypted: boolean;
    url: string;
  };