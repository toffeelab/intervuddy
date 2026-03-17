const techStack = [
  "Next.js 16",
  "TypeScript",
  "Tailwind CSS",
  "shadcn/ui",
  "SQLite",
  "Zustand",
];

export function TechStackBanner() {
  return (
    <section className="border-t border-iv-border bg-iv-bg2/50 py-10">
      <p className="mb-4 text-center text-xs font-medium uppercase tracking-widest text-iv-text3">
        Tech Stack
      </p>
      <div className="flex flex-wrap items-center justify-center gap-2 px-6">
        {techStack.map((tech) => (
          <span
            key={tech}
            className="rounded-md bg-iv-bg3 px-3 py-1 text-xs font-medium text-iv-text2"
          >
            {tech}
          </span>
        ))}
      </div>
    </section>
  );
}
