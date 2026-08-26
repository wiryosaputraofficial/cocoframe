# CocoFrame Security Policy

CocoFrame is an experimental `0.x` framework. Security reports are welcome and
should be handled privately until a fix and disclosure plan are ready.

## Supported versions

Security fixes target the latest published version of each affected
`@cocoframe/*` package and `create-cocoframe`. Older `0.x` package versions may
not receive backports. PostgreSQL support currently covers server majors 14–18.

## Report a vulnerability

Use the repository's private **Security → Report a vulnerability** flow:

<https://github.com/wiryosaputraofficial/cocoframe/security/advisories/new>

Do not open a public issue for a suspected vulnerability. Include only the
minimum sanitized information needed to reproduce and assess it:

- affected package and exact version;
- impact and attacker prerequisites;
- minimal reproduction or proof of concept;
- expected and actual security boundary;
- suggested mitigation, if known;
- whether the report may be credited publicly.

Never submit production credentials, tokens, cookies, authorization headers,
personal data, private database contents, or unrelated proprietary source.

## Response process

Maintainers will aim to:

1. acknowledge the report and confirm a safe communication path;
2. reproduce and classify the impact;
3. identify affected versions and mitigations;
4. prepare focused tests, a fix, release notes, and coordinated package versions;
5. publish an advisory when users have an actionable upgrade path.

Response timing depends on project availability; this policy does not promise a
formal SLA.

## Security boundaries

Important framework boundaries include:

- HTML and metadata escaping by default;
- explicit raw-HTML APIs;
- strict Host, proxy, CORS, CSRF, CSP, and request-body semantics;
- signed-session integrity without pretending to provide authorization,
  password hashing, or a complete identity system;
- parameterized database values, connection release, transaction boundaries,
  mutation guards, and advisory-locked PostgreSQL migrations;
- sanitized public errors, readiness output, Doctor evidence, Agent Bridge
  records, and CocoQA evidence;
- workspace confinement, hash-bound role-aware mutation approval, and explicit
  product/UX/reference/QA approval boundaries;
- one AbortSignal across body parsing, application handling, database work, and
  response streaming.

Applications remain responsible for authorization policy, credential storage,
password hashing, identity-provider configuration, database permissions,
network isolation, deployment secrets, dependency updates, and incident
response.

## Safe research

Use local fixtures or data you are authorized to test. Do not access other
users' data, degrade public services, persist access, perform social
engineering, or publish exploit details before coordinated disclosure.

For ordinary configuration and runtime failures, use
[`docs/cocodoctor.md`](docs/cocodoctor.md) and
[`docs/troubleshooting.md`](docs/troubleshooting.md).
