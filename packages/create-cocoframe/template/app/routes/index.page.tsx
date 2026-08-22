import { definePage } from "@cocoframe/core";
import CodeSquareIcon from "@cocoframe/icons/linear/code-square";
import { Badge, Card, Heading, Stack, Text } from "@cocoframe/ui";
import Counter from "../islands/counter.island.tsx";

export default definePage({
  meta: {
    title: "{{PROJECT_NAME}} — CocoFrame",
    description: "A fast, server-first CocoFrame application.",
  },
  view: () => (
    <main class="hero">
      <Stack gap="large">
        <Badge variant="success"><CodeSquareIcon size={15} /> Server-first · AI-friendly</Badge>
        <Heading level={1} size="xlarge">Your CocoFrame project is ready.</Heading>
        <Text size="large" tone="muted">Useful HTML is rendered on the server. Browser JavaScript is isolated to the counter below.</Text>
        <Card class="starter-card"><Counter initial={0} /><small>Edit <code>app/routes/index.page.tsx</code> to get started.</small></Card>
      </Stack>
    </main>
  ),
});