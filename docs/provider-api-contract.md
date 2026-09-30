# Tapsys provider API contract inventory

Status: initial unversioned reference; static inspection only. No provider request was executed.

## Evidence and boundaries

Source: user-supplied `Tapsys DCNSP Prod.postman_collection.json`, collection name `Tapsys DCNSP Prod`. The original export is deliberately excluded from this repository because it contains credentials and customer data.

- **Collection-confirmed:** five POST requests, request fields, URLs, and headers below.
- **User-confirmed:** title fetch returns the `rtpId` used by RTP Now.
- **Unverified:** response schemas, response field paths, requiredness, validation rules, error codes, and callback contract. There are no saved responses or request test scripts in the source collection.
- **Application proposals:** see [software design](software-design.md); internal endpoints are not Tapsys endpoints.

Base origin in the supplied collection: `https://api-gateway.tapsys.net`. Its production label is not evidence of sandbox access. All examples below use placeholders or synthetic transaction references; never execute them unchanged.

All requests use `Content-Type: application/json`. Payment endpoints use `Authorization: Bearer <access-token>`. Only static QR explicitly includes `X-API-VERSION: 2` in the collection. Preserve observed differences until the provider confirms normalization is safe.

## 1. Obtain token

`POST /api/v2/getToken`

```json
{
  "aggregatorCode": "<aggregator-code>",
  "clientSecret": "<client-secret>"
}
```

No Authorization header is present in this request. The returned token field, token type, expiry, scope, refresh, and error handling need confirmation. Keep credentials and tokens server-side. Token caching is an optimization; correctness must not depend on a warm function instance.

## 2. Static QR

`POST /api/v2/qr/sqrc`

Additional header: `X-API-VERSION: 2`.

```json
{
  "merchantDetails": {
    "merchantId": "<merchant-id>",
    "tillCode": "<till-code>"
  },
  "paymentDetails": { "amount": 10, "currency": "PKR" },
  "transactionInfo": {
    "stan": "000001",
    "rrn": "000000000001",
    "transactionDateTime": "<provider-formatted-timestamp>",
    "referenceID": "<unique-reference>"
  },
  "billDetails": {
    "billNumber": "",
    "dueDate": "",
    "amountAfterDueDate": ""
  }
}
```

The example includes an amount and transaction references despite being named static QR. Reusability, embedded amount semantics, field requiredness, and QR response format are undocumented. Empty bill fields are observed values, not proof they are optional. Static QR is documented for completeness and is not included in the planned demo checkout.

## 3. Dynamic QR

`POST /api/v2/qr/dqrc`

```json
{
  "merchantDetails": {
    "merchantId": "<merchant-id>",
    "tillCode": "<till-code>"
  },
  "paymentDetails": { "amount": 10, "currency": "pkr" },
  "transactionInfo": {
    "stan": "000002",
    "rrn": "000000000002",
    "transactionDateTime": "<provider-formatted-timestamp>",
    "transactionExpiryDateTime": "<provider-formatted-expiry>",
    "referenceID": "<unique-reference>"
  }
}
```

The sample uses lowercase `pkr`, includes an expiry, and omits both bill details and the explicit version header. The demo will request a 120-second window; provider support, timezone, accepted timestamp precision, and returned effective expiry must be verified. The source timestamps have no timezone offset.

The response might contain QR text, image data, or a URL; none is established by this collection. The adapter must normalize a verified response to application QR display data. QR generation is not payment confirmation.

## 4. Title fetch for RTP

`POST /api/v2/raast/titleFetch`

```json
{
  "merchantDetails": {
    "merchantId": "<merchant-id>",
    "terminalId": "<terminal-id>"
  },
  "customerDetails": {
    "memberId": "<provider-member-id>",
    "iban": "<customer-iban>"
  },
  "info": { "rrn": "000000000003", "stan": "000003" }
}
```

This request supplies the payer IBAN and member identifier. The account title is expected for payer confirmation; its response schema requires verification. **The user confirms that this response supplies `rtpId` for the next request.** Do not guess its nesting or infer that the top-level field must be named exactly `rtpId`.

