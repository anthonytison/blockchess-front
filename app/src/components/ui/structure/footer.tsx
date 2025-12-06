import { Github, Linkedin } from "lucide-react";

const Footer = () => {
    return (
      <footer className="" role="contentinfo">
        <div className="container mx-auto px-4 py-4">
          <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-4 text-sm text-muted-foreground">

          <div className="flex items-center gap-2 sm:gap-3">
              <a 
                href="https://github.com/anthonytison" 
                target="_blank" 
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center hover:text-foreground transition-colors"
                aria-label="GitHub profile"
              >
                <Github className="h-4 w-4 sm:h-5 sm:w-5" />
              </a>
              <a 
                href="https://www.linkedin.com/in/anthonytison/" 
                target="_blank" 
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center hover:text-foreground transition-colors"
                aria-label="LinkedIn profile"
              >
                <Linkedin className="h-4 w-4 sm:h-5 sm:w-5" />
              </a>
            </div>
            <span className="whitespace-nowrap">
              Developped by Anthony Tison - 2025
            </span>
          </div>
        </div>
      </footer>
    );
}
export default Footer;