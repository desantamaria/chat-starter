"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { chatViolations } from "@/data/chatDeletionReason";
import { useMutation, useQuery } from "convex/react";
import { FunctionReturnType } from "convex/server";
import {
  LoaderIcon,
  MoreHorizontalIcon,
  Pencil,
  PlusIcon,
  SendIcon,
  Trash,
  TrashIcon,
} from "lucide-react";
import Image from "next/image";
import { useState } from "react";
import { toast } from "sonner";

import { useImageUpload } from "@/hooks/use-image-upload";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import { MsgScrollArea } from "./msg-scroll-area";

export function Messages({ id }: { id: Id<"directMessages" | "channels"> }) {
  const messages = useQuery(api.functions.message.list, { dmOrChannelId: id });
  return (
    <>
      <MsgScrollArea
        className="h-full py-4"
        scrollToBottom={messages && messages.length > 0}
      >
        {messages?.map((message) => (
          <MessageItem key={message._id} message={message} />
        ))}
      </MsgScrollArea>
      <TypingIndicator id={id} />
      <MessageInput id={id} />
    </>
  );
}
function TypingIndicator({ id }: { id: Id<"directMessages" | "channels"> }) {
  const usernames = useQuery(api.functions.typing.list, { dmOrChannelId: id });
  if (!usernames || usernames.length === 0) return null;
  return (
    <div className="text-sm text-muted-foreground px-4 py-2">
      {usernames.join(", ")} is typing...
    </div>
  );
}

type Message = FunctionReturnType<typeof api.functions.message.list>[number];

function MessageItem({ message }: { message: Message }) {
  const [editMode, setEditMode] = useState(false);
  return (
    <div className="flex items-center px-4 gap-2 py-2">
      <Avatar className="size-8 border">
        {message.sender && <AvatarImage src={message.sender?.image} />}
        <AvatarFallback />
      </Avatar>
      <div className="flex flex-col mr-auto">
        <p className=" flex gap-3 text-xs">
          {message.sender?.username ?? "Deleted User"}
          <span className="text-muted-foreground">
            {formatDate(parseTimestamp(message._creationTime))}
          </span>
        </p>
        {/* Display Deletion Reason if message is deleted */}
        {message.deleted ? (
          <>
            <p className={`text-sm text-destructive`}>
              This message has been deleted.{" "}
              {message.deletedReason && (
                <span
                  className={
                    message.deletedReason == "D1" ? "text-muted-foreground" : ""
                  }
                >
                  Reason: {chatViolations[message.deletedReason] || ""}
                </span>
              )}
            </p>
          </>
        ) : (
          <>
            {/* Display Edit Input if in edit mode */}
            {editMode ? (
              <EditMessageInput
                id={message._id}
                content={message.content}
                setEditMode={setEditMode}
              />
            ) : (
              <p className="text-sm">{message.content}</p>
            )}
          </>
        )}
        <div className="w-[%50]">
          {message.attachments?.map((attachment, index) => (
            <ImageFocus key={index}>
              <Image
                src={attachment ?? ""}
                width={300}
                height={300}
                className="rounded border overflow-hidden hover:shadow-lg transition-all"
                alt="Attachment"
              />
            </ImageFocus>
          ))}
        </div>
      </div>
      {message.deleted ? (
        <></>
      ) : (
        <MessageActions message={message} setEditMode={setEditMode} />
      )}
    </div>
  );
}

function parseTimestamp(timestamp: number): Date {
  // Convert to milliseconds (if microseconds is provided)
  // Check if the number is too large to be milliseconds
  const milliseconds =
    timestamp > 1e13
      ? Math.floor(timestamp / 1000) // Convert microseconds to milliseconds
      : timestamp;

  return new Date(milliseconds);
}

function formatDate(date: Date): string {
  const month = (date.getMonth() + 1).toString(); // getMonth() is 0-based
  const day = date.getDate().toString();
  const year = date.getFullYear().toString().slice(-2); // Get last 2 digits
  const hours = date.getHours();
  const minutes = date.getMinutes().toString().padStart(2, "0");

  // Convert hours to 12-hour format with AM/PM
  const period = hours >= 12 ? "PM" : "AM";
  const hours12 = hours % 12 || 12; // Convert 0 to 12 for midnight

  return `${month}/${day}/${year}, ${hours12}:${minutes} ${period}`;
}

function ImageFocus({ children }: { children: React.ReactNode }) {
  return (
    <Dialog>
      <DialogTrigger>{children}</DialogTrigger>
      <DialogContent>
        <DialogTitle />
        {children}
      </DialogContent>
    </Dialog>
  );
}

