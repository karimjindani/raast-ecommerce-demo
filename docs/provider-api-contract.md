# Tapsys provider API contract inventory

Status: unversioned reference, updated 1 October 2026; static inspection only. No provider request was executed. See [supplied request/response evidence](provider-payload-evidence.md) for sanitized payloads and discrepancies.

## Evidence and boundaries

Source: user-supplied `Tapsys DCNSP Prod.postman_collection.json`, collection name `Tapsys DCNSP Prod`. The original export is deliberately excluded from this repository because it contains credentials and customer data.

- **Collection-confirmed:** five POST requests, request fields, URLs, and headers below.
- **User-confirmed:** title fetch returns the `rtpId` used by RTP Now.
- **Supplied payload evidence:** `Tapsys-Gatway-Curl.txt` now establishes example response field paths and two callback shapes. These are user-supplied actual payloads, not independently executed tests. The original collection itself still has no saved responses or request test scripts.
- **Unverified:** complete schemas, requiredness, validation rules, error catalogue, callback authentication, final-status semantics, and lifecycle guarantees.
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

No Authorization header is present in this request. The supplied response places the token at `data.token` and a time-only expiry at `data.expiry`. Expiry interpretation, scope, refresh, and error handling still need confirmation. Keep credentials and tokens server-side. Token caching is an optimization; correctness must not depend on a warm function instance.

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

The example includes an amount and transaction references despite being named static QR. Reusability, embedded amount semantics and field requiredness remain undocumented. The supplied response includes `info.qrString` and `info.qrImage`, with `info.rtpId` null; the new static cURL request is incomplete and does not replace this request-shape reference. Empty bill fields are observed values, not proof they are optional. Static QR is documented for completeness and is not included in the planned demo checkout.

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

The newer supplied response contains `info.qrString`, `info.qrImage`, echoed merchant/till and transaction references, and non-null `info.rtpId`. Normalize `info.qrString` using a trusted QR encoder; the supplied image appears abbreviated. No returned expiry field is shown. QR generation is not payment confirmation.

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

This request supplies the payer IBAN and member identifier. The supplied response confirms the display title at `customerDetails.accountTitle` and the identifier at `info.rtpId`. **Map `info.rtpId` to the next request’s `paymentDetails.rtpId`.** The user confirms this linkage; the supplied example values differ across the two operations, so they are not one correlated execution trace.

Retain the returned identifier in a server-side context bound to browser session, amount, currency, and payment attempt. The browser receives the display title and an opaque context ID, never the provider identifier. Reject an otherwise successful response missing the required identifier; no RTP submission can follow it.

Confirm the member directory, identifier format, account-title semantics, context validity, and whether `terminalId` corresponds to QR `tillCode`. Matching sample values do not establish interchangeability.

## 5. RTP Now

`POST /api/v1/raast/rtpNow`

This is the **v1 path in the original collection**. The newer supplied cURL uses `POST /api/v2/raast/rtpNow`. Confirm the supported live version; do not silently retry between versions.

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

The request has no IBAN: use the stored identifier from title fetch to connect the steps. The supplied response has `info.rrn`, `info.stan`, `response_code: "00"` and `response_desc: "Success"`. Its precise initiation semantics require provider confirmation; it must not be mapped directly to paid.

## Callback contract — supplied examples, verification outstanding

The newer file provides two POST callback shapes: `/paymentNotification` and `/notifyMerchant`, documented with sanitized acknowledgements in [payload evidence](provider-payload-evidence.md#callback-examples). Payment notification carries references and amount without an explicit status; notify merchant carries `paymentDetails.paymentStatus: "RTP Accepted"`. Neither example establishes failed-payment semantics or authenticated final success.

The proposed application routes are `/api/webhooks/tapsys/payment-notification` and `/api/webhooks/tapsys/notify-merchant`, registered with Tapsys once routing requirements are confirmed. They share verification and durable processing logic but retain distinct event types. The sample callback host is illustrative, not a confirmed deployment URL.

Acknowledgements use `responseCode`, `responseDesc` and an `info` object; API responses use `response_code` and `response_desc`. The payment-notification acknowledgement has a mismatched source reference. Confirm echo requirements, HTTP status, retry policy and authentication before live use. Do not invent an HMAC scheme or assume callbacks are unauthenticated simply because no signature header is shown.

Obtain provider-supported verification and test vectors. Unverified callbacks cannot authorize live outcomes. After verification, correlate using confirmed references and merchant identity, validate amount and currency wherever supplied, then atomically persist before acknowledging. Neither callback sample supplies currency; do not claim an observed currency check.

## Provider clarification checklist

| ID | Required evidence | Effect until resolved |
|---|---|---|
| P01 | Success response examples are supplied for all five APIs; obtain error examples, HTTP statuses, requiredness and a complete code catalogue. | Happy-path field locations are evidenced; live parsing/error handling remains unverified. |
| P02 | `data.token` and time-only `data.expiry` are supplied; confirm expiry date/timezone, lifetime, refresh and scope. | Safe token expiry handling remains unresolved. |
| P03 | `info.qrString`/`info.qrImage` and dynamic `info.rtpId` are supplied; confirm complete image validity, expiry constraints, currency casing and version headers. | QR text mapping is established; live rendering/expiry still requires validation. |
| P04 | Two callback payload shapes supplied; obtain registration, authentication, raw-body rules, rotation and replay controls. | Live completion disabled until verification is defined. |
| P05 | Confirm payment-notification finality, all notify-merchant status meanings, STAN/RRN correlation, messageId uniqueness, HTTP acknowledgement/retry policy and mismatched reference echo. | `RTP Accepted` and receiver `SUCCESS` do not establish paid; no failed-payment sample supplied. |
| P06 | `customerDetails.accountTitle` and `info.rtpId` paths supplied; confirm identifier expiry, single-use and retry semantics. | Field mapping resolved; lifecycle still blocks verified live RTP. |
| P07 | Confirm `AME`, location, loyalty and label semantics/requiredness/source, member directory, and RTP v1 versus v2 discrepancy. | Do not invent ancillary fields or silently retry between API versions. |
| P08 | Amount units/precision, timezone, timestamp format, STAN/RRN/reference lengths and uniqueness | Conversion and reference generation cannot be finalized. |
| P09 | Provider idempotency, safe retries, status enquiry or reconciliation mechanism | Unknown outcomes require manual/provider reconciliation. |
| P10 | The supplied deployment reference image states that the partner must share a fixed public outbound IP with Tapsys for Cloudflare allowlisting; see the [merchant connectivity model](software-design.md#merchant-connectivity-and-deployment-model). Confirm approved environment and merchant/terminal provisioning, verify the Azure VM's fixed public outbound IP, register the IP with Tapsys, and test reachability. | The stated fixed-IP requirement is documented; actual IP provisioning, allowlist registration, and connectivity testing remain outstanding. No production connectivity or test authorization assumed. |

These gaps do not block this design baseline. They block claiming verified live payment completion. No refunds, reversals API, settlement reporting, or status enquiry API is supplied in this collection.
