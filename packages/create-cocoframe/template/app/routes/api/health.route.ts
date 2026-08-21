import { defineApi } from "@cocoframe/core";
import { schema } from "@cocoframe/schema";

export default defineApi({
  id: "health",
  method: "GET",
  output: schema.object({
    ok: schema.literal(true),
    framework: schema.string(),
  }),
  handle: () => ({ ok: true, framework: "cocoframe" }),
});