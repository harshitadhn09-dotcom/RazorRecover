export const formatMoney = (value, currency = "USD") =>
  new Intl.NumberFormat("en-US", { style: "currency", currency, maximumFractionDigits: 0 }).format(value);

export const policyFor = (transaction) => {
  if (transaction.retry_count >= 2 || transaction.failure_reason === "Authentication failure") {
    return { action: "STOP", decision: "BLOCKED", label: "Stop and request customer action" };
  }
  if (transaction.failure_reason === "Temporary issuer decline") {
    return { action: "RETRY_AFTER_COOLDOWN", decision: "PERMITTED", label: "Retry after cooldown" };
  }
  if (transaction.failure_reason === "Currency / region mismatch") {
    return { action: "MERCHANT_CONFIGURATION_REVIEW", decision: "PERMITTED", label: "Review regional configuration" };
  }
  if (transaction.subscription_id) {
    return { action: "CUSTOMER_REENGAGEMENT", decision: "PERMITTED", label: "Re-engage customer" };
  }
  return { action: "RAZORPAY_ESCALATION", decision: "PERMITTED", label: "Escalate to Razorpay" };
};

export const analyzeTransactions = (transactions) => {
  const failed = transactions.filter((transaction) => transaction.status === "FAILED");
  const group = (key) => failed.reduce((result, item) => {
    result[item[key]] = (result[item[key]] || 0) + 1;
    return result;
  }, {});
  const totalAtRisk = failed.reduce((sum, item) => sum + item.amount, 0);
  const recoverable = failed.filter((item) => policyFor(item).decision === "PERMITTED");
  const recoverableRevenue = recoverable.reduce((sum, item) => sum + item.amount * item.recoverability, 0);
  const permitted = recoverable.length;
  const blocked = failed.length - permitted;
  const clusters = Object.entries(group("failure_reason"))
    .map(([label, count]) => ({ label, count, share: count / failed.length }))
    .sort((a, b) => b.count - a.count);

  return {
    failed,
    total: transactions.length,
    successful: transactions.filter((item) => item.status === "SUCCEEDED").length,
    failedCount: failed.length,
    totalAtRisk,
    recoverableRevenue,
    recoveredRevenue: recoverableRevenue * 0.62,
    recoveryRate: recoverable.length / failed.length,
    permitted,
    blocked,
    clusters,
    byCountry: group("country"),
    byPaymentType: group("payment_type"),
    byIssuerRegion: group("issuer_region"),
    bySubscription: failed.reduce((result, item) => {
      const label = item.subscription_id ? "Subscription renewal" : "One-time payment";
      result[label] = (result[label] || 0) + 1;
      return result;
    }, {}),
    byDay: group("timestamp"),
  };
};

export const investigationFor = (transaction, analysis) => {
  const policy = policyFor(transaction);
  const similar = analysis.failed.filter((item) => item.failure_reason === transaction.failure_reason).length;
  return {
    transaction,
    policy,
    confidence: transaction.failure_reason === "Repeated attempts" ? 96 : transaction.failure_reason === "Temporary issuer decline" ? 91 : 84,
    similar,
    evidence: [
      `${similar} similar failures share this root cause`,
      transaction.previous_customer_success ? "Customer has previous successful payments" : "No previous customer success found",
      transaction.retry_count > 0 ? `${transaction.retry_count} retry attempt${transaction.retry_count > 1 ? "s" : ""} already recorded` : "No retries recorded",
      transaction.is_3ds_supported ? "3DS capability present" : "3DS capability unavailable for issuer",
    ],
  };
};

export const simulateRecovery = (analysis) => {
  const eligible = analysis.failed.filter((item) => policyFor(item).decision === "PERMITTED");
  const baseline = eligible.reduce((sum, item) => sum + (item.recoverability > 0.5 ? item.amount * 0.28 : 0), 0);
  const razorRecover = eligible.reduce((sum, item) => sum + item.amount * item.recoverability * 0.62, 0);
  return {
    baseline,
    razorRecover,
    incremental: razorRecover - baseline,
    eligible: eligible.length,
  };
};
