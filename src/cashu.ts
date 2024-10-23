import { PaymentRequest, PaymentRequestTransportType } from "@cashu/cashu-ts";
import { getPublicKey, nip19 } from "nostr-tools";
import { NOSTR_PRIVATE_KEY, NOSTR_RELAYS } from "./env.js";
import { JobContext } from "./types.js";
import { publishStatusEvent } from "./index.js";

export const mintUrl = 'https://mint.minibits.cash/Bitcoin';

export async function publishPaymentRequiredEvent(context: JobContext
) {
  const amount = 1;
  const pr: PaymentRequest = new PaymentRequest(
    [
      {
        type: PaymentRequestTransportType.NOSTR,
        target: nip19.nprofileEncode({
          pubkey: getPublicKey(NOSTR_PRIVATE_KEY),

          relays: NOSTR_RELAYS,
        }),
        tags: [['n', '17']],
      },
    ],
    context.request.id, // reference to DVM request ID
    amount,
    'sat',
    [mintUrl],
    'Payment for Youtube Download DVM',
    true
  );

  const encodedPaymentReq = pr.toEncodedRequest();
  console.log(encodedPaymentReq);

  const additionalTags = [['amount', `${amount * 1000}`, encodedPaymentReq]]; // amount is in mstat
  await publishStatusEvent(context, 'payment-required', '', additionalTags);
}
