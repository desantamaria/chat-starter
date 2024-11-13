import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { UserIcon } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { CreateServer } from "./create-server";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export function MainSidebar() {
  const servers = useQuery(api.functions.server.list);
  const pathname = usePathname();
  return (
    <Sidebar collapsible="icon">
      <SidebarContent className="flex flex-col">
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  tooltip="Direct Messages"
                  isActive={pathname.startsWith("/dms")}
                  asChild
                >
                  <Link href="/dms">
                    <UserIcon />
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              {servers?.map((server) => (
                <SidebarMenuItem
                  key={server._id}
                  //   className={`${pathname.startsWith(`/servers/${server._id}`) ? "bg-white" : ""}`}
                >
                  <SidebarMenuButton
                    className="group-data-[collapsible=icon]:!p-0 p-0 group"
                    tooltip={server.name}
                  >
                    <div
                      className={`absolute -left-2 top-1/2 -translate-y-1/2 w-1 h-5 rounded-r-full bg-white opacity-0 transition-all
                        ${pathname.startsWith(`/servers/${server._id}`) ? "h-10 opacity-100" : "hover:opacity-100"}`}
                    />
                    <Link
                      href={`/servers/${server._id}/channels/${server.defaultChannelId}`}
                    >
                      <Avatar className="rounded-none">
                        {server.iconUrl && <AvatarImage src={server.iconUrl} />}
                        <AvatarFallback>{server.name[0]}</AvatarFallback>
                      </Avatar>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
              <SidebarMenuItem>
                <CreateServer />
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
