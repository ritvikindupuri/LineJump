import { Link } from "@tanstack/react-router";
import { LinejumpWordmark } from "./linejump-logo";
import { Button } from "./ui/button";
import { motion } from "motion/react";
import { Settings, LogOut } from "lucide-react";
import { useAuth } from "../lib/auth-context";

export function Navbar() {
  const { user, token, logout } = useAuth();

  return (
    <motion.header
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      className="fixed top-0 left-0 right-0 z-50 border-b border-border/40 bg-background/80 backdrop-blur-xl"
    >
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-6">
        <Link to="/" className="flex items-center gap-2 transition-opacity hover:opacity-80">
          <LinejumpWordmark height={16} />
        </Link>
        <nav className="hidden items-center gap-6 text-sm md:flex">
          <Link to="/app" className="text-muted-foreground transition-colors hover:text-foreground">
            Scanner
          </Link>
          <Link to="/catalog" className="text-muted-foreground transition-colors hover:text-foreground">
            Catalog
          </Link>
          <Link to="/docs" className="text-muted-foreground transition-colors hover:text-foreground">
            Docs
          </Link>
        </nav>
        <div className="flex items-center gap-3">
          {user ? (
            <>
              <Link to="/settings">
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                  <Settings className="h-4 w-4" />
                </Button>
              </Link>
              <Link to="/app">
                <Button size="sm" className="rounded-full px-5 text-xs font-medium">
                  Launch Scanner
                </Button>
              </Link>
            </>
          ) : (
            <>
              <Link to="/login">
                <Button variant="ghost" size="sm" className="text-xs font-medium">
                  Sign in
                </Button>
              </Link>
              <Link to="/register">
                <Button size="sm" className="rounded-full px-5 text-xs font-medium">
                  Get Started
                </Button>
              </Link>
            </>
          )}
        </div>
      </div>
    </motion.header>
  );
}
