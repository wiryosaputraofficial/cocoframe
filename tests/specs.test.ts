import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { runSpecCommand } from "../packages/cli/src/spec-command.ts";
import {
  answerCocoSpec,
  approveCocoSpec,
  checkCocoSpec,
  createCocoSpec,
  nextQuestions,
  parseCocoSpec,
  questionsFor,
  renderCocoSpecArtifacts,
  type CocoSpec,
  type CocoSpecQuestion,
  type CocoSpecValue,
} from "../packages/specs/src/index.ts";

const timestamp = "2026-08-23T00:00:00.000Z";

test("asks adaptive authentication, role, OAuth, and persistence questions", () => {
  let spec = createCocoSpec({
    feature: "Login Page",
    brief: "Users log in and continue to the dashboard.",
    now: timestamp,
  });

  assert.equal(spec.feature.id, "login-page");
  assert.equal(spec.answers.objective?.value, "Users log in and continue to the dashboard.");
  assert.ok(questionsFor(spec).some(({ id }) => id === "identity-methods"));
  assert.ok(!questionsFor(spec).some(({ id }) => id === "oauth-providers"));
  assert.ok(!questionsFor(spec).some(({ id }) => id === "data-model"));
  assert.ok(nextQuestions(spec).length <= 4);

  spec = answerCocoSpec(spec, "actors", ["Member", "Administrator"], { now: timestamp });
  spec = answerCocoSpec(spec, "identity-methods", ["Email and password", "Google OAuth"], { now: timestamp });
  spec = answerCocoSpec(spec, "persistence", "existing-and-new", { now: timestamp });

  const active = questionsFor(spec).map(({ id }) => id);
  assert.ok(active.includes("oauth-providers"));
  assert.ok(active.includes("role-routing"));
  assert.ok(active.includes("data-model"));
});

