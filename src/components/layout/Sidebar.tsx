import { Link, useRouterState } from "@tanstack/react-router";
import {
  AlertTriangle,
  BookOpen,
  Bot,
  FlaskConical,
  Info,
  LayoutDashboard,
  Plus,
  Settings,
  Shield,
} from "lucide-react";
import { cn } from "@/lib/cn";
import { useAlertsStore } from "@/stores/alertsStore";

const NAV = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard },
  { to: "/create", label: "New Token", icon: Plus },
  { to: "/tokens", label: "Active Tokens", icon: Shield },
  { to: "/alerts", label: "Alerts", icon: AlertTriangle },
  { to: "/autonomous", label: "Autonomous", icon: Bot },
  { to: "/guide", label: "Guide", icon: BookOpen },
  { to: "/selftest", label: "Self-Test", icon: FlaskConical },
  { to: "/settings", label: "Settings", icon: Settings },
  { to: "/about", label: "About", icon: Info },
];

export function Sidebar() {
  const { pathname } = useRouterState({ select: (s) => s.location });
  const unread = useAlertsStore((s) => s.unreadCount);

  return (
    <aside className="flex h-full w-56 flex-col border-r bg-[hsl(var(--card))] px-3 py-4 shrink-0">
      <div className="mb-6 flex items-center gap-2 px-2">
        <img src="/logo.png" alt="ZHoneyPot" className="h-6 w-6 rounded shrink-0" />
        <span className="text-lg font-bold tracking-tight">ZHoneyPot</span>
      </div>

      <nav className="flex flex-col gap-1">
        {NAV.map(({ to, label, icon: Icon }) => {
          const active = to === "/" ? pathname === "/" : pathname.startsWith(to);
          return (
            <Link
              key={to}
              to={to}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                active
                  ? "bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))]"
                  : "text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--accent))] hover:text-[hsl(var(--accent-foreground))]"
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              <span>{label}</span>
              {label === "Alerts" && unread > 0 && (
                <span className="ml-auto rounded-full bg-red-500 px-1.5 py-0.5 text-xs text-white">
                  {unread}
                </span>
              )}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
