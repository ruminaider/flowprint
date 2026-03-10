import { Github, Package, BookOpen } from "lucide-react"

const footerLinks = {
  product: [
    { label: "Web App", href: "#" },
    { label: "CLI", href: "#" },
    { label: "Documentation", href: "#" },
    { label: "Templates", href: "#" },
  ],
  packages: [
    { label: "@ruminaider/flowprint-schema", href: "#" },
    { label: "@ruminaider/flowprint-editor", href: "#" },
    { label: "flowprint (CLI)", href: "#" },
  ],
  resources: [
    { label: "GitHub", href: "#" },
    { label: "Changelog", href: "#" },
    { label: "License (MIT)", href: "#" },
  ],
}

export function FooterSection() {
  return (
    <footer className="py-16 px-6 border-t border-border bg-card/30">
      <div className="max-w-6xl mx-auto">
        <div className="grid md:grid-cols-4 gap-12 mb-12">
          {/* Brand */}
          <div className="md:col-span-1">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  className="w-5 h-5 text-primary-foreground"
                  stroke="currentColor"
                  strokeWidth={2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M12 3v18" />
                  <path d="M3 12h18" />
                  <circle cx="6" cy="6" r="2" />
                  <circle cx="18" cy="18" r="2" />
                </svg>
              </div>
              <span className="font-bold text-lg text-foreground">Flowprint</span>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Executable service blueprints. Business defines, engineering ships.
            </p>
          </div>

          {/* Product links */}
          <div>
            <h4 className="font-semibold text-foreground mb-4">Product</h4>
            <ul className="space-y-2">
              {footerLinks.product.map((link) => (
                <li key={link.label}>
                  <a
                    href={link.href}
                    className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Packages */}
          <div>
            <h4 className="font-semibold text-foreground mb-4">Packages</h4>
            <ul className="space-y-2">
              {footerLinks.packages.map((link) => (
                <li key={link.label}>
                  <a
                    href={link.href}
                    className="text-sm text-muted-foreground hover:text-foreground transition-colors font-mono"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Resources */}
          <div>
            <h4 className="font-semibold text-foreground mb-4">Resources</h4>
            <ul className="space-y-2">
              {footerLinks.resources.map((link) => (
                <li key={link.label}>
                  <a
                    href={link.href}
                    className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="pt-8 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-sm text-muted-foreground">
            Open source under MIT License
          </p>
          
          <div className="flex items-center gap-4">
            <a
              href="#"
              className="p-2 text-muted-foreground hover:text-foreground transition-colors"
              aria-label="GitHub"
            >
              <Github className="w-5 h-5" />
            </a>
            <a
              href="#"
              className="p-2 text-muted-foreground hover:text-foreground transition-colors"
              aria-label="npm"
            >
              <Package className="w-5 h-5" />
            </a>
            <a
              href="#"
              className="p-2 text-muted-foreground hover:text-foreground transition-colors"
              aria-label="Documentation"
            >
              <BookOpen className="w-5 h-5" />
            </a>
          </div>
        </div>
      </div>
    </footer>
  )
}
