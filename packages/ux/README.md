# @cocoframe/ux

`@cocoframe/ux` is CocoFrame's provider-independent UX planning contract. It
connects reviewed product intent to user journeys, complete interface states,
interaction behavior, reuse-first visual recommendations, rendered preview
evidence, and a hash-bound CocoRef handoff.

```ts
import {
  checkCocoUx,
  createCocoUx,
  defineCocoUxDesign,
  renderCocoUxArtifacts,
} from "@cocoframe/ux";

let ux = createCocoUx({ feature: "checkout", brief: "Complete checkout." });
ux = defineCocoUxDesign(ux, {
  actors: [], journeys: [], screens: [], states: [], transitions: [],
  interactions: [], visualRecommendations: [], componentDecisions: [],
});

const result = checkCocoUx(ux);
const artifacts = renderCocoUxArtifacts(ux);
```

The canonical source is `ux/<feature>/ux.json`. CocoUX approval approves only
the visual direction for handoff. CocoRef still owns per-component consent,
exact-source preview approval, and application-source promotion.
