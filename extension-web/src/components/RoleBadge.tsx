import { Bot, UserRound } from "lucide-react";

export function RoleBadge({ role }: { role: "user" | "assistant" }) {
  const isAssistant = role === "assistant";
  const Icon = isAssistant ? Bot : UserRound;

  return (
    <div className={`role-badge ${role}`} aria-label={isAssistant ? "Agent" : "User"}>
      <Icon size={14} aria-hidden="true" />
      <span>{isAssistant ? "Agent" : "User"}</span>
    </div>
  );
}