Retain the returned identifier in a server-side context bound to browser session, amount, currency, and payment attempt. The browser receives the display title and an opaque context ID, never the provider identifier. Reject an otherwise successful response missing the required identifier; no RTP submission can follow it.

Confirm the member directory, identifier format, account-title semantics, context validity, and whether `terminalId` corresponds to QR `tillCode`. Matching sample values do not establish interchangeability.

## 5. RTP Now

`POST /api/v1/raast/rtpNow`

This endpoint is **v1**, not v2.

```json
{
  "merchantDetails": {
    "merchantId": "<merchant-id>",
    "terminalId": "<terminal-id>"
  },
  "paymentDetails": {
    "instructedAmount": 10,
    "rtpId": "<identifier-from-title-fetch>"
  },
  "geoLocation": { "lat": "<latitude>", "longt": "<longitude>" },
  "payerDetails": {
    "additionalRequiredDetails": "AME",
    "identificationDetails": {
      "loyaltyNo": "<loyalty-number>",
      "customerLabel": "<customer-label>"
    }
  },
  "info": { "stan": "000004", "rrn": "000000000004" }
}
```

`instructedAmount` is numeric; no currency field appears. Coordinates are strings, and the longitude key is exactly `longt`. `AME` is an observed example with unknown meaning. The requiredness and origin of location, loyalty number, and customer label are unresolved. Never fabricate these values or automatically collect device location without an established requirement and appropriate user interaction.

The request has no IBAN: use the stored identifier from title fetch to connect the steps. Whether RTP submission acknowledgement means accepted, delivered, or another intermediate state requires provider confirmation; it must not be mapped directly to paid.

## Callback contract — not supplied

The application proposes `POST /api/webhooks/tapsys`, but the collection contains no callback request, response, authentication method, registration process, or status query endpoint. Do not invent an HMAC header, event schema, status mapping, or provider acknowledgement code.

Obtain a provider-supported authentication mechanism and test vectors. A callback cannot authorize an outcome until verified. Verification failure or unavailable verification must never update a live transaction. After verification, correlate using provider-confirmed references, check merchant identity and amount/currency where supplied, and atomically persist the event and transition before acknowledging receipt.

## Provider clarification checklist

| ID | Required evidence | Effect until resolved |
|---|---|---|
| P01 | Success/error examples for each endpoint, HTTP and business codes | Live adapters cannot reliably parse responses. |
| P02 | Token field, expiry, refresh, credential scope | Live authentication remains unverified. |
| P03 | QR representation, expiry constraints, currency casing, version header rules | Live QR rendering and expiry cannot be certified. |
| P04 | Callback registration, authentication, raw-body rules, key rotation and replay controls | Live completion disabled. |
| P05 | Callback identifiers, amount/currency fields, status meanings, duplicates, ordering, acknowledgement and retry policy | No authoritative live status mapping. |
| P06 | Title-fetch account-title and `rtpId` paths; identifier expiry, single-use and retry semantics | Live RTP disabled; linkage itself is user-confirmed. |
| P07 | `AME`, location, loyalty and label meaning, requiredness and source; member directory | Do not submit invented RTP fields. |
| P08 | Amount units/precision, timezone, timestamp format, STAN/RRN/reference lengths and uniqueness | Conversion and reference generation cannot be finalized. |
| P09 | Provider idempotency, safe retries, status enquiry or reconciliation mechanism | Unknown outcomes require manual/provider reconciliation. |
| P10 | The supplied deployment reference image states that the partner must share a fixed public outbound IP with Tapsys for Cloudflare allowlisting; see the [merchant connectivity model](software-design.md#merchant-connectivity-and-deployment-model). Confirm approved environment and merchant/terminal provisioning, provision fixed outbound IP connectivity for Vercel, register the IP with Tapsys, and test reachability. | The stated fixed-IP requirement is documented; actual IP provisioning, allowlist registration, and connectivity testing remain outstanding. No production connectivity or test authorization assumed. |

These gaps do not block this design baseline. They block claiming verified live payment completion. No refunds, reversals API, settlement reporting, or status enquiry API is supplied in this collection.
