const techStack = ['Next.js 16', 'TypeScript', 'Tailwind CSS', 'shadcn/ui', 'SQLite', 'Zustand'];

export function TechStackBanner() {
  return (
    <section className="border-iv-border bg-iv-bg2/50 border-t py-10">
      <p className="text-iv-text3 mb-4 text-center text-xs font-medium tracking-widest uppercase">
        Tech Stack
      </p>
      <div className="flex flex-wrap items-center justify-center gap-2 px-6">
        {techStack.map((tech) => (
          <span
            key={tech}
            className="bg-iv-bg3 text-iv-text2 rounded-md px-3 py-1 text-xs font-medium"
          >
            {tech}
          </span>
        ))}
      </div>
    </section>
  );
}
