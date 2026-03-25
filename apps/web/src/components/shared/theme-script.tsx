export function ThemeScript() {
  const script = `
    (function() {
      try {
        var mode = localStorage.getItem('iv-theme') || 'system';
        var resolved = mode;
        if (mode === 'system') {
          resolved = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
        }
        document.documentElement.classList.remove('dark', 'light');
        document.documentElement.classList.add(resolved);
      } catch(e) {}
    })();
  `;
  return <script dangerouslySetInnerHTML={{ __html: script }} />;
}
