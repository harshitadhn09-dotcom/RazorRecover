const countries = [
  ["US", "USD", "NORTH_AMERICA"],
  ["GB", "GBP", "EUROPE"],
  ["AE", "AED", "MIDDLE_EAST"],
  ["DE", "EUR", "EUROPE"],
  ["SG", "SGD", "APAC"],
  ["IN", "INR", "APAC"],
];

const patterns = [
  {
    reason: "Temporary issuer decline",
    code: "ISSUER_TIMEOUT",
    paymentType: "CARD",
    subscription: false,
    base: 42,
  },
  {
    reason: "Authentication failure",
    code: "AUTH_FAILED",
    paymentType: "CARD",
    subscription: true,
    base: 31,
  },
  {
    reason: "Currency / region mismatch",
    code: "REGIONAL_DECLINE",
    paymentType: "CARD",
    subscription: false,
    base: 24,
  },
  {
    reason: "Repeated attempts",
    code: "RETRY_LIMIT",
    paymentType: "WALLET",
    subscription: true,
    base: 20,
  },
  {
    reason: "Merchant configuration",
    code: "MERCHANT_22",
    paymentType: "BANK_TRANSFER",
    subscription: false,
    base: 10,
  },
];

const seeded = (index) => (index * 17 + 23) % 97;

export const transactions = Array.from({ length: 160 }, (_, index) => {
  const pattern = patterns[index % patterns.length];
  const [country, currency, issuerRegion] = countries[(index * 3 + index % 4) % countries.length];
  const retryCount = pattern.reason === "Repeated attempts"
    ? 2 + (index % 2)
    : pattern.reason === "Authentication failure"
      ? index % 4 === 0 ? 2 : 1
      : index % 3;
  const amount = index === 0 ? 840 : 180 + ((seeded(index) * 37 + index * 19) % 1460);
  const previousCustomerSuccess = index === 0 ? true : index % 7 !== 0;
  const subscription = index === 0 ? false : pattern.subscription || index % 9 === 0;
  const paymentType = index === 0 ? "CARD" : subscription && index % 3 === 0 ? "UPI" : pattern.paymentType;
  const is3dsSupported = index === 0 || pattern.reason !== "Merchant configuration" && index % 6 !== 0;
  const failureReason = pattern.reason === "Authentication failure" && !is3dsSupported
    ? "Authentication unavailable for issuer"
    : pattern.reason;
  const recoverability = pattern.reason === "Temporary issuer decline"
    ? retryCount < 2 ? 0.82 : 0.38
    : pattern.reason === "Authentication failure"
      ? previousCustomerSuccess && retryCount < 2 ? 0.44 : 0.12
      : pattern.reason === "Repeated attempts"
        ? 0.04
        : pattern.reason === "Currency / region mismatch"
          ? 0.28
          : 0.2;

  return {
    transaction_id: `TXN_${(0x8f42a + index * 7919).toString(16).toUpperCase()}`,
    merchant_id: index % 4 === 0 ? "MERCHANT_ACME" : "MERCHANT_GLOBAL",
    country,
    amount,
    currency,
    payment_type: paymentType,
    payment_method: paymentType.toLowerCase(),
    issuer_region: issuerRegion,
    card_network: paymentType === "CARD" ? ["VISA", "MASTERCARD", "AMEX"][index % 3] : "N/A",
    is_3ds_supported: is3dsSupported,
    failure_code: pattern.code,
    failure_reason: failureReason,
    retry_count: retryCount,
    previous_customer_success: previousCustomerSuccess,
    subscription_id: subscription ? `SUB_${(index + 1042).toString(16).toUpperCase()}` : null,
    timestamp: `2026-08-${String(1 + (index % 28)).padStart(2, "0")}`,
    status: "FAILED",
    recoverability,
  };
});

export const successfulPayments = transactions.map((transaction, index) => ({
  ...transaction,
  transaction_id: `OK_${(index + 4401).toString(16).toUpperCase()}`,
  status: "SUCCEEDED",
  failure_reason: null,
})).slice(0, 212);

export const allPayments = [...successfulPayments, ...transactions];
