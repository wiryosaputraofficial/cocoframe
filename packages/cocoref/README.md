# @cocoframe/cocoref

`@cocoframe/cocoref` provides a provider-independent approval workflow for
building CocoFrame interfaces from image or website references. It records the
component inventory, reuse decisions, missing-component consent, temporary
candidate previews, feedback revisions, and final approval.

```ts
import {
  approveCocoRefCandidate,
  auditCocoRef,
  createCocoRef,
  consentCocoRefCandidate,
  markCocoRefPreview,
} from "@cocoframe/cocoref";

let ref = createCocoRef({
  name: "dashboard",
  references: [{ kind: "website", source: "https://example.com/dashboard" }],
});

ref = auditCocoRef(ref, {
  inventory: [],
  requirements: [{
    id: "activity-feed",
    description: "Expandable recent activity feed",
    decision: "missing",
    rationale: "No existing component supports grouped expandable events.",
  }],
});

ref = consentCocoRefCandidate(ref, "activity-feed");
ref = markCocoRefPreview(ref, "activity-feed", {
  componentFile: ".cocoframe/cocoref/dashboard/activity-feed/activity-feed.tsx",
  styleFile: ".cocoframe/cocoref/dashboard/activity-feed/activity-feed.module.css",
  previewRoute: "app/routes/__cocoref/dashboard/activity-feed.page.tsx",
  previewUrl: "http://127.0.0.1:3000/__cocoref/dashboard/activity-feed",
  targetComponentFile: "app/components/activity-feed.tsx",
  targetStyleFile: "app/components/activity-feed.module.css",
});
ref = approveCocoRefCandidate(ref, "activity-feed");
```

The canonical source is `refs/<name>/ref.json`. Generated reports are review
views. Candidate files under `.cocoframe/cocoref/` and `app/routes/__cocoref/`
are temporary and must be promoted or cancelled through `cocoframe ref`.
