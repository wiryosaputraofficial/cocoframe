import { defineIsland, signal } from "@cocoframe/client";

const testimonials = [
  ["CocoFrame mengubah cara tim kami membangun produk. Cepat, sederhana, dan sangat menyenangkan digunakan.", "RP", "Rizky Pratama", "CTO, Penta Studio"],
  ["Developer experience-nya luar biasa. Kami dapat fokus pada produk tanpa melawan kompleksitas framework.", "DL", "Dewi Lestari", "Frontend Developer"],
  ["Performa dan konvensinya membuat codebase tetap mudah dipahami, termasuk saat dibantu AI.", "FN", "Fajar Nugroho", "Tech Lead, NextGen"],
] as const;

export default defineIsland<Record<string, never>>({
  name: "testimonials",
  setup: () => {
    const active = signal(0);
    return () => <><div class="testimonial-track">{testimonials.map(([quote, initials, name, role], index) => <article class={active.value === index ? "testimonial-card active" : "testimonial-card"}><p>“{quote}”</p><div><span class="avatar">{initials}</span><p><strong>{name}</strong><small>{role}</small></p></div></article>)}</div><div class="testimonial-dots" aria-label="Navigasi testimonial">{testimonials.map((_, index) => <button type="button" class={active.value === index ? "active" : undefined} aria-label={`Tampilkan testimonial ${index + 1}`} onClick={() => { active.value = index; }}></button>)}</div></>;
  },
});
