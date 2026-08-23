import { definePage, redirect } from "@cocoframe/core";
import { createForm, CsrfField } from "@cocoframe/forms";
import ChatRoundDotsIcon from "@cocoframe/icons/linear/chat-round-dots";
import ClockCircleIcon from "@cocoframe/icons/linear/clock-circle";
import LetterIcon from "@cocoframe/icons/linear/letter";
import ShieldCheckIcon from "@cocoframe/icons/linear/shield-check";
import { schema } from "@cocoframe/schema";
import { Alert, Button, FormField, Input, Textarea } from "@cocoframe/ui";
import { ProjectHero } from "../components/project-page.tsx";

const contactInput = schema.object({
  name: schema.string({ min: 2, max: 80 }),
  email: schema.string({ min: 5, max: 160, pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/ }),
  message: schema.string({ min: 10, max: 2_000 }),
});

const contactForm = createForm(contactInput);

export default definePage({
  load: ({ query }) => ({ sent: query.get("sent") === "1" }),
  meta: {
    title: "Contact CocoFrame",
    description: "Ask a CocoFrame question, report a reproducible issue, or share framework feedback through a server-validated form.",
    canonical: "https://cocoframe.dev/contact",
  },
  cache: { private: true, browser: 0 },
  action: contactForm.action(async ({ name, email, message }) => {
    void [name, email, message];
    return redirect("/contact?sent=1", 303);
  }),
  error: (error) => (
    <main><h1>Form unavailable</h1><p>{error instanceof Error ? error.message : "Unknown error"}</p></main>
  ),
  view: ({ sent }, context) => {
    const state = contactForm.state(context);
    const name = contactForm.field("name", state, { id: "name", describedBy: ["name-hint"] });
    const email = contactForm.field("email", state, { id: "email" });
    const message = contactForm.field("message", state, { id: "message", describedBy: ["message-hint"] });
    return <main class="project-page contact-page" id="top">
        <ProjectHero active="contact" eyebrow="CONTACT" title={<>Tell us what<br />you are building.</>} description="Ask a question, send feedback, or report a reproducible issue. This form is rendered and validated on the server, works without browser JavaScript, and is protected by CSRF." icon={<ChatRoundDotsIcon size={86} />}>
          <a class="button button-ghost" href="/docs#troubleshooting">Troubleshooting first</a>
        </ProjectHero>
        <section class="contact-layout section-shell">
          <div class="contact-copy reveal">
            <span class="eyebrow">BEFORE YOU SEND</span>
            <h2>Context helps us help you.</h2>
            <p>Include your goal, runtime version, minimal reproduction steps, and sanitized error output. Do not send secrets, cookies, tokens, authorization headers, or user data.</p>
            <div class="contact-detail"><span><ClockCircleIcon size={21} /></span><div><strong>Response expectation</strong><p>This example page simulates the submission flow. Connect the action to your support channel in production.</p></div></div>
            <div class="contact-detail"><span><ShieldCheckIcon size={21} /></span><div><strong>Safe diagnostics</strong><p>Use request IDs and public error messages; keep sensitive details only in controlled server logs.</p></div></div>
            <div class="contact-detail"><span><LetterIcon size={21} /></span><div><strong>Documentation feedback</strong><p>Mention the section URL and your expected result so the change stays focused.</p></div></div>
          </div>
          <div class="contact-form-card reveal">
            <header><span><LetterIcon size={20} /></span><div><h2>Send a message</h2><p>All fields are required.</p></div></header>
            {sent && <Alert variant="success">Message validated and submitted successfully.</Alert>}
            {state.errors._form?.[0] && <Alert variant="error">{state.errors._form[0]}</Alert>}
            <form method="post" class="contact-form">
            <CsrfField context={context} />
            <FormField label="Name" htmlFor="name" hint="Use at least two characters." error={state.errors.name?.[0]} required>
              <Input {...name} autocomplete="name" required />
            </FormField>
            <FormField label="Email" htmlFor="email" error={state.errors.email?.[0]} required>
              <Input {...email} type="email" autocomplete="email" required />
            </FormField>
            <FormField label="Message" htmlFor="message" hint="Minimum ten characters." error={state.errors.message?.[0]} required>
              <Textarea {...message} rows={6} required />
            </FormField>
            <Button type="submit">Send message</Button>
            </form>
          </div>
        </section>
      </main>;
  },
});
