import { ExternalLink, Mail } from "lucide-react";
import Link from "next/link";
import { AppsScriptLogo } from "./logo";

export function Footer() {
  return (
    <footer className="border-t border-brand-500/10 bg-surface-950/80">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="md:col-span-2">
            <Link href="/" className="flex items-center gap-2 mb-4">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-surface-900 border border-brand-500/20 shadow-md">
                <AppsScriptLogo className="h-4 w-4" />
              </div>
              <span className="text-lg font-bold">
                <span className="gradient-text">AppScript</span>{" "}
                <span className="text-surface-300 font-medium">Generator</span>
              </span>
            </Link>
            <p className="text-surface-400 text-sm leading-relaxed max-w-sm">
              Buat prompt terstruktur untuk Google Apps Script dalam hitungan
              menit. Hasilkan aplikasi lengkap dengan CRUD, validasi, dan UI
              modern.
            </p>
          </div>

          {/* Links */}
          <div>
            <h4 className="text-sm font-semibold text-surface-200 mb-3">
              Navigasi
            </h4>
            <ul className="space-y-2">
              {[
                { href: "/", label: "Beranda" },
                { href: "/dashboard", label: "Dashboard" },
                { href: "/generate", label: "Buat Prompt" },
                { href: "/account", label: "Akun Saya" },
              ].map((l) => (
                <li key={l.href}>
                  <Link
                    href={l.href}
                    className="text-sm text-surface-400 hover:text-brand-300 transition-colors"
                  >
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="text-sm font-semibold text-surface-200 mb-3">
              Kontak
            </h4>
            <ul className="space-y-2">
              <li>
                <a
                  href="mailto:hello@appscriptgen.id"
                  className="flex items-center gap-2 text-sm text-surface-400 hover:text-brand-300 transition-colors"
                >
                  <Mail className="h-4 w-4" /> hello@appscriptgen.id
                </a>
              </li>
              <li>
                <a
                  href="#"
                  className="flex items-center gap-2 text-sm text-surface-400 hover:text-brand-300 transition-colors"
                >
                  <ExternalLink className="h-4 w-4" /> GitHub
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-10 pt-6 border-t border-surface-800 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-surface-500">
            &copy; {new Date().getFullYear()} AppScript Generator. All rights
            reserved.
          </p>
          <p className="text-xs text-surface-600">
            Made with ❤️ for Indonesian developers
          </p>
        </div>
      </div>
    </footer>
  );
}
