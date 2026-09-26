import type { ReactNode } from "react";

type AppChromeProps = { children: ReactNode };

export function AppChrome({ children }: AppChromeProps) {
  return (
    <div className="app-shell">
      <header className="topbar">
        <a className="wordmark" href="/" aria-label="Sound Creator home">
          <span className="wordmark-icon" aria-hidden="true">
            ≋
          </span>
          <span>
            SOUND<span className="wordmark-divider">/</span>CREATOR
          </span>
        </a>
        <a
          className="docs-link"
          href="https://github.com/tomcorke/sound-creator/blob/main/docs/SOUND_FORMAT.md"
          target="_blank"
          rel="noreferrer"
        >
          Format &amp; examples <span aria-hidden="true">↗</span>
        </a>
      </header>
      {children}
      <footer className="page-footer">
        <span>SYNTHESIZED IN THE BROWSER • SETTINGS EXPORTED AS JSON</span>
        <span>Settings update as you edit.</span>
      </footer>
    </div>
  );
}
