"use client";

import { Button } from "@/components/ui/button";
import {
  AcceptedFriendsList,
  PendingFriendsList,
} from "./_components/friends-list";
import { TooltipProvider } from "@/components/ui/tooltip";

export default function FriendsPage() {
  return (
    <div className="flex-1 flex flex-col divide-y">
      <header className="flex justify-between items-center p-4">
        <h1 className="font-semibold">Friends</h1>
        <Button size="sm">Add Friend</Button>
      </header>
      <div className="grid p-4 gap-4">
        <TooltipProvider delayDuration={0}>
          <PendingFriendsList />
          <AcceptedFriendsList />
        </TooltipProvider>
      </div>
    </div>
  );
}
