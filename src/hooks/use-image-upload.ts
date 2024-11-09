import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import { useRef, useState } from "react";

export function useImageUpload() {
  const generateUploadUrl = useMutation(
    api.functions.storage.generateUploadUrl
  );

  const [storageIds, setStorageIds] = useState<Id<"_storage">[]>([]);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const open = () => {
    if (inputRef.current) {
      inputRef.current.click();
    }
  };

  const handleImageChange = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setPreviewUrls([...previewUrls, URL.createObjectURL(file)]);

    const url = await generateUploadUrl();
    const res = await fetch(url, {
      method: "POST",
      body: file,
    });
    const data = (await res.json()) as { storageId: Id<"_storage"> };
    setStorageIds([...storageIds, data.storageId]);
    setIsUploading(false);
  };

  const reset = () => {
    setStorageIds([]);
    setPreviewUrls([]);
    if (inputRef.current) {
      inputRef.current.value = "";
    }
  };

  return {
    storageIds,
    previewUrls,
    isUploading,
    open,
    reset,
    inputProps: {
      type: "file",
      className: "hidden",
      ref: inputRef,
      onChange: handleImageChange,
    },
  };
}
