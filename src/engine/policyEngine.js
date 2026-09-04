export const policyDecision = (transaction) => {
  if (transaction.retry_count >= 2) {
    return { decision: "STOP", action: "USE_ALTERNATIVE_METHOD", label: "Use another payment method" };
  }
  if (transaction.failure_code === "AUTH_3DS_01" || transaction.failure_code === "AUTH_FAILED") {
    return { decision: "RE_AUTHENTICATE", action: "COMPLETE_VERIFICATION", label: "Complete verification" };
  }
  if (transaction.failure_code === "ISSUER_05" || transaction.failure_code === "ISSUER_TIMEOUT") {
    return { decision: "PERMITTED", action: "RETRY_AFTER_COOLDOWN", label: "Try again after cooldown" };
  }
  if (transaction.subscription_id && transaction.status === "FAILED") {
    return { decision: "REENGAGE", action: "UPDATE_PAYMENT_METHOD", label: "Update payment method" };
  }
  return { decision: "REVIEW", action: "MERCHANT_CONFIGURATION_REVIEW", label: "Review payment configuration" };
};

export const policyFor = policyDecision;
