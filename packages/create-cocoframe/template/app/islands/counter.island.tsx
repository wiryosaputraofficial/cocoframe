import { bind, defineIsland, signal } from "@cocoframe/client";
import { Button } from "@cocoframe/ui";

export default defineIsland<{ initial: number }>({
  name: "counter",
  setup: ({ initial }) => {
    const count = signal(initial);
    return () => (
      <Button type="button" onClick={() => count.value++}>
        Count: {bind(count)}
      </Button>
    );
  },
});