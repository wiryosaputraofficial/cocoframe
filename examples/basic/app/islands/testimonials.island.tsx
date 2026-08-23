import { defineIsland, signal } from "@cocoframe/client";

const testimonials = [
  ["CocoFrame transformed how our team builds products. It is fast, simple, and genuinely enjoyable to use.", "RP", "Rizky Pratama", "CTO, Penta Studio"],
  ["The developer experience is outstanding. We can focus on the product instead of fighting framework complexity.", "DL", "Dewi Lestari", "Frontend Developer"],
  ["Its performance and conventions keep the codebase easy to understand, even when working with AI assistance.", "FN", "Fajar Nugroho", "Tech Lead, NextGen"],
] as const;

export default defineIsland<Record<string, never>>({
  name: "testimonials",
  setup: () => {
    const active = signal(0);
    return () => <><div class="testimonial-track">{testimonials.map(([quote, initials, name, role], index) => <article class={active.value === index ? "testimonial-card active" : "testimonial-card"}><p>“{quote}”</p><div><span class="avatar">{initials}</span><p><strong>{name}</strong><small>{role}</small></p></div></article>)}</div><div class="testimonial-dots" aria-label="Testimonial navigation">{testimonials.map((_, index) => <button type="button" class={active.value === index ? "active" : undefined} aria-label={`Show testimonial ${index + 1}`} onClick={() => { active.value = index; }}></button>)}</div></>;
  },
});
