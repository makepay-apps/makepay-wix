import * as paymentProvider from 'interfaces-psp-v1-payment-service-provider';

/** @returns {import('interfaces-psp-v1-payment-service-provider').PaymentServiceProviderConfig} */
export function getConfig() {
  return {
    title: 'MakePay',
    paymentMethods: [
      {
        hostedPage: {
          title: 'Pay with crypto · MakePay',
          billingAddressMandatoryFields: [],
          logos: {
            colored: {
              png: 'https://www.makepay.io/brandkit/logos/makepay-symbol-purple@1x.png',
              svg: 'https://www.makepay.io/brandkit/logos/makepay-symbol-purple.svg',
            },
            white: {
              png: 'https://www.makepay.io/brandkit/logos/makepay-symbol-purple@1x.png',
              svg: 'https://www.makepay.io/brandkit/logos/makepay-symbol-purple.svg',
            },
          },
        },
      },
    ],
    credentialsFields: [
      {
        simpleField: {
          label: 'MakePay company ID',
          name: 'company_id',
        },
      },
      {
        simpleField: {
          label: 'MakePay API key ID',
          name: 'api_key_id',
        },
      },
    ],
  };
}
