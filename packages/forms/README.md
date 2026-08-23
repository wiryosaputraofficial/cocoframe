# @cocoframe/forms

Schema-backed progressive HTML forms with typed request-scoped state.

- `createForm(schema, options?)` owns parsing, validation, retained values, and field errors.
- `controller.action(submit)` integrates with a page action.
- `controller.state(context)` and `controller.field(name, state)` produce accessible rerender state and props.
- `CsrfField` emits the token installed by matching security middleware.

```tsx
const form = createForm(schema.object({ name: schema.string({ min: 2 }) }));

export default definePage({
  action: form.action(async (input) => save(input)),
  view: (_data, context) => <form method="post"><CsrfField context={context} /></form>,
});
```

Invalid forms rerender with HTTP 422. Successful actions normally redirect with
303. Secret, token, and password values are never retained. Verify with
`tests/forms.test.ts` and production form E2E.
