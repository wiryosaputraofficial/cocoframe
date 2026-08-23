# Create a Progressive Form

Use one schema and one `createForm` controller for parsing, retained values, and
errors.

```tsx
const profileForm = createForm(schema.object({ name: schema.string({ min: 2 }) }));

export default definePage({
  action: profileForm.action(async (input) => {
    await saveProfile(input);
    return redirect("/profile?saved=1", 303);
  }),
  view: (_data, context) => {
    const state = profileForm.state(context);
    const name = profileForm.field("name", state);
    return <form method="post"><CsrfField context={context} /><Input {...name} /></form>;
  },
});
```

Add matching `csrfProtection` for cookie-authenticated unsafe requests. Invalid
input rerenders with 422; successful mutations normally redirect with 303.
Declare additional secret fields through `sensitiveFields`. Verify forms,
security, core, and production browser behavior.
