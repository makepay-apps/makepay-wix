import crypto from 'crypto-js';
import { fetch } from 'wix-fetch';
import wixData from 'wix-data';
import wixPaymentProviderBackend from 'wix-payment-provider-backend';
import { getSecret } from 'wix-secrets-backend';
import { response } from 'wix-http-functions';

const API = 'https://www.makecrypto.io';
const COLLECTION = 'MakePayTransactions';
const DB = { suppressAuth: true };

export async function connect(options) {
  try {
    const credentials = options.credentials || {};
    if (!credentials.company_id || !credentials.api_key_id) throw new Error('Company ID and API key ID are required.');
    await getSecret('makepay_webhook_secret');
    await api(credentials, 'GET', '/payment-links');
    return { credentials, accountId: credentials.company_id, accountName: `MakePay ${credentials.company_id}` };
  } catch (_) {
    return businessError('MERCHANT_ACCOUNT_INVALID', 'Check the company ID, read/write API key, and both Wix secrets.', 2002);
  }
}
export async function createTransaction(options) {
  try {
    const credentials = options.merchantCredentials || options.credentials || {};
    const order = options.order || {};
    const description = order.description || {};
    const transactionId = options.wixTransactionId;
    if (!transactionId || !order._id) throw new Error('Wix transaction and order IDs are required.');
    // The PSP contract uses minor units, not the eCommerce Order priceSummary.
    const currency = description.currency;
    const amount = minorUnitsToAmount(description.totalAmount, currency);
    const urls = order.returnUrls || {};
    if (!urls.successUrl || !urls.errorUrl || !urls.cancelUrl) throw new Error('Wix return URLs are missing.');
    const existing = await wixData.get(COLLECTION, transactionId, DB).catch(() => null);
    if (existing) {
      if (existing.amount !== amount || existing.currency !== currency || existing.companyId !== credentials.company_id || existing.orderId !== order._id) throw new Error('Transaction details changed.');
      if (existing.checkoutUrl && existing.linkUid) return { pluginTransactionId: existing.linkUid, redirectUrl: existing.checkoutUrl };
      throw new Error('Transaction creation is pending. Inspect the MakePay request before retrying.');
    }
    // A unique Wix transaction ID reserves creation across concurrent calls.
    const record = await wixData.insert(COLLECTION, { _id: transactionId, orderId: order._id,
      companyId: credentials.company_id, amount, currency, state: 'creating' }, DB);
    const result = await api(credentials, 'POST', '/payment-links', {
      source: 'wix', status: 'active', sendPaymentRequestEmail: false,
      payload: { title: `Wix order ${order._id}`, amount, fiatCurrency: currency,
        orderId: `wix_${transactionId}`, clientEmail: description.billingAddress?.email || '',
        returnUrl: urls.pendingUrl || urls.successUrl, successUrl: urls.successUrl,
        failureUrl: urls.errorUrl, cancelUrl: urls.cancelUrl, expirationTime: '12h' },
    });
    const link = result.paymentLink;
    if (!link?.uid || !isHostedUrl(link.publicUrl)) throw new Error('MakePay did not return a valid HTTPS hosted checkout.');
    await wixData.update(COLLECTION, { ...record, linkUid: link.uid, checkoutUrl: link.publicUrl, state: 'pending' }, DB);
    return { pluginTransactionId: link.uid, redirectUrl: link.publicUrl };
  } catch (error) {
    return businessError('TRANSACTION_CREATION_FAILED', error.message || 'Unable to create checkout.', 3000);
  }
}
export async function notify(request) {
  try {
    const raw = await request.body.text();
    if (raw.length > 262144) return reply(413, 'Payload too large.');
    const secret = await getSecret('makepay_webhook_secret');
    const signature = request.headers['x-makepay-signature'] || request.headers['X-MakePay-Signature'];
    if (!verifyMakePaySignature(raw, signature, secret)) return reply(401, 'Invalid signature.');
    const event = JSON.parse(raw);
    if (event.session?.status !== 'complete') return reply(200, 'Non-complete payment ignored.');
    const link = event.paymentLink;
    if (!link?.uid || !event.session?.id) return reply(400, 'Payment reference missing.');
    const result = await wixData.query(COLLECTION).eq('linkUid', link.uid).find(DB);
    const record = result.items[0];
    if (!record) return reply(404, 'Unknown payment link.');
    // Fiat price and crypto settlement currency are separate API fields.
    const fiatCurrency = link.fiatCurrency || (link.currency === 'USD' ? 'USD' : null);
    if (link.merchantOrderId !== `wix_${record._id}` || fiatCurrency !== record.currency ||
      !sameAmount(link.fiatAmount ?? link.amount, record.amount)) return reply(400, 'Payment does not match the checkout.');
    if (record.state === 'complete') return reply(200, 'Already completed.');
    // Completing the original PSP transaction lets Wix update the order itself.
    // Repeated delivery uses the same transaction IDs, including after a lost reply.
    await wixPaymentProviderBackend.submitEvent({ event: { transaction: {
      wixTransactionId: record._id, pluginTransactionId: record.linkUid,
    } } });
    await wixData.update(COLLECTION, { ...record, state: 'complete', sessionId: event.session.id }, DB);
    return reply(200, 'Transaction completed.');
  } catch (_) {
    // Returning 5xx keeps MakePay's webhook retry active on temporary failures.
    return reply(503, 'Unable to process notification. Retry later.');
  }
}
export async function refundTransaction() {
  return businessError('REFUND_NOT_SUPPORTED', 'Issue the refund in MakePay, verify settlement, then record it in Wix.', 3001);
}
export function verifyMakePaySignature(raw, header, secret, now = Date.now() / 1000) {
  if (!secret || typeof header !== 'string') return false;
  const match = header.match(/^t=(\d+),v1=([a-f0-9]{64})$/);
  if (!match || Math.abs(now - Number(match[1])) > 300) return false;
  const expected = crypto.HmacSHA256(`${match[1]}.${raw}`, secret).toString(crypto.enc.Hex);
  let difference = 0;
  for (let i = 0; i < 64; i++) difference |= expected.charCodeAt(i) ^ match[2].charCodeAt(i);
  return difference === 0;
}
export function minorUnitsToAmount(value, currency) {
  if (typeof currency !== 'string' || !/^[A-Z]{3}$/.test(currency)) throw new Error('Invalid Wix price currency.');
  const precision = new Intl.NumberFormat('en', { style: 'currency', currency }).resolvedOptions().maximumFractionDigits;
  const text = String(value ?? '');
  if (!/^\d+$/.test(text) || !Number.isSafeInteger(Number(text)) || Number(text) <= 0) throw new Error('Invalid Wix checkout amount.');
  const normalized = text.replace(/^0+(?=\d)/, '');
  if (!precision) return normalized;
  const padded = normalized.padStart(precision + 1, '0');
  return `${padded.slice(0, -precision)}.${padded.slice(-precision)}`;
}
function sameAmount(a, b) {
  const normalize = value => /^\d+(\.\d+)?$/.test(String(value))
    ? String(value).replace(/^0+(?=\d)/, '').replace(/(\.\d*?)0+$/, '$1').replace(/\.$/, '') : null;
  const amount = normalize(a);
  return amount !== null && amount === normalize(b);
}
function isHostedUrl(value) {
  try { const url = new URL(value); return url.protocol === 'https:' && !url.username && !url.password; } catch (_) { return false; }
}
async function api(credentials, method, suffix, body) {
  const secret = await getSecret('makepay_api_key_secret');
  if (!credentials.company_id || !credentials.api_key_id || !secret) throw new Error('Missing MakePay credentials.');
  const result = await fetch(`${API}/api/partner/v1/companies/${encodeURIComponent(credentials.company_id)}${suffix}`, {
    method, headers: { 'Content-Type': 'application/json', 'X-MakeCrypto-Key-Id': credentials.api_key_id,
      'X-MakeCrypto-Key-Secret': secret }, ...(body ? { body: JSON.stringify(body) } : {}),
  });
  if (!result.ok) throw new Error(`MakePay request failed (${result.status}). Check scopes, settlement, and the minimum checkout amount.`);
  return result.json();
}
function businessError(errorCode, errorMessage, reasonCode) { return { reasonCode, errorCode, errorMessage }; }
function reply(status, message) { return response({ status, headers: { 'Content-Type': 'application/json' }, body: { message } }); }
