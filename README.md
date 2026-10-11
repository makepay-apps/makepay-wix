# MakePay Wix Velo payment provider

**1.0.0-rc.1:** connection and local integration checks passed; funded settlement remains a rollout prerequisite. See [validation evidence](docs/TESTING.md).

Merchant-installed Velo files for **Wix Editor and Wix Studio**. This follows the
same installation model as CoinPal's Wix connector: enable Dev Mode, copy backend
and Payment service-plugin files, install `crypto-js`, publish, then connect the
provider in Accept Payments. It is not a Wix App Market app or an approved public
payment-provider listing.

**Wix Harmony does not support Velo/custom code.** Use Editor or Studio for this
connector. Store prices retain their currency (for example EUR or USD) through
MakePay `fiatCurrency`. Crypto settlement follows the merchant configuration;
it does not change the order price currency. Configure settlement in MakeCrypto. Automated
refunds are not supported.

## Install

1. Enable **Dev Mode** in Wix Editor/Studio.
2. Under **Backend & Public → Backend**, create `MakePay.js` and
   `http-functions.js`. Copy the files from `Backend/`.
   If HTTP functions already exist, append the MakePay import/export.
3. Under **Service Plugins**, add **Payment**, accept Wix's custom-provider
   terms, and name it `MakePayPayment`.
4. Copy both files from `MakePayPayment/` into the generated plugin files.
5. Under **Packages & Apps**, install npm package `crypto-js` version `4.2.0`.
6. Create CMS collection **MakePayTransactions**, with collection ID exactly
   `MakePayTransactions`, and permissions restricted to **Admin** for all access.
   Add text fields `orderId`, `companyId`, `amount`, `currency`, `state`,
   `linkUid`, `checkoutUrl`, `sessionId`. Backend code sets the unique `_id`.
7. Create secrets in **Developer Tools → Secrets Manager**:
   `makepay_api_key_secret` and `makepay_webhook_secret`.
8. Publish. Under **Settings → Accept Payments → See More Payment Options**,
   connect MakePay with the MakeCrypto company ID and API key ID.
9. Set the callback in MakeCrypto **Integrations → API Integrations → Callback URL configuration**:

```text
https://your-wix-domain/_functions/makepay_notify
```

Use an API key with `makepay:payment-links:read` and
`makepay:payment-links:write`. Keep secrets in Secrets Manager. Each shop should
have dedicated company credentials/callback routing. Wix may require a paid
commerce plan before customers can complete checkout; publishing code alone
does not verify payment processing.

## Test

Use a product in your store currency above MakePay's minimum amount, open checkout, select MakePay,
and confirm the hosted link amount. Payment is recorded via Wix's original
payment transaction only after a signed complete callback. Redirecting back,
receiving a deposit or underpayment does not approve an order.

```bash
npm ci
npm test
npm run build
```

Local tests run the actual backend source with Wix SDK adapters and a mocked
MakePay API. They cover the published Wix PSP minor-unit input shape, link reuse,
signatures, wrong references, intermediate statuses, completion and retries.
They do not substitute for a real published Wix checkout and settlement test.

## Recovery

The private collection retains transaction references, never API secrets. A
reservation stuck in `creating` protects against duplicated checkout requests
after an ambiguous network failure. Check MakeCrypto links with
`orderId = wix_WIX_TRANSACTION_ID`, reconcile `linkUid` and `checkoutUrl`, and
set `state = pending`. Clear a reservation only after confirming no provider link
was created. Non-2xx notifications appear in MakeCrypto delivery logs and are
retried. Wix `submitEvent` and transient data failures return 503.

## Tutorial

See [installation tutorial](docs/TUTORIAL.md) and [validation evidence](docs/TESTING.md).
The website guide is at https://www.makecrypto.io/documentation/makepay/apps/wix.
