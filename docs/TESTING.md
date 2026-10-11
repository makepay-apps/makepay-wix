# Validation record

Recorded 2026-10-11. Candidate release: 1.0.0-rc.1.

## Automated

`npm ci && npm test && npm run build` runs 14 tests against the actual backend source with Wix SDK adapters and a mocked MakePay API. Coverage includes Wix PSP minor units, USD/EUR preservation and JPY/KWD minor units, concurrent checkout reservation, link reuse, raw HMAC/timestamp checks, mismatched references, intermediate/underpaid statuses, original PSP completion, duplicate delivery and transient failure retry. Distribution copies are built from the tested source.

## Published Wix runtime

Installed all four source files and crypto-js 4.2.0 on a classic Wix Editor test site. Created the Admin-only collection with all eight Text fields, stored both secrets, published and connected MakePay to Demo Shop 2. Wix displayed **MakePay connected** after a real API credential check.

Actual HTTPS POST checks against the published HTTP function:

| Case | Observed response |
| --- | --- |
| Invalid signature | 401 |
| Signature older than five minutes | 401 |
| Valid signed pending event | 200; unpaid |
| Valid signed complete event for unknown checkout | 404; no approval |

## Installed checkout creation and retry checks

Executed the installed `Backend/MakePay.js` function using Wix Editor's backend test runner against live Secrets Manager, the private CMS collection and the production MakePay API. These tests used synthetic PSP transaction/order IDs, not a native Wix customer order. The approved Demo Shop 2 credentials remained private.

| Runtime case | Observed result |
| --- | --- |
| New USD transaction, `totalAmount: 1000` | Hosted checkout displayed **10 USD** |
| Repeat the same USD transaction | Returned the same plugin transaction ID and checkout URL |
| Change that reserved transaction to EUR | Rejected with `TRANSACTION_CREATION_FAILED`: `Transaction details changed.` |
| New EUR transaction, `totalAmount: 1000` | Hosted checkout displayed **10 EUR** |

The installed connector's creation path successfully reserved and updated its private transaction records. No payment was funded and no completion event was submitted for these synthetic IDs. See the [runtime screenshots](TUTORIAL.md#installed-currency-checks).

A dedicated $10 USD QA product was also saved and added to the native storefront cart. Native checkout displayed the correct $10 subtotal, free delivery and $10 total, then stopped at **We can’t accept online payments**. This verifies the site-plan blocker directly.

## Live completion remains required

The test site currently has a free plan: Wix displays **Not accepting payments** and requests an upgrade. No funded Wix checkout or live `submitEvent` completion has been performed. Before production use, enable payments, create a real Wix order, verify its hosted amount, fund a controlled checkout, verify the original order is paid, and replay its signed delivery. Local tests and credential connection are not proof of funded settlement.

The screenshot walkthrough shows setup and the verified connection. It does not depict a funded checkout. Screenshots and video exclude account-owner names and secret values.

A real Demo Shop 2 API request using `amount: "10.00"` and `fiatCurrency: "EUR"`, without a settlement currency override, returned a hosted link displaying **10 EUR**. No funds were transferred. Fiat-priced callbacks require the MakeCrypto callback fields `fiatCurrency` and `fiatAmount`; settlement `currency` is not treated as the store price currency.
