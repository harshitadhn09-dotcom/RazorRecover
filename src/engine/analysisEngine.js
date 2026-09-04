import { policyDecision } from "./policyEngine";

export const formatMoney = (value, currency = "USD") => new Intl.NumberFormat("en-US", { style: "currency", currency, maximumFractionDigits: 0 }).format(value);

const groupBy = (records, key) => records.reduce((result, item) => {
  const value = item[key] || "UNKNOWN";
  result[value] = (result[value] || 0) + 1;
  return result;
}, {});

export const analyzeTransactions = (records) => {
  const failed = records.filter((item) => item.status === "FAILED");
  const nonSubscriptionFailures = failed.filter((item) => !item.subscription_id);
  const permitted = failed.filter((item) => ["PERMITTED", "REENGAGE"].includes(policyDecision(item).decision));
  const totalAtRisk = failed.reduce((sum, item) => sum + item.amount, 0);
  const recoverableRevenue = permitted.reduce((sum, item) => sum + item.amount * item.recoverability, 0);
  const bySubscription = failed.reduce((result, item) => {
    const label = item.subscription_id ? "Subscription renewal" : "One-time payment";
    result[label] = (result[label] || 0) + 1;
    return result;
  }, {});
  const regionalFailures = Object.entries(groupBy(nonSubscriptionFailures, "issuer_region")).sort((a, b) => b[1] - a[1]);
  const systemicRegion = regionalFailures[0]?.[0] || "UNKNOWN";
  const systemicCount = regionalFailures[0]?.[1] || 0;
  const systemicRevenue = nonSubscriptionFailures.filter((item) => item.issuer_region === systemicRegion).reduce((sum, item) => sum + item.amount, 0);
  return {
    failed,
    total: records.length,
    successful: records.filter((item) => item.status === "SUCCEEDED").length,
    failedCount: failed.length,
    failedSubscriptions: failed.filter((item) => item.subscription_id).length,
    totalAtRisk,
    recoverableRevenue,
    recoveredRevenue: recoverableRevenue * 0.62,
    recoveryRate: failed.length ? permitted.length / failed.length : 0,
    permitted: permitted.length,
    blocked: failed.length - permitted.length,
    clusters: Object.entries(groupBy(failed, "failure_reason")).map(([label, count]) => ({ label, count, share: count / failed.length })).sort((a, b) => b.count - a.count),
    byCountry: groupBy(failed, "country"),
    byPaymentType: groupBy(failed, "payment_method"),
    byIssuerRegion: groupBy(failed, "issuer_region"),
    bySubscription,
    byDay: groupBy(failed, "timestamp"),
    systemicIssue: {
      detected: nonSubscriptionFailures.length > 0 && systemicCount / nonSubscriptionFailures.length >= 0.3,
      region: systemicRegion,
      count: systemicCount,
      share: nonSubscriptionFailures.length ? systemicCount / nonSubscriptionFailures.length : 0,
      revenue: systemicRevenue,
      subscriptionCount: failed.filter((item) => item.subscription_id).length,
    },
  };
};

export const investigationFor = (transaction, analysis) => {
  const policy = policyDecision(transaction);
  const similar = analysis.failed.filter((item) => item.failure_reason === transaction.failure_reason).length;
  return {
    transaction,
    policy,
    systemicIssue: analysis.systemicIssue,
    confidence: transaction.failure_code === "AUTH_FAILED" ? 96 : transaction.failure_code === "ISSUER_TIMEOUT" ? 91 : 84,
    similar,
    evidence: [`${similar} similar failures share this root cause`, transaction.previous_customer_success ? "Customer has previous successful payments" : "No previous customer success found", transaction.retry_count > 0 ? `${transaction.retry_count} retry attempt${transaction.retry_count > 1 ? "s" : ""} recorded` : "No retries recorded", transaction.is_3ds_supported ? "3DS capability present" : "3DS capability unavailable for issuer"],
  };
};
