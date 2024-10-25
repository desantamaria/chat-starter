import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Check, MessageCircleIcon, XIcon } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

const useTestUsers = () => {
  const user = useQuery(api.functions.user.get);
  if (!user) return [];
  return [user];
};

export function PendingFriendsList() {
  const users = useTestUsers();
  return (
    <div className="flex flex-col divide-y">
      <h2 className="text-sm font-medium text-muted-foreground p-2.5">
        Pending Friends
      </h2>
      {users.length === 0 && (
        <FriendsListEmpty>No pending friend requests</FriendsListEmpty>
      )}
      {users.map((user) => (
        <FriendItem key={user._id} username={user.username} image={user.image}>
          <IconButton
            title="Accept"
            icon={<Check />}
            className="bg-green-100 hover:bg-green-200"
          />
          <IconButton
            title="Reject"
            icon={<XIcon />}
            className="bg-red-100 hover:bg-red-200"
          />
        </FriendItem>
      ))}
    </div>
  );
}

export function AcceptedFriendsList() {
  const users = useTestUsers();
  return (
    <div className="flex flex-col divide-y">
      <h2 className="text-sm font-medium text-muted-foreground p-2.5">
        Accepted Friends
      </h2>
      {users.length === 0 && (
        <FriendsListEmpty>No friends yet</FriendsListEmpty>
      )}
      {users.map((user) => (
        <FriendItem key={user._id} username={user.username} image={user.image}>
          <IconButton
            title="Start DM"
            icon={<MessageCircleIcon />}
            className="bg-blue-100 hover:bg-blue-200"
          />
          <IconButton
            title="Remove Friend"
            icon={<XIcon />}
            className="bg-red-100 hover:bg-red-200"
          />
        </FriendItem>
      ))}
    </div>
  );
}

function FriendsListEmpty({ children }: { children: React.ReactNode }) {
  return (
    <div className="p-4 bg-muted/50 text-center text-sm text-muted-foreground">
      {children}
    </div>
  );
}

function IconButton({
  title,
  className,
  icon,
}: {
  title: string;
  className?: string;
  icon: React.ReactNode;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          className={cn("rounded-full", className)}
          variant="outline"
          size="icon"
        >
          {icon}
          <span className="sr-only">{title}</span>
        </Button>
      </TooltipTrigger>
      <TooltipContent>{title}</TooltipContent>
    </Tooltip>
  );
}

function FriendItem({
  username,
  image,
  children,
}: {
  username: string;
  image: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between p-2.5 gap-2.5">
      <div className="flex items-center gap-2 5">
        <Avatar className="size-9 border">
          <AvatarImage src={image} />
          <AvatarFallback />
        </Avatar>
        <p className="text-sm font-medium">{username}</p>
      </div>
      <div className="flex items-center gap-1">{children}</div>
    </div>
  );
}
