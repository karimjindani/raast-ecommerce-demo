# Tapsys request and response evidence

Reviewed 1 October 2026. Source: user-supplied `Tapsys-Gatway-Curl.txt`, described by the user as actual Tapsys request/response payloads. These are supplied integration evidence, not independently executed tests. The raw file remains outside Git. Examples below replace credentials, payer data, merchant identifiers, QR content, and transaction identifiers with placeholders.

## Confirmed response mappings

All five supplied API responses use string `response_code: "00"` and `response_desc: "Success"`. This establishes a success example, not a complete response-code catalogue or HTTP status contract.

| Operation | Observed response fields | Application interpretation |
|---|---|---|
| Token | `data.token`, `data.expiry` | Server-only token; example expiry is time-only `20:33:42`, with no date, timezone, or lifetime definition. |
| Static QR | `info.qrString`, `info.qrImage`, `info.stan`, `info.rrn`, `info.merchantId`, `info.tillCode`, `info.rtpId: null` | Text and image representations are supplied; static QR remains outside checkout scope. |
| Dynamic QR | Same QR fields, with a non-null `info.rtpId` | Render QR from `info.qrString`; retain returned provider references. No returned expiry field is shown. Do not assume this `rtpId` substitutes for the title-fetch identifier. |
| Title fetch | `info.rtpId`, `info.stan`, `info.rrn`, `customerDetails.iban`, `customerDetails.accountTitle`, `customerDetails.memberId` | Store `info.rtpId` server-side and display the account title for confirmation. |
| RTP Now | `info.rrn`, `info.stan` | Initiation response only; no final payment outcome field appears. |

### Token response

```json
{
  "data": { "token": "<server-only-token>", "expiry": "20:33:42" },
  "response_code": "00",
  "response_desc": "Success"
}
```

Do not invent a timezone or derive an absolute expiry from this time-only sample. Token expiry/refresh semantics still need provider confirmation.

### Dynamic QR response

```json
{
  "info": {
    "stan": "<stan>",
    "rrn": "<rrn>",
    "qrString": "<sensitive-provider-qr-text>",
    "qrImage": "<base64-image-content>",
    "merchantId": "<merchant-id>",
    "tillCode": "<till-code>",
    "rtpId": "<provider-rtp-id>"
  },
  "response_code": "00",
  "response_desc": "Success"
}
```

The static QR response has the same observed field names but null `rtpId`. Both image strings have PNG-style base64 prefixes, but both fail strict base64 decoding as supplied; they cannot serve as complete image fixtures. QR strings themselves contain merchant/account information and must be treated as sensitive. Prefer encoding the complete provider `qrString` using a trusted QR encoder rather than relying on these sample images.

### Title-fetch response

```json
{
  "info": { "rtpId": "<title-fetch-rtp-id>", "stan": "<stan>", "rrn": "<rrn>" },
  "customerDetails": {
    "iban": "<payer-iban>",
    "accountTitle": "<payer-account-title>",
    "memberId": "<member-id>"
  },
  "response_code": "00",
  "response_desc": "Success"
}
```

Map `info.rtpId` to the subsequent request's `paymentDetails.rtpId`. The title-fetch response and RTP request in this file contain different identifier values: they do not demonstrate a single correlated end-to-end transaction. The linkage is user-confirmed; lifetime, one-time use and retry rules are still unresolved.

### RTP initiation response

```json
{
  "info": { "rrn": "<rrn>", "stan": "<stan>" },
  "response_code": "00",
  "response_desc": "Success"
}
```

## Callback examples

The file shows two distinct POST destinations on an illustrative callback host: `/paymentNotification` and `/notifyMerchant`. These are proposed merchant receiver routes in the sample, not endpoints to call on Tapsys. No callback authentication/signature headers are shown; absence from a sample is not proof authentication is unsupported or unnecessary. Registration, verification, retries and HTTP acknowledgement requirements remain unresolved.

### Payment notification

