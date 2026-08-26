import assert from "node:assert/strict";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { runQaCommand } from "../packages/cli/src/qa-command.ts";
import {
  answerCocoQa,
  approveCocoQa,
  checkCocoQa,
  closeCocoQaDefect,
  createCocoQa,
  nextCocoQaQuestions,
  parseCocoQa,
  recordCocoQaCase,
  recordCocoQaGate,
  renderCocoQaArtifacts,
  addCocoQaDefect,
  type CocoQa,
} from "../packages/qa/src/index.ts";
import {
  answerCocoSpec,
  approveCocoSpec,
  createCocoSpec,
  nextQuestions,
  type CocoSpec,
  type CocoSpecQuestion,
  type CocoSpecValue,
} from "../packages/specs/src/index.ts";

const timestamp = "2026-08-23T00:00:00.000Z";

test("builds an adaptive, traceable QA plan from approved product evidence", () => {
  const qa = createCocoQa({
    feature: "Login Page",
    mode: "thorough",
    sources: [{ kind: "cocospec", id: "login-page", state: "approved", file: "specs/login-page/spec.json" }],
    acceptanceCriteria: ["Valid credentials redirect the member to the dashboard."],
    referenceCriteria: [{ id: "auth-card", description: "Approved responsive authentication card" }],
    uxCriteria: [{ id: "login-error", description: "Login error state matches approved CocoUX evidence.", category: "visual" }],
    gates: [{ id: "check", script: "check" }, { id: "e2e", script: "test:e2e" }],
    now: timestamp,
  });

  assert.equal(qa.feature.id, "login-page");
  assert.ok(nextCocoQaQuestions(qa).length <= 4);
  assert.ok(qa.cases.some(({ source }) => source === "cocospec:acceptance-1"));
  assert.ok(qa.cases.some(({ source }) => source === "cocoref:auth-card"));
  assert.ok(qa.cases.some(({ source }) => source === "cocoux:login-error"));
  assert.ok(qa.cases.some(({ id }) => id === "framework-server-first"));
  assert.equal(qa.gates[1]?.script, "test:e2e");
});

test("blocks release until questions, cases, gates, and defects are resolved", () => {
  let qa = resolveQa(createCocoQa({
    feature: "checkout",
    acceptanceCriteria: ["A valid order is created exactly once."],
    gates: [{ id: "check", script: "check" }],
    now: timestamp,
  }));
  assert.equal(qa.state, "ready");

  for (const item of qa.cases) qa = recordCocoQaCase(qa, item.id, "passed", `Verified ${item.id}.`, timestamp);
  qa = recordCocoQaGate(qa, "check", "passed", { durationMs: 42, exitCode: 0, now: timestamp });
  assert.equal(checkCocoQa(qa).passed, true);
  assert.equal(qa.state, "passed");

  qa = addCocoQaDefect(qa, {
    id: "duplicate-submit",
    title: "Repeated submission creates two orders",
    severity: "high",
    steps: ["Submit the checkout form twice before navigation completes."],
  }, timestamp);
  assert.equal(qa.state, "failed");
  assert.throws(() => closeCocoQaDefect(qa, "duplicate-submit", "accepted", "Known risk", timestamp), /must be resolved/);
  qa = closeCocoQaDefect(qa, "duplicate-submit", "resolved", "The server now enforces an idempotency key.", timestamp);
  qa = approveCocoQa(qa, timestamp);
  assert.equal(qa.state, "approved");

  const artifacts = renderCocoQaArtifacts(qa);
  assert.match(artifacts["test-plan.md"], /A valid order is created exactly once/);
  assert.match(artifacts["traceability.md"], /cocospec:acceptance-1/);
  assert.match(artifacts["qa-report.md"], /State:\*\* approved/);
  assert.match(artifacts["defects.md"], /duplicate-submit/);
  assert.deepEqual(parseCocoQa(JSON.parse(JSON.stringify(qa))), qa);
  assert.throws(() => parseCocoQa({ version: 2 }), /Unsupported CocoQA version/);
});

