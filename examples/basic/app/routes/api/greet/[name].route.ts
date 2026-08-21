import { defineApi } from "@cocoframe/core";
import { schema } from "@cocoframe/schema";

export default defineApi({
  id: "greet-person",
  method: "GET",
  input: {
    params: schema.object({ name: schema.string({ min: 2, max: 40 }) }),
    query: schema.object({ excited: schema.optional(schema.boolean({ coerce: true })) }),
  },
  output: schema.object({ message: schema.string() }),
  handle: ({ input }) => ({
    message: `Hello, ${input.params.name}${input.query.excited ? "!" : "."}`,
  }),
});
