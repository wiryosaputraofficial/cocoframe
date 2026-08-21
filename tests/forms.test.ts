import assert from "node:assert/strict";
import test from "node:test";
import { CocoFrameApp, definePage, redirect } from "../packages/core/src/index.ts";
import { createForm, CsrfField } from "../packages/forms/src/index.ts";
import { jsx } from "../packages/jsx/src/index.ts";
import { schema } from "../packages/schema/src/index.ts";
import { csrfProtection } from "../packages/security/src/index.ts";

test("rerenders invalid forms with typed field state and CSRF protection", async () => {
  const form = createForm(schema.object({
    name: schema.string({ min: 2 }),
    email: schema.string({ format: "email" }),
    password: schema.string({ min: 8 }),
  }));
  let submitted = false;
  const app = new CocoFrameApp({ middleware: [csrfProtection({ secure: false, match: ({ url }) => url.pathname === "/contact" })] });
  app.page("/contact", definePage({
    meta: { title: "Contact" },
    action: form.action(() => { submitted = true; return redirect("/contact?sent=1", 303); }),
    view: (_data, context) => {
      const state = form.state(context);
      const name = form.field("name", state, { id: "name", describedBy: ["name-hint"] });
      const email = form.field("email", state, { id: "email" });
      return jsx("form", { method: "post", children: [
        jsx(CsrfField, { context }),
        jsx("input", { ...name }),
        state.errors.name?.[0] ? jsx("p", { id: "name-error", children: state.errors.name[0] }) : null,
        jsx("input", { ...email }),
        jsx("input", { name: "password", value: state.values.password }),
      ] });
    },
  }));

  const seed = await app.fetch(new Request("http://example.com/contact"));
  const initial = await seed.text();
  const token = /name="_csrf" value="([^"]+)"/.exec(initial)?.[1];
  const cookie = seed.headers.get("set-cookie")?.split(";", 1)[0];
  assert.ok(token && cookie);

  const invalid = await app.fetch(new Request("http://example.com/contact", {
    method: "POST",
    headers: { origin: "http://example.com", cookie, "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ _csrf: token, name: "x", email: "invalid", password: "short" }),
  }));
  const invalidBody = await invalid.text();
  assert.equal(invalid.status, 422);
  assert.equal(submitted, false);
  assert.match(invalidBody, /name="name" value="x" aria-invalid="true" aria-describedby="name-hint name-error"/);
  assert.match(invalidBody, /Must contain at least 2 characters/);
  assert.doesNotMatch(invalidBody, /value="short"/);

  const valid = await app.fetch(new Request("http://example.com/contact", {
    method: "POST",
    headers: { origin: "http://example.com", cookie, "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ _csrf: token, name: "Ada", email: "ada@example.com", password: "long-enough" }),
  }));
  assert.equal(valid.status, 303);
  assert.equal(valid.headers.get("location"), "/contact?sent=1");
  assert.equal(submitted, true);
});
