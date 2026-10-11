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
| Known USD checkout, wrong fiat amount | 400; rejected |
| Known USD checkout, wrong fiat currency | 400; rejected |
| Known USD checkout, wrong order reference | 400; rejected |
| Known EUR checkout, USD fiat currency | 400; rejected |
| Known USD checkout, underpaid status | 200; ignored |
| Known USD checkout, failed status | 200; ignored |

All ten published endpoint cases passed using the installed site's real signing secret. The known-checkout cases used the USD/EUR synthetic transactions described below, so the rejection checks exercised the live private collection. No matching complete event was submitted for those test transactions.

## Installed checkout creation and retry checks

Executed the installed `Backend/MakePay.js` function using Wix Editor's backend test runner against live Secrets Manager, the private CMS collection and the production MakePay API. These tests used synthetic PSP transaction/order IDs, not a native Wix customer order. The approved Demo Shop 2 credentials remained private.

| Runtime case | Observed result |
| --- | --- |
| New USD transaction, `totalAmount: 1000` | Hosted checkout displayed **10 USD** |
| Repeat the same USD transaction | Returned the same plugin transaction ID and checkout URL |
| Change that reserved transaction to EUR | Rejected with `TRANSACTION_CREATION_FAILED`: `Transaction details changed.` |
| New EUR transaction, `totalAmount: 1000` | Hosted checkout displayed **10 EUR** |

The installed connector's creation path successfully reserved and updated its private transaction records. No payment was funded and no completion event was submitted for these synthetic IDs. See the [runtime screenshots](TUTORIAL.md#installed-currency-checks).

A dedicated $10 USD QA product was also saved and added to the native storefront cart. Ordinary customer checkout stopped at **We can’t accept online payments**. Signing into the Members Area with the site owner's account unlocked Wix's free test-order route, described below.

## Testing without buying a plan

QA was performed without purchasing or upgrading a Wix subscription. The installed backend runner, real MakePay USD/EUR link creation, retry checks and published HTTPS webhook checks work on the free site.

Wix documents [owner-only test orders](https://support.wix.com/en/article/previewing-the-checkout-process-1420066) on a free site, using a manual payment option and the site's Members Area. After enabling the QA manual option and signing into the storefront with the owner's account, **I just want to place a test order** opened native checkout. MakePay was offered alongside Manual Payment. Synthetic QA delivery details were used, with no fulfillment or payment transfer.

| Native owner test case | Observed result |
| --- | --- |
| Select Pay with crypto · MakePay and place the QA order | Redirected to a real hosted checkout displaying **10 USD** |
| Inspect the created MakePay link | `source: wix`, native Wix order/transaction IDs and Wix cashier return URLs |
| Deliver a matching signed QA complete event | 200, `Transaction completed.`; the installed handler called Wix `submitEvent` successfully |
| Replay that QA complete event | 200, `Already completed.` |
| Return from hosted checkout to Wix | Native thank-you page for order **#10001**, $10 total and MakePay payment method; member order history showed **Confirmed** |

The completion event was simulated with an explicitly QA session ID. MakePay received no funds and no real completed payment session was created. The customer order-history label **Confirmed** is not independent proof of a funded payment. The administration session expired before its payment status could be inspected. See the [name-free owner-test screenshots](TUTORIAL.md#free-owner-test-order).

Wix's separate [free development sites](https://dev.wix.com/docs/build-apps/launch-your-app/app-distribution/test-your-app/test-your-app-on-a-premium-site) include Premium capabilities. Access in the current account prompts migration of all existing sites into a Studio workspace; that account-wide change has not been applied.

## Production checkout validation

The test site has a free plan: Wix displays **Not accepting payments** for ordinary customers. Its owner-only test route verified native order creation, MakePay redirection and live Wix `submitEvent` handling with a simulated callback. No funded Wix checkout has been performed. Before production use, enable customer payments, fund a controlled checkout, verify the original order is paid, and replay its provider-generated signed delivery. Simulated callbacks are not proof of funded settlement.

The screenshot walkthrough shows setup, currency preservation and the free owner test order. It does not depict a funded checkout. Screenshots and video exclude account-owner names and secret values.

A real Demo Shop 2 API request using `amount: "10.00"` and `fiatCurrency: "EUR"`, without a settlement currency override, returned a hosted link displaying **10 EUR**. No funds were transferred. Fiat-priced callbacks require the MakeCrypto callback fields `fiatCurrency` and `fiatAmount`; settlement `currency` is not treated as the store price currency.
