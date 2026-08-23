# CocoFrame application AI guide

- Read the nearest existing code and run `cocoframe inspect` before adding a route, component, island, schema, or service.
- For a new user-facing feature, workflow, data model, or integration whose behavior is not fully specified, create or resume `specs/<feature>/spec.json` with `cocoframe spec`.
- Ask only the next adaptive CocoSpecs question batch. Record explicit answers, disclosed assumptions, deferrals, and reviewed not-applicable decisions.
- Generate and review the PRD, flowchart, data model, acceptance criteria, decision log, and tasks. Do not implement until the canonical CocoSpec state is `approved`.
- Treat `spec.json` as the source of truth. Regenerate adjacent Markdown and Mermaid artifacts instead of editing their decisions independently.
- For work based on an image or website, create or resume `refs/<name>/ref.json` with `cocoframe ref` and audit the captured component inventory.
- Record every visual requirement as reuse or missing. Ask the user for explicit consent before creating each missing component; the original page request is not consent.
- Preview the actual temporary TSX candidate, record concrete feedback, and iterate until approval or cancellation. Promote only approved source and remove the temporary preview.
- After implementation, create or resume `qa/<feature>/qa.json` from the approved CocoSpec with `cocoframe qa`; include a completed CocoRef when applicable.
- Ask the adaptive CocoQA questions before execution, run configured quality gates, and record concise sanitized evidence and defects. Never store secrets or raw sensitive process output.
- Do not declare a feature ready for release until every required QA case and gate passes, no defect remains open, and the canonical CocoQA state is `approved`.
- Reuse existing CocoFrame routes, components, contracts, UI primitives, schemas, and middleware before creating application-specific equivalents.
- Keep rendering server-first. Put genuine browser interaction in `app/islands/*.island.tsx` with a stable lowercase island name.
- Keep page `load`, `meta`, `view`, and optional `action` together. Successful form actions normally redirect with 303; invalid forms rerender with 422.
- Keep secrets server-only, validate inputs, preserve explicit authorization, and never log cookies, tokens, authorization headers, passwords, or request bodies.
- Run `npm run check`, `npm run inspect`, and `npm run build` before handoff. Run configured project and browser tests for islands, forms, visual, CSP, or responsive behavior.