function MessageActions({
  message,
  setEditMode,
}: {
  message: Message;
  setEditMode: (state: boolean) => void;
}) {
  const user = useQuery(api.functions.user.get);
  const removeMessage = useMutation(api.functions.message.remove);
  if (!user || message.sender?._id !== user._id) return null;
  return (
    <DropdownMenu>
      <DropdownMenuTrigger>
        <MoreHorizontalIcon className="size-4 text-muted-foreground" />
        <span className="sr-only">Message Actions</span>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuItem
          className="cursor-pointer"
          onClick={() => {
            setEditMode(true);
          }}
        >
          <Pencil />
          Edit
        </DropdownMenuItem>
        <DropdownMenuItem
          className="text-destructive cursor-pointer"
          onClick={() => {
            removeMessage({ id: message._id });
          }}
        >
          <TrashIcon />
          Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function EditMessageInput({
  id,
  content,
  setEditMode,
}: {
  id: Id<"messages">;
  content: string;
  setEditMode: (state: boolean) => void;
}) {
  const editMessage = useMutation(api.functions.message.edit);
  const [editedMsg, setEditedMsg] = useState(content);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (content.length === 0) {
      return;
    }
    try {
      await editMessage({
        id: id,
        content: editedMsg,
      });
      setEditedMsg("");
      setEditMode(false);
      toast.success("Message updated");
    } catch (error) {
      toast.error("Failed to edit message", {
        description: error instanceof Error ? error.message : "Unknown error",
      });
    }
  };
  return (
    <form className="flex flex-col gap-1 w-full" onSubmit={handleSubmit}>
      <Input
        onChange={(e) => {
          setEditedMsg(e.target.value);
        }}
        value={editedMsg}
      ></Input>
      <div className="flex gap-2">
        <Button
          type="button"
          variant="secondary"
          onClick={() => {
            setEditMode(false);
          }}
        >
          Cancel
        </Button>
        <Button>Save</Button>
      </div>
    </form>
  );
}

function MessageInput({ id }: { id: Id<"directMessages" | "channels"> }) {
  const [content, setContent] = useState("");
  const sendMessage = useMutation(api.functions.message.create);
  const sendTypingIndicator = useMutation(api.functions.typing.upsert);
  const imageUpload = useImageUpload({ singleFile: false });

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (content.length === 0) {
      return;
    }
    try {
      await sendMessage({
        dmOrChannelId: id,
        content,
        attachments: imageUpload.storageIds,
      });
      setContent("");
      imageUpload.reset();
    } catch (error) {
      toast.error("Failed to send message", {
        description: error instanceof Error ? error.message : "Unknown error",
      });
    }
  };
  return (
    <>
      <form onSubmit={handleSubmit} className="flex items-end p-4 gap-2">
        <Button type="button" size="icon" onClick={() => imageUpload.open()}>
          <PlusIcon />
          <span className="sr-only">Attach</span>
        </Button>
        <div className="flex flex-col flex-1 gap-2">
          {imageUpload.previewUrls && (
            <ImagePreview
              files={imageUpload.files}
              urls={imageUpload.previewUrls}
              isUploading={imageUpload.isUploading}
              onRemove={imageUpload.removeByIndex}
            />
          )}
          <Input
            placeholder="Message"
            value={content}
            onChange={(e) => {
              setContent(e.target.value);
              if (e.target.value.length > 0) {
                sendTypingIndicator({ dmOrChannelId: id });
              }
            }}
          />
        </div>
        <Button size="icon">
          <SendIcon />
          <span className="sr-only">Send</span>
        </Button>
      </form>
      <input {...imageUpload.inputProps} />
    </>
  );
}

function ImagePreview({
  files,
  urls,
  isUploading,
  onRemove,
}: {
  files: File[];
  urls: string[];
  isUploading: boolean;
  onRemove: (index: number) => void;
}) {
  return (
    <div className="relative size-41 flex gap-5">
      {urls?.map((url, index) => (
        <div className="h-full max-w-fit" key={index}>
          <div className="relative flex justify-end -right-4 top-5">
            <Button
              type="button"
              size="icon"
              variant="ghost"
              className="border bg-red-100 hover:bg-red-200"
              onClick={() => {
                onRemove(index);
              }}
            >
              <Trash className="dark:text-black" />
              <span className="sr-only">Remove</span>
            </Button>
          </div>
          <Card className="p-2.5">
            {url && (
              <Image
                src={url}
                alt="Attachment"
                width={300}
                height={300}
                className="rounded border overflow-hidden"
              />
            )}

            <p className="text-sm text-muted-foreground">{files[index].name}</p>
            <p className="text-sm text-muted-foreground">
              {files[index].size < 1024 * 1024
                ? `${(files[index].size / 1024).toFixed(2)} KB`
                : `${(files[index].size / (1024 * 1024)).toFixed(2)} MB`}
            </p>
          </Card>
        </div>
      ))}

      {isUploading && (
        <div className="absolute inset-0 bg-background/50 flex items-center justify-center">
          <LoaderIcon className="size-8 animate-spin" />
        </div>
      )}
    </div>
  );
}
