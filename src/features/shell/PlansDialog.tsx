import { Link } from "@tanstack/react-router";
import { Check, Crown } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const INCLUDED = [
  "Unlimited projects and templates",
  "Pulse agent with build validation and auto-repair",
  "Live previews, version history and restore",
  "GitHub import and local deployments",
];

/**
 * PulseUI is self-hosted and has no billing. The "Upgrade to Pro" entry point
 * says so plainly instead of pretending to sell a plan.
 */
export function PlansDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Crown className="h-5 w-5 fill-[#ffc53d] text-[#ffb020]" /> Everything is already
            included
          </DialogTitle>
          <DialogDescription>
            This PulseUI instance is self-hosted and has no paid plans or billing. Every feature is
            unlocked; the only cost is whatever your configured AI provider charges.
          </DialogDescription>
        </DialogHeader>
        <ul className="space-y-2 text-sm text-pulse-text-secondary">
          {INCLUDED.map((item) => (
            <li key={item} className="flex items-center gap-2">
              <Check className="h-4 w-4 text-pulse-success" /> {item}
            </li>
          ))}
        </ul>
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          <Button asChild onClick={() => onOpenChange(false)}>
            <Link to="/connections">Manage AI providers</Link>
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
