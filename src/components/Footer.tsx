import { Github, Linkedin, Mail, Rss, Smartphone } from "lucide-react";
import { SUIREAD_APP_STORE_URL } from "@/components/SuiReadPromo";

export function Footer() {
  return (
    <footer className="border-t border-border/50 bg-card">
      <div className="mx-auto max-w-6xl px-4 py-8">
        <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
          <p className="text-sm text-muted-foreground">
            &copy; {new Date().getFullYear()} Mingyu Yang. All rights reserved.
          </p>
          <div className="flex items-center gap-4">
            <a
              href={SUIREAD_APP_STORE_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
              aria-label="随读 SuiRead(App Store)"
            >
              <Smartphone className="h-4 w-4" /> 随读 App
            </a>
            <a
              href="https://github.com/nuan623-code"
              target="_blank"
              rel="noopener noreferrer"
              className="text-muted-foreground transition-colors hover:text-foreground"
              aria-label="GitHub"
            >
              <Github className="h-4 w-4" />
            </a>
            <a
              href="https://www.linkedin.com/in/mingyu-yang-7048389b/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-muted-foreground transition-colors hover:text-foreground"
              aria-label="LinkedIn"
            >
              <Linkedin className="h-4 w-4" />
            </a>
            <a
              href="/rss.xml"
              className="text-muted-foreground transition-colors hover:text-foreground"
              aria-label="RSS"
            >
              <Rss className="h-4 w-4" />
            </a>
            <a
              href="mailto:nuan623@gmail.com"
              className="text-muted-foreground transition-colors hover:text-foreground"
              aria-label="Email"
            >
              <Mail className="h-4 w-4" />
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
