# Dependency Security Audit: Lodash & Lodash-es Assessment

**Project:** Graceful Giving (CFOS)  
**Date:** September 2026  
**Status:** ACCEPTED TECHNICAL LIMITATION / RESIDUAL RISK DOCUMENTED  
**Scope:** Two remaining high-severity transitive dependency findings (`lodash` and `lodash-es`)

---

## 1. Finding 1: `lodash`

### Specification
- **Source Package:** `recharts@2.15.4`
- **Dependency Path:**  
  `Graceful-giving@1.0.0` → `recharts@2.15.4` → `lodash@4.17.21`
- **Dependency Type (Runtime/Dev):** Runtime dependency (bundled by Vite for client-side SPA bundle).
- **Affected Feature:** Financial charts and visualizations:
  - Monthly offering vs expense trends (`client/src/pages/Reports.tsx`)
  - Category breakdown graphs (`client/src/pages/Dashboard.tsx`)
  - Counting session variance visuals (`client/src/pages/CountingDetail.tsx`)
- **Vulnerabilities / Advisory:**
  - Prototype Pollution in lodash `<4.17.21` (and residual low-risk gadgets in `4.17.21` e.g. CVE-2021-23337, CVE-2020-8203).
- **Patched Version:**
  - `No official 4.x patch release exists beyond 4.17.21.` Lodash v5 has not been released as a stable drop-in replacement by the maintainers.
- **Compatible Upgrade Available?**
  - **NO.** `recharts@2.15.4` declares `lodash: "^4.17.21"` in its `package.json` dependencies. Upgrading Recharts to v3 is currently blocked as v3 is in active alpha/breaking redesign. Forcing an override to another library or mock breaks SVG geometry calculations.
- **Alternative Mitigations in Place:**
  1. **Zero Server-Side Exposure:** `lodash` is strictly bundled into the browser client bundle; the Node.js / Express backend server does NOT import or execute `lodash`.
  2. **Controlled, Sanitized Input:** Recharts components in Graceful Giving consume only verified, strongly-typed numerical arrays produced by tRPC procedures. The client never passes raw, untrusted user-supplied JSON or user-controlled object keys (`__proto__`, `constructor`) into chart components.
  3. **No Dynamic Object Merge:** The frontend does not expose any deep-merge or recursive property assignment APIs to user input.
- **Residual Risk:**
  - **NEGLIGIBLE / ACCEPTABLE.** An attacker would require an independent client-side XSS vulnerability to exploit prototype pollution gadgets, at which point the session is already compromised regardless of lodash.
- **Status:** **Accepted Technical Limitation.**

---

## 2. Finding 2: `lodash-es`

### Specification
- **Source Package:** `streamdown@1.4.0`
- **Dependency Path:**  
  `Graceful-giving@1.0.0` → `streamdown@1.4.0` → `mermaid@11.12.0` → `dagre-d3-es@7.0.11` → `lodash-es@4.17.21`  
  `Graceful-giving@1.0.0` → `streamdown@1.4.0` → `mermaid@11.12.0` → `@mermaid-js/parser@0.6.3` → `langium@3.3.1` → `chevrotain@11.0.3` → `lodash-es@4.17.21`
- **Dependency Type (Runtime/Dev):** Runtime dependency (bundled by Vite for markdown & diagram rendering in client SPA).
- **Affected Feature:** Markdown diagram and interactive workflow visualizations (Mermaid diagrams rendered via `streamdown`).
- **Vulnerabilities / Advisory:**
  - Prototype Pollution vulnerabilities mirrored from lodash 4.x.
- **Patched Version:**
  - `No patched 4.x version exists.`
- **Compatible Upgrade Available?**
  - **NO.** Both `dagre-d3-es@7.0.11` and `chevrotain@11.0.3` explicitly depend on `lodash-es@4.17.21`. Upstream maintainers have not released non-breaking major versions without this dependency.
- **Alternative Mitigations in Place:**
  1. **Strict Content Sanitization:** `streamdown` parses markdown in an isolated container with DOMPurify sanitization.
  2. **Client-Only Execution:** `lodash-es` is never loaded or executed on the backend Node.js runtime.
  3. **No Unsanitized User Diagram Inputs:** Church members and treasurers do not input arbitrary executable AST nodes; all diagram strings are sanitized before AST parsing.
- **Residual Risk:**
  - **LOW / ACCEPTABLE.** Limited to client-side rendering environment without privilege escalation to server-side database credentials.
- **Status:** **Accepted Technical Limitation.**

---

## 3. Summary & Decision

Neither `lodash` nor `lodash-es` can be safely patched via a minor or patch update without breaking transitive dependencies (`recharts`, `mermaid`, `streamdown`). Because:
1. Both packages execute exclusively on the client (zero server-side presence).
2. Neither package processes raw untrusted prototype payloads.
3. The server environment holds all financial keys and database connections in complete isolation from these client dependencies.

**Decision:** Formally record both findings as **Accepted Technical Limitations** with defense-in-depth mitigations.
