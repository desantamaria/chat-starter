"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useMutation, useQuery } from "convex/react";
import { FunctionReturnType } from "convex/server";
import {
  LoaderIcon,
  MoreHorizontalIcon,
  PlusIcon,
  SendIcon,
  Trash,
  TrashIcon,
} from "lucide-react";
import Image from "next/image";
import { use, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { api } from "../../../../../convex/_generated/api";
import { Id } from "../../../../../convex/_generated/dataModel";

export default function MessagePage({
  params,
}: {
  params: Promise<{ id: Id<"directMessages"> }>;
}) {
  const { id } = use(params);

  const directMessage = useQuery(api.functions.dm.get, { id });
  const messages = useQuery(api.functions.message.list, { directMessage: id });
  if (!directMessage) {
    return null;
  }

  return (
    <div className="flex flex-1 flex-col divide-y max-h-screen">
      <header className="flex items-center gap-2 p-4">
        <Avatar className="size-8 border">
          <AvatarImage src={directMessage.user.image} />
          <AvatarFallback />
        </Avatar>
        <h1 className="font-semibold">{directMessage.user.username}</h1>
      </header>
      <ScrollArea
        className="h-full py-4"
        scrollToBottom={messages && messages.length > 0}
      >
        {messages?.map((message) => (
          <MessageItem key={message._id} message={message} />
        ))}
      </ScrollArea>
      <TypingIndicator directMessage={id} />
      <MessageInput directMessage={id} />
    </div>
  );
}

function TypingIndicator({
  directMessage,
}: {
  directMessage: Id<"directMessages">;
}) {
  const usernames = useQuery(api.functions.typing.list, { directMessage });
  if (!usernames || usernames.length === 0) return null;
  return (
    <div className="text-sm text-muted-foreground px-4 py-2">
      {usernames.join(", ")} is typing...
    </div>
  );
}

type Message = FunctionReturnType<typeof api.functions.message.list>[number];

function MessageItem({ message }: { message: Message }) {
  return (
    <div className="flex items-center px-4 gap-2 py-2">
      <Avatar className="size-8 border">
        {message.sender && <AvatarImage src={message.sender?.image} />}
        <AvatarFallback />
      </Avatar>
      <div className="flex flex-col mr-auto">
        <p className="text-xs text-muted-foreground">
          {message.sender?.username ?? "Deleted User"}
        </p>
        <p className="text-sm">{message.content}</p>
        {message.attachments?.map((attachment, index) => (
          <Image
            key={index}
            src={attachment ?? ""}
            width={300}
            height={300}
            className="rounded border overflow-hidden"
            alt="Attachment"
          />
        ))}
      </div>
      <MessageActions message={message} />
    </div>
  );
}

function MessageActions({ message }: { message: Message }) {
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
          className="text-destructive"
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

function MessageInput({
  directMessage,
}: {
  directMessage: Id<"directMessages">;
}) {
  const [content, setContent] = useState("");
  const sendMessage = useMutation(api.functions.message.create);
  const sendTypingIndicator = useMutation(api.functions.typing.upsert);
  const generateUploadUrl = useMutation(
    api.functions.message.generateUploadUrl
  );
  const removeFileById = useMutation(api.functions.message.removeFileById);
  const [attachments, setAttachments] = useState<Id<"_storage">[]>([]);
  const [files, setFiles] = useState<File[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFiles([...files, file]);
    setIsUploading(true);
    const url = await generateUploadUrl();
    const res = await fetch(url, {
      method: "POST",
      body: file,
    });
    const { storageId } = (await res.json()) as { storageId: Id<"_storage"> };
    setAttachments([...attachments, storageId]);
    setIsUploading(false);
  };

  const handleRemoveFile = async (index: number) => {
    try {
      if (attachments[index]) {
        await removeFileById({ storageId: attachments[index] });
      }
      const newAttachments = attachments.filter((_, i) => i !== index);
      const newFiles = files.filter((_, i) => i !== index);
      setAttachments(newAttachments);
      setFiles(newFiles);
    } catch (error) {
      toast.error("Failed to remove file", {
        description: error instanceof Error ? error.message : "Unknown error",
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    try {
      await sendMessage({ directMessage, content, attachments });
      setContent("");
      setAttachments([]);
      setFiles([]);
    } catch (error) {
      toast.error("Failed to send message", {
        description: error instanceof Error ? error.message : "Unknown error",
      });
    }
  };
  return (
    <>
      <form onSubmit={handleSubmit} className="flex items-end p-4 gap-2">
        <Button
          type="button"
          size="icon"
          onClick={() => fileInputRef.current?.click()}
        >
          <PlusIcon />
          <span className="sr-only">Attach</span>
        </Button>
        <div className="flex flex-col flex-1 gap-2">
          {files && (
            <ImagePreview
              files={files}
              isUploading={isUploading}
              onRemove={handleRemoveFile}
            />
          )}
          <Input
            placeholder="Message"
            value={content}
            onChange={(e) => {
              setContent(e.target.value);
              if (e.target.value.length > 0) {
                sendTypingIndicator({ directMessage });
              }
            }}
          />
        </div>
        <Button size="icon">
          <SendIcon />
          <span className="sr-only">Send</span>
        </Button>
      </form>
      <input
        type="file"
        className="hidden"
        ref={fileInputRef}
        onChange={handleFileUpload}
      />
    </>
  );
}

function ImagePreview({
  files,
  isUploading,
  onRemove,
}: {
  files: File[];
  isUploading: boolean;
  onRemove: (index: number) => void;
}) {
  const [fileUrls, setFileUrls] = useState<string[]>([]);

  useEffect(() => {
    const urls = files.map((file) => URL.createObjectURL(file));
    console.log(urls);
    setFileUrls(urls);
  }, [files]);
  return (
    <div className="relative size-41 flex gap-5">
      {files?.map((file, index) => (
        <div className="h-full max-w-fit" key={index}>
          <div className="relative flex justify-end -right-4 top-5">
            <Button
              type="button"
              size="icon"
              variant="ghost"
              className="border bg-red-100 hover:bg-red-200"
              onClick={() => {
                console.log(fileUrls[index]);
                onRemove(index);
              }}
            >
              <Trash />
              <span className="sr-only">Remove</span>
            </Button>
          </div>
          <Card className="p-2.5">
            {fileUrls[index] && (
              <Image
                src={fileUrls[index]}
                alt="Attachment"
                width={300}
                height={300}
                className="rounded border overflow-hidden"
              />
            )}

            <p className="text-sm text-muted-foreground">{file.name}</p>
            <p className="text-sm text-muted-foreground">
              {file.size < 1024 * 1024
                ? `${(file.size / 1024).toFixed(2)} KB`
                : `${(file.size / (1024 * 1024)).toFixed(2)} MB`}
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
