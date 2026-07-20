import { useState, useEffect } from "react";
import { Button } from "./ui/button";
import { LogOut, User } from "lucide-react";
import { clearGitHubToken, getGitHubToken, GitHubUser } from "../lib/storage";
import { getRateLimitState, onRateLimitUpdate } from "../lib/github";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import IconComponent from "./IconComponent";

interface HeaderProps {
  user: GitHubUser | null;
  onLogout: () => void;
}

function formatResetTime(resetAt: number | null): string {
  if (resetAt === null) return "";
  return new Date(resetAt * 1000).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function RateLimitWidget() {
  const [rateLimit, setRateLimit] = useState(getRateLimitState());

  useEffect(() => {
    const unsubscribe = onRateLimitUpdate(setRateLimit);
    return unsubscribe;
  }, []);

  if (!getGitHubToken()) return null;

  const { remaining, resetAt } = rateLimit;
  const total = 5000;

  const barColor =
    remaining === null
      ? "#d1d5db"
      : remaining > 1000
        ? "#10b981"
        : remaining > 500
          ? "#f59e0b"
          : "#ef4444";

  const pct =
    remaining !== null
      ? Math.max(0, Math.min(100, (remaining / total) * 100))
      : 0;

  const tooltipText =
    remaining === null
      ? "No API calls made yet"
      : `${remaining.toLocaleString()} / ${total.toLocaleString()} requests remaining${resetAt ? ` · Resets at ${formatResetTime(resetAt)}` : ""}`;

  return (
    <div
      className="flex flex-col gap-0.5 px-3 py-1.5 rounded-lg border min-w-[110px]"
      style={{ background: "#ffffff", borderColor: "#e9d5ff" }}
      title={tooltipText}
    >
      <div className="flex items-center justify-between">
        <span className="text-xs" style={{ color: "#6b7280" }}>
          API
        </span>
        <span
          className="text-xs font-mono font-medium"
          style={{ color: remaining === null ? "#9ca3af" : barColor }}
        >
          {remaining === null ? "—" : remaining.toLocaleString()}
          <span style={{ color: "#9ca3af" }}> / 5k</span>
        </span>
      </div>
      <div
        className="h-1 rounded-full overflow-hidden"
        style={{ background: "#f3f4f6" }}
      >
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${pct}%`, background: barColor }}
        />
      </div>
    </div>
  );
}

export function Header({ user, onLogout }: HeaderProps) {
  const handleLogout = () => {
    if (
      confirm(
        "Are you sure you want to logout? This will clear your GitHub token.",
      )
    ) {
      clearGitHubToken();
      onLogout();
    }
  };

  return (
    <header
      className="border-b-2"
      style={{
        background: "linear-gradient(to right, #ffffff, #d4bcecff)",
        borderColor: "#e9d5ff",
      }}
    >
      <div className="container mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className="p-2 rounded-lg flex items-center justify-center"
              style={{
                background:
                  "linear-gradient(135deg, #ffffffff 0%, #a855f7 100%)",
                boxShadow: "0 2px 8px rgba(124, 58, 237, 0.25)",
              }}
            >
              <IconComponent name="image2vector" color="dark" size="xl" />
            </div>
            <div>
              <h1 style={{ color: "#6b21a8" }}>GitHub Deploy Manager</h1>
              <p className="text-sm" style={{ color: "#a855f7" }}>
                Manage your deployments and releases
              </p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <RateLimitWidget />
            {user && (
              <div
                className="flex items-center gap-3 px-4 py-2 rounded-lg border"
                style={{ background: "#ffffff", borderColor: "#e9d5ff" }}
              >
                <Avatar className="w-8 h-8">
                  <AvatarImage
                    src={user.avatar_url}
                    alt={user.name || user.login}
                  />
                  <AvatarFallback
                    style={{ background: "#e9d5ff", color: "#7c3aed" }}
                  >
                    <User className="w-4 h-4" />
                  </AvatarFallback>
                </Avatar>
                <div className="flex flex-col">
                  <span
                    className="text-sm font-medium"
                    style={{ color: "#6b21a8" }}
                  >
                    {user.name || user.login}
                  </span>
                  <span className="text-xs" style={{ color: "#7c3aed" }}>
                    @{user.login}
                  </span>
                </div>
              </div>
            )}
            <Button
              variant="ghost"
              onClick={handleLogout}
              className="hover:bg-purple-50"
            >
              <LogOut className="w-4 h-4 mr-2" style={{ color: "#7c3aed" }} />
              <span style={{ color: "#7c3aed" }}>Logout</span>
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
}