test("checks completeness, renders deterministic artifacts, and requires approval", () => {
  let spec = createCocoSpec({
    feature: "login",
    brief: "Users log in and continue to the dashboard.",
    mode: "standard",
    project: {
      routes: ["app/routes/dashboard.page.tsx", "app/routes/index.page.tsx"],
      dependencies: ["@cocoframe/auth"],
    },
    now: timestamp,
  });
  spec = answerCocoSpec(spec, "actors", ["Member", "Administrator"], { now: timestamp });
  spec = answerCocoSpec(spec, "identity-methods", ["Email and password", "Google OAuth"], { now: timestamp });
  spec = answerCocoSpec(spec, "persistence", "new", { now: timestamp });
  spec = resolveAll(spec);

  const result = checkCocoSpec(spec);
  assert.equal(result.complete, true);
  assert.equal(spec.state, "ready");
  const artifacts = renderCocoSpecArtifacts(spec);
  assert.match(artifacts["prd.md"], /# Login/);
  assert.match(artifacts["prd.md"], /app\/routes\/dashboard\.page\.tsx/);
  assert.match(artifacts["flow.mmd"], /^flowchart TD/m);
  assert.match(artifacts["flow.mmd"], /User submits valid credentials/);
  assert.match(artifacts["data-model.mmd"], /^erDiagram/m);
  assert.match(artifacts["data-model.mmd"], /User \|\|--o\{ Session/);
  assert.match(artifacts["acceptance.md"], /Given valid credentials/);
  assert.match(artifacts["tasks.md"], /Do not begin implementation/);

  const approved = approveCocoSpec(spec, timestamp);
  assert.equal(approved.state, "approved");
  const changed = answerCocoSpec(approved, "success-outcome", "A session is created safely.", { now: timestamp });
  assert.equal(changed.state, "ready");
  assert.throws(() => approveCocoSpec(createCocoSpec({ feature: "checkout", now: timestamp })), /unresolved questions/);
});

test("validates persisted specs and runs the CLI filesystem lifecycle", async () => {
  const project = await mkdtemp(path.join(os.tmpdir(), "cocoframe-specs-"));
  try {
    await mkdir(path.join(project, "app", "routes"), { recursive: true });
    await mkdir(path.join(project, "app", "islands"), { recursive: true });
    await writeFile(path.join(project, "package.json"), JSON.stringify({ dependencies: { "@cocoframe/auth": "0.0.4" } }), "utf8");
    await writeFile(path.join(project, "app", "routes", "dashboard.page.tsx"), "export default {};", "utf8");
    await writeFile(path.join(project, "app", "islands", "menu.island.tsx"), "export default {};", "utf8");
    const output: string[] = [];
    const errors: string[] = [];
    const io = { log: (message: string) => output.push(message), error: (message: string) => errors.push(message) };

    assert.equal(await runSpecCommand([
      "create", "login", "--brief", "Users log in and continue to the dashboard.", "--project", project, "--json",
    ], project, io), 0);
    await assert.rejects(
      runSpecCommand(["resume", "login", "--typo", "value", "--project", project], project, io),
      /Unknown option/,
    );
    const file = path.join(project, "specs", "login", "spec.json");
    let spec = parseCocoSpec(JSON.parse(await readFile(file, "utf8")));
    assert.deepEqual(spec.project?.routes, ["app/routes/dashboard.page.tsx"]);
    assert.deepEqual(spec.project?.islands, ["app/islands/menu.island.tsx"]);
    assert.deepEqual(spec.project?.dependencies, ["@cocoframe/auth"]);

    spec = answerCocoSpec(spec, "actors", ["Member"], { now: timestamp });
    spec = answerCocoSpec(spec, "identity-methods", ["Email and password"], { now: timestamp });
    spec = answerCocoSpec(spec, "persistence", "existing", { now: timestamp });
    spec = resolveAll(spec);
    await writeFile(file, `${JSON.stringify(spec, null, 2)}\n`, "utf8");

    assert.equal(await runSpecCommand(["check", "login", "--project", project], project, io), 0);
    assert.equal(await runSpecCommand(["generate", "login", "--project", project], project, io), 0);
    assert.equal(await runSpecCommand(["approve", "login", "--project", project], project, io), 0);
    assert.equal(parseCocoSpec(JSON.parse(await readFile(file, "utf8"))).state, "approved");
    for (const artifact of ["prd.md", "flow.mmd", "data-model.mmd", "acceptance.md", "decisions.md", "tasks.md"]) {
      assert.ok((await readFile(path.join(project, "specs", "login", artifact), "utf8")).length > 20);
    }
    assert.deepEqual(errors, []);
    assert.ok(output.some((message) => message.includes('"questions"')));
  } finally {
    await rm(project, { recursive: true, force: true });
  }

  assert.throws(() => parseCocoSpec({ version: 2 }), /Unsupported CocoSpec version/);
});

function resolveAll(initial: CocoSpec): CocoSpec {
  let spec = initial;
  for (let iteration = 0; iteration < 100; iteration++) {
    const [question] = nextQuestions(spec, 1);
    if (!question) return spec;
    spec = answerCocoSpec(spec, question.id, answerFor(question), { now: timestamp });
  }
  throw new Error("Adaptive CocoSpecs interview did not converge.");
}

function answerFor(question: CocoSpecQuestion): CocoSpecValue {
  if (question.id === "happy-path") return [
    "User opens the login page",
    "User submits valid credentials",
    "Server creates a verified session",
    "User is redirected to the dashboard",
  ];
  if (question.id === "acceptance-criteria") return [
    "Given valid credentials, when the form is submitted, then the user reaches the dashboard.",
    "Given invalid credentials, the response does not reveal whether the account exists.",
  ];
  if (question.id === "data-model") return {
    entities: [
      { name: "User", fields: [{ name: "id", type: "string", key: "PK" }, { name: "email", type: "string", key: "UK" }] },
      { name: "Session", fields: [{ name: "id", type: "string", key: "PK" }, { name: "userId", type: "string", key: "FK" }] },
    ],
    relationships: [{ from: "User", to: "Session", type: "||--o{", label: "has" }],
  };
  if (question.type === "choice") return question.options?.[0] ?? "none";
  if (question.type === "list") return [`Reviewed ${question.id} decision`];
  if (question.type === "structured") return { decision: `Reviewed ${question.id} decision` };
  return `Reviewed ${question.id} decision`;
}
