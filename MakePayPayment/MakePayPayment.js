import * as paymentProvider from 'interfaces-psp-v1-payment-service-provider';
import * as MakePay from 'backend/MakePay.js';

/**
 * @param {import('interfaces-psp-v1-payment-service-provider').ConnectAccountOptions} options
 * @param {import('interfaces-psp-v1-payment-service-provider').Context} context
 */
export const connectAccount = async (options, context) => {
  return MakePay.connect(options);
};

/**
 * @param {import('interfaces-psp-v1-payment-service-provider').CreateTransactionOptions} options
 * @param {import('interfaces-psp-v1-payment-service-provider').Context} context
 */
export const createTransaction = async (options, context) => {
  return MakePay.createTransaction(options);
};

/**
 * @param {import('interfaces-psp-v1-payment-service-provider').RefundTransactionOptions} options
 * @param {import('interfaces-psp-v1-payment-service-provider').Context} context
 */
export const refundTransaction = async (options, context) => {
  return MakePay.refundTransaction(options);
};
