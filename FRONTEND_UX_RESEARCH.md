# GRACE Frontend UX Research and Adaptation

## Conclusion

The current GRACE frontend already has a credible visual foundation. The largest usability opportunity is not adding more decoration. It is making financial work easier to understand and safer to complete. The visual direction is the **Quiet Financial System** implemented in `client/src/index.css`: an ink/grey surface hierarchy with **Action Blue (`#0066CC`)** as the single accent, chosen and documented there for its 5.0:1 contrast on white (an earlier "burnt orange" direction was superseded during implementation and is retired — see the `index.css` comment repointing legacy clay/orange token aliases on-system). The interaction layer prioritizes a clearer dashboard sequence, keyboard-operable financial records, and inline validation for high-risk expense fields.

## Current flow assessment

The dashboard currently combines a hero, an urgent LINE-slip banner, balance information, monthly metrics, record actions, secondary shortcuts, budgets, and recent transactions. The underlying content is useful, but the user has to infer the relationship between overview data, actions, and follow-up work. The implemented change groups the record-actions zone under an explicit `aria-label="การดำเนินการหลัก"` (`HomeDashboardTab.tsx`, `PrimaryActions.tsx`) while retaining the existing role-gated routes and components; the overview/tracking zones are visually separated but do not yet carry the same explicit landmark labeling.

The transaction and expense screens use a desktop table and mobile cards. Previously, rows and cards were activated through `onClick` handlers on non-interactive elements. This created a keyboard and assistive-technology gap. The implementation now exposes native route links, visible focus rings, table captions, column scopes, and row headers. Financial rows remain visually compact while their detail destination becomes discoverable and operable.

The expense form previously reported required-field failures only through a toast after submit. It now shows field-level messages for amount, description, and fund selection. The first invalid field receives focus, the input exposes `aria-invalid`, and the amount field explains the expected baht precision. Server validation remains authoritative.

## Research findings adapted

### Information architecture

Progressive disclosure recommends showing the most important options first and placing less frequent options behind a secondary layer. The dashboard grouping follows this principle without removing existing functionality. A task-list pattern also suggests that actionable work should carry a visible status, which supports the existing pending-slip banner and provides a basis for future role-aware attention items.

### Financial workflow UX

Inline validation reduces the cost of discovering errors in forms. For financial approvals and records, status labels must not imply a stronger business state than the data supports. The frontend therefore no longer falls back to “อนุมัติแล้ว” when a record has no status. It uses **ไม่ทราบสถานะ** instead. The shared badge also distinguishes `active` from `approved`, and adds explicit `draft`, `submitted`, `needs_review`, and `unknown` states.

Approval confirmation and audit timelines should not be simulated from frontend assumptions. Those improvements require authoritative policy, decision, and audit data from the server. They remain follow-up candidates rather than being fabricated in this UI pass.

### Mobile and accessibility

A financial table must preserve the relationship between its headers, records, amounts, and statuses. Captions, `scope` attributes, row headers, keyboard-operable links, visible focus, and non-color status text provide a low-risk improvement that works with the existing responsive design. On mobile, the detail link is visible in the record title and avoids wrapping interactive buttons inside another clickable card.

## Implemented scope

| Area | Adaptation | Status |
|---|---|---|
| Dashboard | Overview → actions → tracking sections | Implemented |
| Transactions | Native detail links, table caption, `scope`, row header, unknown status | Implemented |
| Expenses | Native detail links, table caption, `scope`, row header, unknown status | Implemented |
| Expense form | Inline amount/description/fund errors, first-error focus, ARIA state, amount helper text | Implemented |
| Shared status badge | Explicit active, inactive, draft, submitted, needs-review, unknown labels | Implemented |
| Global visual language | Quiet Financial System: ink/grey surface ramp, `#0066CC` Action Blue as the single accent (5.0:1 on white), `#0071E3` focus/pressed ring | Implemented |

## Recommended next UX tasks

The next high-value frontend task is to group the global navigation by user task while reusing the existing authorization filter. The next data-dependent task is an approval review surface that displays authoritative request evidence and decision context. A transaction audit timeline should follow only after an audit-history endpoint is available. Finally, the app should receive a 320 CSS-pixel and 400% zoom browser pass across finance routes.

## Verification

- `pnpm check`: PASS
- `pnpm test`: PASS — 244 tests passed, 36 integration/workflow tests skipped
- `pnpm build`: PASS
- `git diff --check`: PASS
- Live database, RLS, and production browser verification: NOT VERIFIED

## References

[1]: https://www.nngroup.com/articles/progressive-disclosure/ "Progressive Disclosure — Nielsen Norman Group"
[2]: https://design-system.service.gov.uk/components/task-list/ "Task list — GOV.UK Design System"
[3]: https://designsystem.digital.gov/components/validation/ "Validation — U.S. Web Design System"
[4]: https://www.nngroup.com/articles/errors-forms-design-guidelines/ "Error-Message Guidelines for Forms — Nielsen Norman Group"
[5]: https://www.w3.org/TR/WCAG22/ "Web Content Accessibility Guidelines (WCAG) 2.2"
[6]: https://designsystem.digital.gov/components/table/ "Table — U.S. Web Design System"
[7]: https://www.nngroup.com/articles/mobile-tables/ "Mobile Tables — Nielsen Norman Group"
[8]: https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html "Target Size (Minimum) — WCAG 2.2"
[9]: https://www.w3.org/WAI/WCAG22/Understanding/reflow.html "Reflow — WCAG 2.2"
