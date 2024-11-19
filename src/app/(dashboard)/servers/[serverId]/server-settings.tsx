"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SidebarGroupAction } from "@/components/ui/sidebar";
import { useMutation } from "convex/react";
import { ImageIcon, Settings } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { api } from "../../../../../convex/_generated/api";
import { Id } from "../../../../../convex/_generated/dataModel";
import { useImageUpload } from "@/hooks/use-image-upload";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export interface Server {
  _id: Id<"servers">;
  _creationTime: number;
  iconId?: Id<"_storage"> | undefined;
  defaultChannelId?: Id<"channels"> | undefined;
  name: string;
  ownerId: Id<"users">;
  iconUrl: string | null;
}
export function ServerSettings({ server }: { server: Server }) {
  const imageUpload = useImageUpload({ singleFile: true });
  const [open, setOpen] = useState(false);
  const editServer = useMutation(api.functions.server.edit);

  const [serverName, setServerName] = useState(server.name);

  useEffect(() => {
    if (server.iconId && server.iconUrl) {
      imageUpload.setStorageIds([server.iconId]);
      imageUpload.setPreviewUrls([server.iconUrl]);
    }
  }, [server]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    try {
      editServer({
        id: server._id,
        name: serverName,
        iconId: imageUpload.storageIds[0],
        ownerId: server.ownerId,
        defaultChannelId: server.defaultChannelId,
      });
      toast.success("Settings saved");
      setOpen(false);
      imageUpload.reset();
    } catch (error) {
      toast.error("Failed to save settings", {
        description:
          error instanceof Error ? error.message : "An unknown error occurred",
      });
    }
  };
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <SidebarGroupAction>
          <Settings />
        </SidebarGroupAction>
      </DialogTrigger>

      <DialogContent>
        <DialogHeader>
          <DialogTitle>Server Settings</DialogTitle>
          <DialogDescription>Edit Server Settings</DialogDescription>
        </DialogHeader>
        <form className="contents" onSubmit={handleSubmit}>
          <div className="flex flex-col gap-2">
            <Label htmlFor="serverName">Server Name</Label>
            <Input
              id="serverName"
              type="text"
              value={serverName}
              onChange={(e) => setServerName(e.target.value)}
            />
            <div className="flex flex-col gap-2">
              <Label>Icon</Label>
              <div className="flex items-center gap-2">
                <input {...imageUpload.inputProps} />
                <Avatar className="size-10 border relative">
                  {imageUpload.previewUrls && (
                    <AvatarImage
                      src={imageUpload.previewUrls[0]}
                      className="absolute inset-0"
                    />
                  )}
                  <AvatarFallback>
                    <ImageIcon className="text-muted-foreground size-4" />
                  </AvatarFallback>
                </Avatar>
                <Button
                  variant="outline"
                  type="button"
                  size="sm"
                  onClick={imageUpload.open}
                  disabled={imageUpload.isUploading}
                >
                  {imageUpload.isUploading ? "Uploading..." : "Upload Icon"}
                </Button>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button>Save</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