test("runs the CLI lifecycle from an approved CocoSpec through release approval", async () => {
  const temporaryRoot = path.resolve(".tmp-tests");
  await mkdir(temporaryRoot, { recursive: true });
  const project = await mkdtemp(path.join(temporaryRoot, "cocoframe-qa-"));
  try {
    await writeFile(path.join(project, "package.json"), JSON.stringify({
      scripts: { check: "node -e \"process.exit(0)\"" },
    }), "utf8");
    let spec = createCocoSpec({ feature: "login", brief: "Members log in and reach the dashboard.", now: timestamp });
    spec = resolveSpec(spec);
    spec = approveCocoSpec(spec, timestamp);
    await mkdir(path.join(project, "specs", "login"), { recursive: true });
    await writeFile(path.join(project, "specs", "login", "spec.json"), `${JSON.stringify(spec, null, 2)}\n`, "utf8");

    await writeFile(path.join(project, "cocoframe.design.json"), await readFile(path.resolve("examples/basic/cocoframe.design.json")), "utf8");

    const output: string[] = [];
    const errors: string[] = [];
    const io = { log: (message: string) => output.push(message), error: (message: string) => errors.push(message) };
    assert.equal(await runQaCommand(["create", "login", "--spec", "login", "--design", "cocoframe.design.json", "--project", project], project, io), 0);

    const file = path.join(project, "qa", "login", "qa.json");
    const created = parseCocoQa(JSON.parse(await readFile(file, "utf8")));
    assert.ok(created.sources.some(({ kind }) => kind === "design-profile"));
    assert.ok(created.cases.some(({ source }) => source === "design:component-reuse"));
    let qa = resolveQa(parseCocoQa(JSON.parse(await readFile(file, "utf8"))));
    await writeFile(file, `${JSON.stringify(qa, null, 2)}\n`, "utf8");
    assert.equal(await runQaCommand(["run", "login", "--gate", "check", "--project", project], project, io), 0);

    qa = parseCocoQa(JSON.parse(await readFile(file, "utf8")));
    for (const item of qa.cases) {
      assert.equal(await runQaCommand(["record", "login", item.id, "pass", "--evidence", `Verified ${item.id}.`, "--project", project], project, io), 0);
    }
    assert.equal(await runQaCommand(["defect", "login", "focus-loss", "--title", "Focus is lost", "--severity", "low", "--steps", "Submit invalid form", "--project", project], project, io), 0);
    assert.equal(await runQaCommand(["resolve", "login", "focus-loss", "Focus now moves to the error summary.", "--project", project], project, io), 0);
    assert.equal(await runQaCommand(["check", "login", "--project", project], project, io), 0);
    assert.equal(await runQaCommand(["approve", "login", "--project", project], project, io), 0);

    assert.equal(parseCocoQa(JSON.parse(await readFile(file, "utf8"))).state, "approved");
    for (const artifact of ["test-plan.md", "traceability.md", "qa-report.md", "defects.md"]) {
      assert.ok((await readFile(path.join(project, "qa", "login", artifact), "utf8")).length > 40);
    }
    assert.deepEqual(errors, []);
    assert.ok(output.some((message) => message.includes("Approved CocoQA login")));

    const changedProfile = JSON.parse(await readFile(path.join(project, "cocoframe.design.json"), "utf8"));
    changedProfile.updatedAt = "2026-08-24T01:00:00.000Z";
    await writeFile(path.join(project, "cocoframe.design.json"), JSON.stringify(changedProfile, null, 2), "utf8");
    await assert.rejects(
      () => runQaCommand(["status", "login", "--project", project], project, io),
      /DESIGN_STATE_CONFLICT/,
    );
  } finally {
    await rm(project, { recursive: true, force: true });
  }
});

function resolveQa(initial: CocoQa): CocoQa {
  let qa = initial;
  for (let iteration = 0; iteration < 20; iteration++) {
    const [question] = nextCocoQaQuestions(qa, 1);
    if (!question) return qa;
    qa = answerCocoQa(qa, question.id, `Reviewed ${question.id} requirements.`, { now: timestamp });
  }
  throw new Error("Adaptive CocoQA interview did not converge.");
}

function resolveSpec(initial: CocoSpec): CocoSpec {
  let spec = initial;
  for (let iteration = 0; iteration < 100; iteration++) {
    const [question] = nextQuestions(spec, 1);
    if (!question) return spec;
    spec = answerCocoSpec(spec, question.id, specAnswer(question), { now: timestamp });
  }
  throw new Error("Adaptive CocoSpecs interview did not converge.");
}

function specAnswer(question: CocoSpecQuestion): CocoSpecValue {
  if (question.id === "acceptance-criteria") return ["Given valid credentials, when submitted, then the member reaches the dashboard."];
  if (question.id === "happy-path") return ["Open login", "Submit valid credentials", "Reach dashboard"];
  if (question.type === "choice") return question.options?.[0] ?? "none";
  if (question.type === "list") return [`Reviewed ${question.id}`];
  if (question.type === "structured") return { decision: `Reviewed ${question.id}` };
  return `Reviewed ${question.id}`;
}
