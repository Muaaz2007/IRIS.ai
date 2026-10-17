# IRIS.ai — UAE PDPL Compliance Notes

How this build behaves with respect to the **UAE Personal Data Protection Law**
(**Federal Decree-Law No. 45 of 2021**, in force **2 January 2022**) and its
**Executive Regulations**, and what remains to be done before it can be called
compliant.

> **This is an engineering mapping, not legal advice.** The Executive Regulations
> had not been verifiably published in the sources checked while writing this
> document, so nothing here depends on a regulation number or deadline. Confirm
> the current position with UAE counsel before relying on it.

**Primary sources:** UAE Government data-protection page
(<https://u.ae/en/about-the-uae/digital-uae/data/data-protection-laws>) · PDPL text
and article numbering (<https://legaladviceme.com/legislation/166/uae-federal-decree-law-45-2021-protection-personal-data>) ·
DLA Piper UAE data-protection overview
(<https://www.dlapiperdataprotection.com/countries/uae-general/law.html>) ·
Chambers UAE Data Protection & Privacy 2026
(<https://practiceguides.chambers.com/practice-guides/data-protection-privacy-2026/uae/trends-and-developments>).

---

## 1. Status of the law (as researched)

| Item | Position |
|------|----------|
| Statute | Federal Decree-Law No. 45 of 2021 on the Protection of Personal Data (PDPL); in force 2 January 2022 |
| Executive Regulations | Article 28 of the PDPL requires the Cabinet to issue Executive Regulations; compliance duties run from their publication (Article 29). **No issued Regulations could be verified** in the sources consulted (DLA Piper reported them unpublished as of Jan 2025; the Chambers 2026 guide still describes the federal implementing regulations as not issued). Secondary sites attributing a specific Cabinet Decision number should not be trusted without an official source. |
| Regulator | **UAE Data Office**, established by Federal Decree-Law No. 44 of 2021; the PDPL assigns it breach oversight, cross-border transfer and guidance roles. Reported as not yet fully operational (Chambers, March 2026). |
| Breach timeline | The statute says the controller must notify the Data Office **immediately**; specific procedures/periods are left to the Executive Regulations. **Do not assume a 72-hour deadline applies.** |
| Penalties | Article 26 leaves the violations and administrative penalties to be specified by the Cabinet on the Data Office's proposal. **No official penalty schedule was verified** — widely quoted fine ranges are not confirmed statutory amounts. |

## 2. Is an on-premise gateway "out of scope"?

**No.** A chat gateway processes personal data whenever a prompt identifies a
person or can be linked to one. What this build's on-premise design *does* change
is **where** processing happens: prompts, model output and logs stay on the
hosting machine, so the cross-border transfer questions in Articles 22–23 are
avoided for the prompt path — provided backups, telemetry, support access and
monitoring also stay inside the jurisdiction.

## 3. Data inventory

| Data | Where it lives | Legal character |
|------|----------------|-----------------|
| Prompt text | **RAM only** — never written to disk or sent off-box | Personal data if it identifies someone (or is linkable) |
| Model output | **RAM only** (plus the browser's `localStorage` for conversation history) | Same |
| Pseudonymous client id | Audit log (`logs/audit.log`) | Pseudonymised personal data — still personal data if re-linkable |
| Risk score, rule flags, decision, strike count | Audit log | Metadata about the interaction, not content |
| Client IP address | Processed transiently to derive the HMAC id; not stored | Personal data (transient) |
| Raw IP in access logs | nginx, if enabled | Personal data — set a short retention |

**Nothing leaves the machine:** no cloud LLM call, no telemetry, no analytics SDK
in the frontend, no third-party fonts or CDNs in the built UI.

## 4. PDPL principles → implementation

| PDPL theme (articles) | What IRIS does | Evidence / code |
|-----------------------|----------------|-----------------|
| **Lawful basis & consent (Art. 4, 6)** | Deployment decision: the operator must pick a basis (typically consent collected at sign-in, or the Art. 4 exceptions). The software provides the notice text hook and a documented purpose ("screen prompts for safety-bypass and harmful intent"), and stores no prompt content that could be repurposed. | This document; `docs/SYSTEM_ARCHITECTURE.md` §4 |
| **Purpose limitation, fairness, transparency (Art. 5)** | One purpose only: safety screening to decide ALLOW / WARN / BLOCK. Prompts are not used for training, profiling, marketing or model improvement. The sidebar and per-turn trace show the user what happened. | `security/enforcement.py`, `frontend/src/components/PipelineTrace.tsx` |
| **Data minimisation (Art. 5)** | Only the data needed for the decision is retained: pseudonymous id, score, flags, strikes, verdict, timestamp. No prompt text, no output text, no raw IP. Prompt length is capped (4,000 chars) to limit accidental ingestion of large personal documents. | `security/enforcement.py:log_audit()`, `security/checks.py:MAX_PROMPT_LENGTH` |
| **Pseudonymisation (Art. 1, 5, 7)** | Client identity is an **HMAC-SHA256 of the client address with a server-side secret** → `anon-…`; the secret is never in the repository (`SENTINEL_SECRET`) and, when set, the raw address cannot be recovered from the log. Note pseudonymisation ≠ anonymisation: with the key, ids are still linkable, so treat the log as personal data. | `security/session.py:hash_id()` |
| **Retention (Art. 5, 8)** | Prompts and answers are never retained (RAM only). The audit log is the only persisted artefact; the operator sets a retention period and rotates it. Strike state expires automatically after 600 s. | `logs/audit.log`, `STRIKE_WINDOW_SECONDS`, `DEPLOYMENT.md` §3.6 |
| **Security of processing (Art. 7, 20)** | On-premise by design; HMAC pseudonymisation; length caps; TLS at the ingress; systemd hardening (`NoNewPrivileges`, `ProtectSystem=strict`, single writable path); model and dependency versions reported by `/api/health` so a swapped artifact is visible. | `DEPLOYMENT.md` §3.4–3.5, `api/main.py:health()` |
| **Fail-safe, not fail-open** | If the classifier is missing or returns an unusable score, the system refuses rather than allows (`BLOCK` on invalid score; rules-only mode otherwise). | `security/enforcement.py:decide()` |
| **Data-subject rights (Art. 13–19)** | Access/erasure for stored data is straightforward because almost nothing is stored: the audit log holds only an HMAC id. Operators must still provide a request channel; erasing an individual's audit lines (or the whole log) is the operation to document and log itself. | This section; operations runbook |
| **Automated decisions (Art. 13–19)** | A WARN/BLOCK is an automated decision about a *request*, not about a person, and it has no legal or similarly significant effect beyond not answering. It is, however, recorded, user-visible, and reversible by an operator (`POST /api/sentinel/reset`) — which is the human-review hook if your DPIA treats it as a covered automated decision. | `api/main.py:sentinel_reset()` |
| **DPIA / new technology (Art. 20–21)** | Recommended before production: document the purpose, the false-positive/negative behaviour (3.95 % FPR / 4.65 % FNR, see EVALUATION.md) and the complaint path. Ship this file, `THREAT_MODEL.md` and `EVALUATION.md` as the DPIA annex. | `docs/EVALUATION.md`, `docs/THREAT_MODEL.md` |
| **Records of processing (Art. 7–8)** | `COMPONENT_SPEC.md` lists components, data categories, purposes and code locations; the audit log supplies per-decision evidence. | `docs/COMPONENT_SPEC.md` |
| **Cross-border transfer (Art. 22–23)** | No transfer occurs on the prompt path: the browser talks to the local gateway, the gateway talks to a local or privately reachable model server. Verify that **backups, log shipping, support access and monitoring** stay in-country too; if you host the gateway in the UAE but ship logs abroad, Art. 22/23 analysis applies to those logs. | `docs/DEPLOYMENT.md` §1, §3.6 |
| **Breach notification (Art. 9)** | The gateway stores no prompt content, so a gateway breach exposes pseudonymous metadata. The process must still be: processor notifies the controller **immediately**, controller notifies the Data Office and, where required, affected individuals — with nature/cause, approximate numbers, likely effects and remediation. Do not assume a fixed 72-hour clock under the federal law. | Runbook §6 |
| **Sectoral carve-outs** | Health data and banking/credit data have their own rules; if IRIS is deployed where such data appears in prompts, those regimes apply in addition. | DLA Piper / Chambers summaries above |

## 5. Data-residency statement (for your privacy notice)

> Prompts and answers processed by IRIS.ai are handled in memory on the
> organisation's own infrastructure inside the United Arab Emirates. They are not
> transmitted to any external provider, not used to train models, and not retained.
> For each request the system stores only a pseudonymous identifier, a risk score,
> rule flags, a strike count, the verdict and a timestamp, for security and
> accountability purposes, and retains them for **N days** (set by the operator).

Fill in **N**, the controller's identity, the contact channel for data-subject
requests, and the name of any processor involved (hosting, log sink, backup).

## 6. Breach response runbook (short form)

1. **Contain** — stop the service (`systemctl stop iris-gateway`), snapshot
   `/var/log/iris/audit.log` and the system journal, preserve the host.
2. **Assess** — was any prompt content exposed? (By design it is not stored, so the
   answer is usually "no"; prove it from the code and the log schema.)
3. **Notify** — processor → controller immediately; controller → Data Office
   immediately, and affected individuals where Art. 9 conditions are met.
4. **Remediate** — rotate `SENTINEL_SECRET` (all existing pseudonyms become
   unlinkable), patch, redeploy, and re-run the go-live verification in
   [DEPLOYMENT.md](DEPLOYMENT.md) §6.
5. **Document** — keep the timeline, the data categories involved and the actions
   taken; that record is what the Data Office will ask for.

## 7. Gaps to close before production

- [ ] Name a controller, a DPO/contact and a documented lawful basis, with the matching consent or privacy notice text.
- [ ] Fix the audit-log retention period and enforce it with `logrotate`.
- [ ] Move the audit log to a write-once sink; a local log can be deleted by anyone with the key.
- [ ] Replace the pseudonymous client id with a real authenticated subject id if per-user accountability is required.
- [ ] Confirm the Executive Regulations' status and any Data Office guidance before go-live.
- [ ] If prompt content must be retained for audit, redo the DPIA — retention changes the risk profile completely.
