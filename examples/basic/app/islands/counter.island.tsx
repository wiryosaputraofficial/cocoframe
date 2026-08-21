import { bind, defineIsland, signal } from "@cocoframe/client";

export default defineIsland<{ initial: number }>({
  name: "counter",
  setup: ({ initial }) => {
    const count = signal(initial);
    return () => (
      <button type="button" onClick={() => count.value++}>
        Diklik {bind(count)} kali
      </button>
    );
  },
});
