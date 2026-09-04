import { useEffect, useMemo, useState } from "react";
import "./index.css";
import WebThreads from "./components/WebThreads";
import Strands from "./components/Strands";
import { allPayments, transactions } from "./data/mockTransactions";
import { analyzeTransactions, formatMoney, investigationFor } from "./engine/analysisEngine";
import { policyFor } from "./engine/policyEngine";
import { simulateRecovery } from "./engine/recoverySimulator";

const bootMessages = ["CONNECTING TO PAYMENT SIGNALS", "NORMALIZING TRANSACTIONS", "CALCULATING RECOVERABILITY", "SIGNAL ACQUIRED"];

function App() {
  const [screen, setScreen] = useState(() => {
    if (window.location.pathname === "/user") return "user";
    if (window.location.pathname === "/merchant") return "merchant";
    return "loading";
  });
  const [progress, setProgress] = useState(0);
  const [userStep, setUserStep] = useState("checkout");
  const [userTransaction] = useState(transactions[0]);
  const [selected, setSelected] = useState(null);
  const [filter, setFilter] = useState("ALL");
  const [investigating, setInvestigating] = useState(false);
  const [investigationStage, setInvestigationStage] = useState(0);
  const [simulation, setSimulation] = useState(null);
  const analysis = useMemo(() => analyzeTransactions(allPayments), []);
  const visibleTransactions = analysis.failed.filter((item) => filter === "ALL" || item.failure_reason === filter);

  useEffect(() => {
    if (screen !== "loading") return undefined;
    const interval = window.setInterval(() => {
      setProgress((value) => {
        if (value >= 100) { window.clearInterval(interval); window.setTimeout(() => setScreen("entry"), 450); return 100; }
        return value + 4;
      });
    }, 65);
    return () => window.clearInterval(interval);
  }, [screen]);

  useEffect(() => {
    const onPopState = () => {
      const path = window.location.pathname;
      setScreen(path === "/user" ? "user" : path === "/merchant" ? "merchant" : "entry");
    };
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  const navigate = (nextScreen) => {
    const path = nextScreen === "user" ? "/user" : nextScreen === "merchant" ? "/merchant" : "/";
    window.history.pushState({}, "", path);
    if (nextScreen === "loading") setProgress(0);
    setScreen(nextScreen);
  };

  const startMerchantInvestigation = () => {
    setInvestigating(true); setSelected(analysis.failed[0]); setInvestigationStage(0); let stage = 0;
    const timer = window.setInterval(() => { stage += 1; setInvestigationStage(stage); if (stage >= 10) { window.clearInterval(timer); window.setTimeout(() => setInvestigating(false), 500); } }, 360);
  };

  if (screen === "loading") return <Loading progress={progress} />;
  if (screen === "entry") return <Entry setScreen={navigate} />;
  if (screen === "user") return <UserExperience transaction={userTransaction} analysis={analysis} step={userStep} setStep={setUserStep} onBack={() => navigate("loading")} />;
  if (screen === "merchant") return <div className="screen-shell"><Strands /><MerchantExperience analysis={analysis} transactions={visibleTransactions} filter={filter} setFilter={setFilter} selected={selected} setSelected={setSelected} investigating={investigating} investigationStage={investigationStage} runInvestigation={startMerchantInvestigation} simulation={simulation} runSimulation={() => { setSimulation(simulateRecovery(analysis)); navigate("impact"); }} onBack={() => navigate("loading")} /></div>;
  return <div className="screen-shell"><Strands /><Impact onBack={() => navigate("merchant")} simulation={simulation} /></div>;
}

function Loading({ progress }) {
  return <div className="loading-screen"><div className="threads-background"><WebThreads color1="#ff4f9a" color2="#ff8fc7" color3="#fff" speed={0.35} threadCount={8} frequency={4.5} spread={0.22} taper={0.8} position={0.5} fanMode="center" glow={0.025} falloff={0.65} thickness={1.15} brightness={0.75} opacity={0.9} mirror shimmer grain grainIntensity={0.035} mouseInteraction mouseStrength={0.2} /></div><div className="loading-content"><div className="brand">RAZORRECOVER</div><div className="loading-label">GLOBAL PAYMENT NETWORK</div><h1>INITIALIZING<br />INTELLIGENCE</h1><div className="loading-status"><span>{bootMessages[Math.min(3, Math.floor(progress / 26))]}</span><span>{progress}%</span></div><div className="loading-bar"><div style={{ width: `${progress}%` }} /></div></div></div>;
}

function Entry({ setScreen }) {
  return <main className="portal-screen"><Strands /><div className="screen-content"><header className="portal-header"><div className="brand">RAZORRECOVER</div><span className="mode-label">SIMULATED AUTHENTICATION / SELECT A PORTAL</span></header><div className="portal-split"><button className="portal-half portal-user" onClick={() => setScreen("user")}><span className="portal-index">01 / USER</span><strong>User<br /><em>Portal</em></strong><small>Understand a failed payment and what to do next.</small><span className="portal-action">ENTER USER VIEW ↗</span></button><button className="portal-half portal-merchant" onClick={() => setScreen("merchant")}><span className="portal-index">02 / MERCHANT</span><strong>Merchant<br /><em>Portal</em></strong><small>Find failure patterns and recover lost revenue.</small><span className="portal-action">ENTER COMMAND CENTER ↗</span></button></div></div></main>;
}

function UserExperience({ transaction, analysis, step, setStep, onBack }) {
  const diagnosis = step === "investigation" ? investigationFor(transaction, analysis) : null;
  return <main className="user-screen"><Strands /><div className="screen-content"><header className="product-bar"><button className="brand-button" onClick={onBack}>RAZORRECOVER</button><span className="mode-label">USER VIEW / SIMULATED</span></header><div className={`user-stage ${step === "investigation" ? "investigating-stage" : ""}`}>{step === "checkout" && <div className="checkout-panel"><span className="eyebrow">SECURE PAYMENT</span><h1>Pay for order.</h1><div className="order-line"><span>Premium Plan</span><strong>{formatMoney(transaction.amount)}</strong></div><div className="payment-method"><span>PAYMENT METHOD</span><strong>Visa ending 4242</strong><small>International card / 3DS ready</small></div><button className="primary-button" onClick={() => { setStep("processing"); window.setTimeout(() => setStep("authorizing"), 650); window.setTimeout(() => setStep("failed"), 1300); window.setTimeout(() => setStep("investigation"), 2100); }}>PAY NOW <span>↗</span></button></div>}{step === "processing" && <Processing title="PAYMENT INITIATED" detail="Connecting to issuer network" />}{step === "authorizing" && <Processing title="AUTHORIZING" detail="Checking issuer and authentication state" />}{step === "failed" && <Processing title="PAYMENT FAILED" detail="Issuer response received" failed />}{step === "investigation" && <UserInvestigation transaction={transaction} diagnosis={diagnosis} />}</div></div></main>;
}

function Processing({ title, detail, failed }) { return <div className={`processing ${failed ? "failed" : ""}`}><span className="eyebrow">PAYMENT FLOW</span><div className="processing-ring" /><h1>{title}</h1><p>{detail}</p><div className="processing-line" /></div>; }

function UserInvestigation({ transaction, diagnosis }) {
  const facts = [["TRANSACTION ID", transaction.transaction_id], ["COUNTRY / CURRENCY", `${transaction.country} / ${transaction.currency}`], ["AMOUNT", formatMoney(transaction.amount)], ["PAYMENT METHOD", transaction.payment_type], ["ISSUER REGION", transaction.issuer_region], ["FAILURE CODE", transaction.failure_code], ["RETRY COUNT", transaction.retry_count], ["3DS STATUS", transaction.is_3ds_supported ? "SUPPORTED" : "UNAVAILABLE"], ["PREVIOUS SUCCESS", transaction.previous_customer_success ? "YES" : "NO"]];
  return <div className="user-investigation"><div className="investigation-heading"><span className="eyebrow">AI PAYMENT INVESTIGATION</span><h1>We found the<br /><span>signal.</span></h1></div><div className="investigation-grid"><div className="transaction-facts">{facts.map(([label, value]) => <div key={label}><span>{label}</span><strong>{value}</strong></div>)}</div><div className="diagnosis"><div className="agent-console"><span>RAZORRECOVER AI</span><p>&gt; Inspecting transaction<br />&gt; Checking issuer response<br />&gt; Comparing similar failures<br />&gt; Applying recovery policy</p></div><div className="diagnosis-result"><span className="eyebrow">ROOT CAUSE</span><h2>{transaction.failure_reason}</h2><div className="confidence"><span>CONFIDENCE</span><strong>{diagnosis.confidence}%</strong></div><span className="eyebrow">EVIDENCE</span><ul>{diagnosis.evidence.map((item) => <li key={item}>{item}</li>)}</ul><div className="recommendation"><span className="eyebrow">RECOMMENDED ACTION</span><strong>{diagnosis.policy.label}</strong><p>{diagnosis.policy.action === "STOP" ? "Further attempts are unlikely to recover this payment. Please complete authentication or use another payment method." : "This payment is likely recoverable. Waiting before retrying is safer than repeatedly attempting the payment."}</p></div></div></div></div></div>;
}

function MerchantExperience({ analysis, transactions, filter, setFilter, selected, setSelected, investigating, investigationStage, runInvestigation, simulation, runSimulation, onBack }) {
  useEffect(() => {
    const brandButton = document.querySelector(".merchant-screen .brand-button");
    if (!brandButton) return undefined;
    brandButton.addEventListener("click", onBack);
    return () => brandButton.removeEventListener("click", onBack);
  }, [onBack]);
  const stages = ["INGEST FAILED TRANSACTIONS", "NORMALIZE DATA", "DETECT FAILURE PATTERNS", "CLUSTER SIMILAR FAILURES", "DETERMINE ROOT CAUSES", "ESTIMATE RECOVERABILITY", "CALCULATE REVENUE AT RISK", "APPLY POLICY / STOPPING RULES", "RECOMMEND INTERVENTIONS", "GENERATE MERCHANT ACTION PLAN"];
  return <main className="merchant-screen"><header className="merchant-header"><button className="brand-button">RAZORRECOVER</button><div className="merchant-nav"><span className="active">COMMAND CENTER</span><span>ANALYTICS</span><span>SUBSCRIPTIONS</span><span>TRANSACTIONS</span></div><span className="merchant-id">MERCHANT / ACME GLOBAL</span></header><div className="merchant-body"><div className="merchant-title"><div><span className="eyebrow">LIVE PAYMENT INTELLIGENCE</span><h1>Command center.</h1><p>Derived from {analysis.total} synthetic international payment records.</p></div><button className="investigate-button" onClick={runInvestigation}>RUN AI INVESTIGATION <span>↗</span></button></div><section className="metric-strip">{[["TOTAL PAYMENTS", analysis.total], ["SUCCESSFUL", analysis.successful], ["FAILED", analysis.failedCount], ["REVENUE AT RISK", formatMoney(analysis.totalAtRisk)], ["RECOVERABLE", formatMoney(analysis.recoverableRevenue)], ["RECOVERY RATE", `${(analysis.recoveryRate * 100).toFixed(1)}%`], ["RECOVERED", formatMoney(analysis.recoveredRevenue)]].map(([label, value]) => <Metric key={label} label={label} value={value} />)}</section><section className="analytics-layout"><div className="analytics-main"><Panel title="FAILURE REASONS" subtitle="Click a cluster to filter transactions"><Bars data={analysis.clusters} active={filter} onSelect={(label) => setFilter(filter === label ? "ALL" : label)} /></Panel><Panel title="FAILURE DISTRIBUTION" subtitle="Country / payment method / issuer region"><div className="distribution-grid"><Distribution title="COUNTRY" data={analysis.byCountry} /><Distribution title="PAYMENT METHOD" data={analysis.byPaymentType} /><Distribution title="ISSUER REGION" data={analysis.byIssuerRegion} /><Distribution title="SUBSCRIPTION" data={analysis.bySubscription} /></div></Panel></div><aside className="analytics-side"><Panel title="AI STATUS" subtitle="Deterministic analysis pipeline"><div className="pipeline-status">{stages.map((stage, index) => <div className={investigating && index <= investigationStage ? "done" : ""} key={stage}><span>{investigating ? index < investigationStage ? "✓" : index === investigationStage ? "●" : "○" : "○"}</span>{stage}</div>)}</div>{!investigating && investigationStage >= 10 && <p className="status-complete">Analysis complete: {analysis.permitted} interventions permitted, {analysis.blocked} blocked.</p>}</Panel><Panel title="SIMULATED RECOVERY" subtitle="Deterministic outcome comparison"><div className="recovery-summary">{simulation ? <><div><span>BASELINE</span><strong>{formatMoney(simulation.baseline)}</strong></div><div><span>RAZORRECOVER</span><strong>{formatMoney(simulation.razorRecover)}</strong></div><div className="incremental"><span>INCREMENTAL</span><strong>+{formatMoney(simulation.incremental)}</strong></div></> : <button className="text-button" onClick={runSimulation}>RUN RECOVERY SIMULATION <span>↗</span></button>}</div></Panel></aside></section><section className="explorer"><div className="section-heading"><div><span className="eyebrow">TRANSACTION EXPLORER</span><h2>{filter === "ALL" ? "Failed payments" : filter}</h2></div><span>{transactions.length} records</span></div><div className="transaction-table"><div className="table-head"><span>TRANSACTION</span><span>COUNTRY</span><span>AMOUNT</span><span>FAILURE / ROOT CAUSE</span><span>RECOVERABILITY</span><span>POLICY</span></div>{transactions.slice(0, 12).map((transaction) => <button className="transaction-row" key={transaction.transaction_id} onClick={() => setSelected(transaction)}><strong>{transaction.transaction_id}</strong><span>{transaction.country}</span><span>{formatMoney(transaction.amount)}</span><span>{transaction.failure_reason}</span><span>{Math.round(transaction.recoverability * 100)}%</span><b className={policyFor(transaction).decision.toLowerCase()}>{policyFor(transaction).decision}</b></button>)}</div></section></div>{selected && <InvestigationDrawer item={selected} result={investigationFor(selected, analysis)} onClose={() => setSelected(null)} />}</main>;
}

function Metric({ label, value }) { return <div className="metric"><span>{label}</span><strong>{value}</strong></div>; }
function Panel({ title, subtitle, children }) {
  const issue = title === "AI STATUS" ? analyzeTransactions(allPayments).systemicIssue : null;
  return <div className="data-panel"><div className="panel-title"><div><span>{title}</span><small>{subtitle}</small></div><i>↗</i></div>{children}{issue && <SystemicWarning issue={issue} />}</div>;
}

function SystemicWarning({ issue }) {
  const [pinged, setPinged] = useState(false);
  if (!issue.detected) return null;
  return <div className="systemic-warning"><div><span className="eyebrow">AI SYSTEMIC WARNING</span><strong>Issue is not subscription-specific</strong><p>{Math.round(issue.share * 100)}% of non-subscription failures are concentrated in {issue.region}, affecting {issue.count} transactions and {formatMoney(issue.revenue)} in risk.</p></div><button className="text-button" onClick={() => setPinged(true)}>{pinged ? "RAZORPAY TEAM PINGED ✓" : "PING RAZORPAY TEAM ↗"}</button>{pinged && <small className="ping-confirmation">Simulated escalation created with regional evidence and affected transaction count.</small>}</div>;
}
function Bars({ data, active, onSelect }) { const max = Math.max(...data.map((item) => item.count)); return <div className="bars">{data.map((item) => <button className={active === item.label ? "selected" : ""} key={item.label} onClick={() => onSelect(item.label)}><span>{item.label}</span><div><i style={{ width: `${(item.count / max) * 100}%` }} /></div><b>{item.count}</b></button>)}</div>; }
function Distribution({ title, data }) { const entries = Object.entries(data).sort((a, b) => b[1] - a[1]).slice(0, 4); const max = entries[0]?.[1] || 1; return <div className="distribution"><span>{title}</span>{entries.map(([label, count]) => <div key={label}><small>{label}</small><i style={{ width: `${(count / max) * 100}%` }} /><b>{count}</b></div>)}</div>; }
function InvestigationDrawer({ item, result, onClose }) {
  const [incidentOpen, setIncidentOpen] = useState(false);
  return <div className="drawer-backdrop" onClick={onClose}><aside className="investigation-drawer" onClick={(event) => event.stopPropagation()}><button className="close-button" onClick={onClose}>CLOSE ×</button><span className="eyebrow">TRANSACTION INVESTIGATION</span><h2>{item.transaction_id}</h2><div className="drawer-facts"><span>AMOUNT <b>{formatMoney(item.amount)}</b></span><span>COUNTRY <b>{item.country}</b></span><span>FAILURE <b>{item.failure_reason}</b></span><span>RECOVERABILITY <b>{Math.round(item.recoverability * 100)}%</b></span></div><div className="drawer-diagnosis"><span className="eyebrow">ROOT CAUSE</span><h3>{item.failure_reason}</h3><p>{result.policy.label}. Confidence {result.confidence}%.</p><ul>{result.evidence.map((evidence) => <li key={evidence}>{evidence}</li>)}</ul></div><div className="drawer-actions"><button className="text-button" onClick={() => setIncidentOpen(true)}>CREATE RAZORPAY INCIDENT <span>↗</span></button><button className="text-button">VIEW AFFECTED TRANSACTIONS <span>↗</span></button></div>{incidentOpen && <div className="incident-preview"><span className="eyebrow">SIMULATED INCIDENT PREVIEW</span><h3>Systemic payment issue</h3><p><strong>Problem:</strong> {item.failure_reason} detected in {item.issuer_region}.</p><p><strong>Affected transaction:</strong> {item.transaction_id}</p><p><strong>Estimated impact:</strong> {formatMoney(item.amount)}</p><p><strong>Evidence:</strong> {result.similar} similar failures, confidence {result.confidence}%.</p><button className="primary-button" onClick={() => setIncidentOpen(false)}>CLOSE PREVIEW</button></div>}</aside></div>;
}
function Impact({ onBack, simulation }) { return <main className="impact-screen"><header className="merchant-header"><button className="brand-button" onClick={onBack}>RAZORRECOVER</button><span className="merchant-id">SIMULATED RECOVERY / IMPACT</span></header><div className="impact-content"><span className="eyebrow">SIMULATED RECOVERY</span><h1>Revenue that<br /><span>didn't disappear.</span></h1><p>This comparison is deterministic synthetic analysis, not real financial recovery.</p><div className="impact-grid">{simulation && [["BASELINE", formatMoney(simulation.baseline)], ["RAZORRECOVER", formatMoney(simulation.razorRecover)], ["INCREMENTAL", `+${formatMoney(simulation.incremental)}`]].map(([label, value]) => <div key={label}><span>{label}</span><strong>{value}</strong></div>)}</div><button className="text-button" onClick={onBack}>RETURN TO COMMAND CENTER <span>↗</span></button></div></main>; }

export default App;