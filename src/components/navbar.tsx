"use client";
 
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useEffect, useRef } from "react";
import {
  Sparkles,
  LayoutDashboard,
  User,
  Menu,
  X,
  LogOut,
  ChevronDown,
  ArrowRight,
  HelpCircle,
} from "lucide-react";
import { AppsScriptLogo } from "./logo";
import { isLoggedIn, logout, getProfile, type UserProfile } from "@/lib/store";

const publicLinks = [
  { href: "/", label: "Beranda" },
  { href: "/#pricing", label: "Harga" },
];

export function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [loggedIn, setLoggedIn] = useState(false);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
    setLoggedIn(isLoggedIn());
    const fetchProfile = async () => {
      const prof = await getProfile();
      setProfile(prof);
    };
    fetchProfile();
  }, [pathname]);

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const handleLogout = async () => {
    await logout();
    setLoggedIn(false);
    setProfile(null);
    setDropdownOpen(false);
    setOpen(false);
    router.push("/login");
    router.refresh();
  };

  if (!mounted) {
    return (
      <header className="sticky top-0 z-50 bg-surface-950/90 backdrop-blur-md border-b border-brand-500/10">
        <div className="w-full px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <Link href="/" className="flex items-center gap-2 group">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-surface-900 border border-brand-500/20 shadow-lg shadow-brand-500/5 transition-transform group-hover:scale-110">
                <AppsScriptLogo className="h-5 w-5" />
              </div>
              <span className="text-lg font-bold tracking-tight">
                <span className="gradient-text">AppScript</span>{" "}
                <span className="text-surface-200 font-medium">Generator</span>
              </span>
            </Link>
            <div className="h-8 w-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
          </div>
        </div>
      </header>
    );
  }

  return (
    <header className="sticky top-0 z-50 bg-surface-950/90 backdrop-blur-md border-b border-brand-500/10">
      <div className="w-full px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 group">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-surface-900 border border-brand-500/20 shadow-lg shadow-brand-500/5 transition-transform group-hover:scale-110">
              <AppsScriptLogo className="h-5 w-5" />
            </div>
            <span className="text-lg font-bold tracking-tight">
              <span className="gradient-text">AppScript</span>{" "}
              <span className="text-surface-200 font-medium">Generator</span>
            </span>
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-1.5">
            {loggedIn ? (
              <>
                <Link
                  href="/dashboard"
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                    pathname === "/dashboard"
                      ? "bg-brand-600/20 text-brand-300 shadow-sm glow-sm"
                      : "text-surface-300 hover:text-white hover:bg-surface-700/50"
                  }`}
                >
                  <LayoutDashboard className="h-4 w-4" />
                  Dashboard
                </Link>
                <Link
                  href="/account"
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                    pathname === "/account"
                      ? "bg-brand-600/20 text-brand-300 shadow-sm glow-sm"
                      : "text-surface-300 hover:text-white hover:bg-surface-700/50"
                  }`}
                >
                  <User className="h-4 w-4" />
                  Akun
                </Link>
                <Link href="/generate" className="btn-primary ml-3 flex items-center gap-2 text-sm !py-2 !px-4">
                  <Sparkles className="h-4 w-4" />
                  Buat Prompt
                </Link>

                {/* Profile Dropdown */}
                {profile && (
                  <div className="relative ml-3" ref={dropdownRef}>
                    <button
                      onClick={() => setDropdownOpen(!dropdownOpen)}
                      className="flex items-center gap-2 p-1 rounded-xl bg-surface-900 border border-brand-500/10 hover:border-brand-500/35 transition cursor-pointer text-left focus:outline-none"
                    >
                      <div className="h-8 w-8 rounded-lg gradient-brand flex items-center justify-center font-bold text-white text-sm">
                        {profile.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="hidden lg:block pr-1">
                        <p className="text-xs font-semibold text-white leading-tight truncate max-w-[100px]">{profile.name}</p>
                        <p className="text-[9px] text-surface-400 capitalize font-medium">{profile.plan}</p>
                      </div>
                      <ChevronDown className="h-3.5 w-3.5 text-surface-400" />
                    </button>

                    {dropdownOpen && (
                      <div className="absolute right-0 mt-2 w-56 glass border border-surface-800 rounded-2xl shadow-xl py-2 z-50 animate-fade-up">
                        <div className="px-4 py-2 border-b border-surface-850">
                          <p className="text-xs font-bold text-white truncate">{profile.name}</p>
                          <p className="text-[10px] text-surface-400 truncate">{profile.email}</p>
                          <div className="mt-1.5 inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-brand-600/20 border border-brand-500/35 text-[9px] font-bold text-brand-300 capitalize">
                            Paket {profile.plan}
                          </div>
                        </div>
                        <Link
                          href="/dashboard"
                          onClick={() => setDropdownOpen(false)}
                          className="flex items-center gap-2 px-4 py-2.5 text-xs text-surface-300 hover:text-white hover:bg-surface-800 transition"
                        >
                          <LayoutDashboard className="h-3.5 w-3.5 text-surface-400" />
                          Dashboard
                        </Link>
                        <Link
                          href="/account"
                          onClick={() => setDropdownOpen(false)}
                          className="flex items-center gap-2 px-4 py-2.5 text-xs text-surface-300 hover:text-white hover:bg-surface-800 transition"
                        >
                          <User className="h-3.5 w-3.5 text-surface-400" />
                          Akun Saya
                        </Link>
                        <button
                          onClick={handleLogout}
                          className="w-full flex items-center gap-2 px-4 py-2.5 text-xs text-red-400 hover:text-red-300 hover:bg-red-500/10 border-t border-surface-850 transition cursor-pointer text-left font-medium"
                        >
                          <LogOut className="h-3.5 w-3.5" />
                          Keluar
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </>
            ) : (
              <>
                {publicLinks.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    className="px-4 py-2 rounded-lg text-sm font-medium text-surface-300 hover:text-white hover:bg-surface-700/50 transition-all"
                  >
                    {link.label}
                  </Link>
                ))}
                <Link href="/login" className="btn-primary ml-3 flex items-center gap-2 text-sm !py-2 !px-4 shadow-md shadow-brand-500/10">
                  <span>Masuk</span>
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </>
            )}
          </nav>

          {/* Mobile toggle */}
          <button
            className="md:hidden p-2 rounded-lg text-surface-300 hover:bg-surface-700/50 transition"
            onClick={() => setOpen(!open)}
            aria-label="Toggle menu"
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Nav */}
      {open && (
        <div className="md:hidden bg-surface-950/95 backdrop-blur-md border-t border-brand-500/10 animate-fade-up">
          <div className="px-4 py-3 space-y-1">
            {loggedIn ? (
              <>
                <Link
                  href="/dashboard"
                  onClick={() => setOpen(false)}
                  className={`flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
                    pathname === "/dashboard"
                      ? "bg-brand-600/20 text-brand-300"
                      : "text-surface-300 hover:text-white hover:bg-surface-700/50"
                  }`}
                >
                  <LayoutDashboard className="h-4 w-4 text-brand-400" />
                  Dashboard
                </Link>
                <Link
                  href="/account"
                  onClick={() => setOpen(false)}
                  className={`flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
                    pathname === "/account"
                      ? "bg-brand-600/20 text-brand-300"
                      : "text-surface-300 hover:text-white hover:bg-surface-700/50"
                  }`}
                >
                  <User className="h-4 w-4 text-brand-400" />
                  Akun Saya
                </Link>
                <Link
                  href="/generate"
                  onClick={() => setOpen(false)}
                  className="btn-primary flex items-center justify-center gap-2 text-sm w-full mt-2"
                >
                  <Sparkles className="h-4 w-4" />
                  Buat Prompt
                </Link>
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 mt-2 rounded-lg text-sm font-semibold bg-red-500/10 hover:bg-red-500/20 text-red-400 transition cursor-pointer"
                >
                  <LogOut className="h-4 w-4" />
                  Keluar
                </button>
              </>
            ) : (
              <>
                {publicLinks.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={() => setOpen(false)}
                    className="block px-4 py-2 rounded-lg text-sm font-medium text-surface-300 hover:text-white hover:bg-surface-700/50 transition-all"
                  >
                    {link.label}
                  </Link>
                ))}
                <Link
                  href="/login"
                  onClick={() => setOpen(false)}
                  className="btn-primary flex items-center justify-center gap-2 text-sm w-full mt-2"
                >
                  <span>Masuk</span>
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
