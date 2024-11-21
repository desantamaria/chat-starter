"use client";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { useMutation, useQuery } from "convex/react";
import { Ellipsis } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { toast } from "sonner";
import { api } from "../../../../../convex/_generated/api";
import { Id } from "../../../../../convex/_generated/dataModel";
import { CreateChannel } from "./create-channel";
import { ServerSettings } from "./server-settings";
import { Voice } from "./voice";

export function ServerSidebar({ id }: { id: Id<"servers"> }) {
  const pathname = usePathname();
  const server = useQuery(api.functions.server.get, { id });
  const channels = useQuery(api.functions.channel.list, { id });
  const removeChannel = useMutation(api.functions.channel.remove);
  const router = useRouter();

  const handleChannelDelete = async (id: Id<"channels">) => {
    try {
      if (server) {
        router.push(
          `/servers/${server._id}/channels/${server?.defaultChannelId}`
        );
      }
      await removeChannel({ id });
      toast.success("Channel deleted");
    } catch (error) {
      toast.error("Failed to delete channel", {
        description:
          error instanceof Error ? error.message : "An unknown error occurred",
      });
    }
  };
  return (
    <Sidebar className="left-12">
      <SidebarHeader>{server?.name}</SidebarHeader>
      {server && <ServerSettings server={server} />}
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Channels</SidebarGroupLabel>
          <CreateChannel serverId={id} />
          <SidebarGroupContent>
            <SidebarMenu>
              {channels?.map((channel) => (
                <SidebarMenuItem key={channel._id} className="group">
                  <SidebarMenuButton
                    isActive={
                      pathname === `/servers/${id}/channels/${channel._id}`
                    }
                    asChild
                  >
                    <Link href={`/servers/${id}/channels/${channel._id}`}>
                      <div className="flex gap-2">
                        <p>{channel.name}</p>
                        {server?.defaultChannelId === channel._id ? (
                          <p className="text-muted-foreground">(default)</p>
                        ) : (
                          <></>
                        )}
                      </div>
                    </Link>
                  </SidebarMenuButton>
                  <SidebarMenuAction
                    onClick={() => handleChannelDelete(channel._id)}
                  >
                    <Ellipsis />
                  </SidebarMenuAction>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <Voice serverId={id} />
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarFooter>
    </Sidebar>
  );
}
