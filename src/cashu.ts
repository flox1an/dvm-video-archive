import { getEncodedToken, getEncodedTokenV4, PaymentRequest, PaymentRequestTransportType, Token } from "@cashu/cashu-ts";
import { getPublicKey, nip19 } from "nostr-tools";
import { CASHU_MINT_URL, NOSTR_PRIVATE_KEY, NOSTR_RELAYS } from "./env.js";
import { JobContext } from "./types.js";
import { publishStatusEvent } from "./index.js";


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
    [CASHU_MINT_URL],
    'Payment for Youtube Download DVM',
    true
  );

  const encodedPaymentReq = pr.toEncodedRequest();
  console.log(encodedPaymentReq);

  const additionalTags = [['amount', `${amount * 1000}`, encodedPaymentReq]]; // amount is in mstat
  await publishStatusEvent(context, 'payment-required', '', additionalTags);
}

export function encodeToken(cashuToken: Token ): string  {
  try {
    return getEncodedTokenV4(cashuToken);
  } catch (e) {
    // deprecated base64 keyset fallback V3 (use by minibits)
    return getEncodedToken(cashuToken);
  }
}