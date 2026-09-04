import { policyDecision } from "./policyEngine";

export const simulateRecovery = (analysis) => {
  const eligible = analysis.failed.filter((item) => policyDecision(item).decision === "PERMITTED" || policyDecision(item).decision === "REENGAGE");
  const baseline = eligible.reduce((sum, item) => sum + (item.recoverability > 0.5 ? item.amount * 0.28 : 0), 0);
  const razorRecover = eligible.reduce((sum, item) => sum + item.amount * item.recoverability * 0.62, 0);
  return { baseline, razorRecover, incremental: razorRecover - baseline, eligible: eligible.length, label: "SIMULATED RECOVERY" };
};