```json
{
  "transactionInfo": {
    "rrn": "<rrn>",
    "stan": "<stan>",
    "messageId": "<message-id>",
    "transactionDateTime": "2025-06-29T12:46:49",
    "referenceId": "<request-reference>",
    "billNumber": "<invoice-number>"
  },
  "merchantDetails": { "merchantId": "<merchant-id>", "tillCode": "<till-code>" },
  "paymentDetails": { "transactionAmount": 1000.0 },
  "senderInfo": { "iban": "<payer-iban>", "accountTitle": "<payer-account-title>" }
}
```

Observed receiver acknowledgement:

```json
{
  "responseCode": "00",
  "responseDesc": "SUCCESS",
  "info": {
    "stan": "<stan>",
    "rrn": "<rrn>",
    "merchantId": "<merchant-id>",
    "tillCode": "<till-code>",
    "referenceId": "<different-reference-in-source-acknowledgement>"
  }
}
```

There is no payment status or currency field in this request. Confirm whether receipt of a verified payment notification is authoritative evidence of payment success, including duplicate/reversal handling. The source acknowledgement has a different `referenceId` from the request; preserve this as a source discrepancy, not a rule to transform references. Confirm which value must be echoed.

### Notify merchant

```json
{
  "transactionInfo": {
    "rrn": "<rrn>",
    "stan": "<stan>",
    "messageId": "<message-id>",
    "transactionDateTime": "2025-06-29T12:46:49Z"
  },
  "merchantDetails": { "merchantId": "<merchant-id>", "tillCode": "<till-code>" },
  "paymentDetails": { "transactionAmount": 1000.0, "paymentStatus": "RTP Accepted" },
  "senderInfo": { "iban": "<payer-iban>", "accountTitle": "<payer-account-title>" }
}
```

Observed receiver acknowledgement:

```json
{
  "responseCode": "00",
  "responseDesc": "SUCCESS",
  "info": {
    "stan": "<stan>",
    "rrn": "<rrn>",
    "merchantId": "<merchant-id>",
    "tillCode": "<till-code>"
  }
}
```

`RTP Accepted` is the only supplied status. It must not be mapped to paid without provider confirmation. This callback lacks `referenceId`, `rtpId` and currency. Confirm whether STAN/RRN identify the originating attempt and whether `messageId` is unique across callback types; the samples reuse the same message ID across both types. Do not deduplicate different event types on `messageId` alone without a uniqueness guarantee. Callback acknowledgements use camelCase `responseCode`/`responseDesc`, unlike the API responses' snake_case fields. A receiver's `SUCCESS` acknowledgement means receipt/processing, not the financial outcome.

## Discrepancies and integration decisions

- **RTP version:** the new cURL uses `/api/v2/raast/rtpNow`; the older collection uses `/api/v1/raast/rtpNow`. Treat v2 as the newer supplied candidate, but verify the deployed contract before choosing a live path. Do not silently fall back or retry across versions.
- **Static request incomplete:** the supplied static QR command has an unterminated/incomplete JSON body and shell quoting. Keep the earlier collection as the complete request-shape reference; do not present this command as executable.
- **Transport:** several supplied commands use `-k`; production application code must retain TLS certificate verification. The RTP cURL omits an explicit JSON Content-Type; use the JSON header shown in the earlier collection, with provider confirmation if required.
- **Formatting:** callback commands contain literal `<br />` separators. They are formatted examples, not directly executable shell scripts.
- **Time and references:** one callback timestamp has `Z`, the other does not. QR requests use `referenceID` while the payment notification uses `referenceId`. Preserve exact wire field casing and verify timezone and correlation rules.
- **Evidence scope:** no HTTP status lines, error responses, failed-payment examples, callback verification material, or verified settlement evidence are supplied. The QR request dates and response embedded references also do not establish a single chronological execution trace.

No API calls were executed during this review. These examples narrow the parsing requirements but do not establish verified live payment completion.
