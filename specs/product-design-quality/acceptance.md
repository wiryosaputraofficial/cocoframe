# Acceptance Criteria: Product Design Quality

- [ ] Given an existing component inventory, when a feature is designed, then existing components are audited and returned before a new component is proposed.
- [ ] Given a project design profile, when semantic color, spacing, radius, typography, or elevation tokens are changed, then supported components adopt the approved values without forking their primitives.
- [ ] Given a component variant, when its styling is inspected, then project appearance is derived from declared semantic tokens rather than duplicated hardcoded project colors.
- [ ] Given an approved spacing and radius scale, when related screens and components are audited, then their layout rhythm and shapes use the approved scale consistently.
- [ ] Given text or an interactive control, when contrast is measured, then it satisfies the approved WCAG 2.2 AA target.
- [ ] Given supported viewports from 320 pixels through 4K and approved text zoom, when the interface is rendered, then it remains usable without unintended horizontal overflow or clipped content.
- [ ] Given interface icons, when they are audited, then they come from the approved catalog and use consistent family, size, stroke, alignment, and accessible labeling.
- [ ] Given a completed CocoRef, when CocoQA is created, then every approved visual criterion remains traceable to a QA case and sanitized evidence.
- [ ] Given no visual reference, when product-design QA runs, then design-system checks still execute and visual-fidelity checks are explicitly not applicable.
- [ ] Given a critical or high product-design defect, when release approval is attempted, then CocoQA refuses approval until the defect is resolved.
- [ ] Given design evidence, when it is recorded or reported, then sensitive data is redacted and screenshots are persisted only in declared approved artifacts.
- [ ] Given a server-first component, when project styling is customized, then no browser runtime is introduced solely for visual appearance.
- [ ] Given two supported AI providers, when they perform the same design-quality workflow, then they use the same provider-independent contracts and receive structurally equivalent results.
- [ ] Given a completed workflow, when the AI reports completion, then it lists reused components, token decisions, reference fidelity, quality evidence, defects, and unresolved visual risks.
