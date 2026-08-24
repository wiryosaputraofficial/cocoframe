# Acceptance Criteria: CocoFrame Agent Bridge

- [ ] Given a supported AI client, when it connects through MCP, then it can discover every Agent Bridge tool together with its versioned input schema, output schema, description, and permission level.
- [ ] Given a valid CocoFrame workspace, when project.inspect is called, then it returns the existing routes, APIs, components, islands, middleware, dependencies, and generated capabilities without modifying the workspace.
- [ ] Given an existing framework capability, when the AI searches documentation, APIs, or components, then Agent Bridge returns the reusable capability and its source or documentation location before suggesting a new implementation.
- [ ] Given a new feature request, when the AI starts or resumes CocoSpecs, then Agent Bridge returns only the next adaptive question batch and preserves the canonical specification state.
- [ ] Given an image or website reference, when CocoRef is invoked, then existing components are audited before a missing component is proposed.
- [ ] Given an implemented feature with an approved CocoSpec, when CocoQA is invoked, then acceptance criteria, required gates, evidence, defects, and approval state remain traceable.
- [ ] Given a read-only operation, when it is executed, then no source file, generated artifact, Git state, package state, or external system is changed.
- [ ] Given an operation that may change state, when explicit approval has not been granted, then Agent Bridge refuses the operation and leaves all state unchanged.
- [ ] Given an approved mutation, when the operation is executed, then only the declared workspace targets and declared action are modified.
- [ ] Given a denied, expired, or cancelled approval, when execution is attempted, then no mutation occurs and a stable machine-readable diagnostic is returned.
- [ ] Given any workspace path supplied by an AI client, when it resolves outside the approved project root, then Agent Bridge rejects access.
- [ ] Given malformed input or an unsupported protocol version, when a tool is called, then Agent Bridge returns a versioned corrective error without crashing.
- [ ] Given secrets, cookies, authorization headers, tokens, or request bodies exist in the environment, when results and errors are returned, then none of those sensitive values are exposed or persisted.
- [ ] Given two supported AI providers, when they perform the same Agent Bridge workflow, then they use the same provider-independent tool contracts and receive structurally equivalent results.
- [ ] Given a completed workflow, when the AI reports completion, then the result includes the actions performed, approvals received, files or artifacts affected, quality evidence, and unresolved risks.
