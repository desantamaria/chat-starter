import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import { useRef, useState } from "react";

export function useImageUpload({ singleFile }: { singleFile: boolean }) {
  const generateUploadUrl = useMutation(
    api.functions.storage.generateUploadUrl
  );
  const removeFileById = useMutation(api.functions.storage.removeFileById);

  const [storageIds, setStorageIds] = useState<Id<"_storage">[]>([]);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const [files, setFiles] = useState<File[]>([]);
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
    if (singleFile) {
      setPreviewUrls([URL.createObjectURL(file)]);
      setFiles([file]);
    } else {
      setPreviewUrls([...previewUrls, URL.createObjectURL(file)]);
      setFiles([...files, file]);
    }

    const url = await generateUploadUrl();
    const res = await fetch(url, {
      method: "POST",
      body: file,
    });
    const data = (await res.json()) as { storageId: Id<"_storage"> };
    if (singleFile) {
      if (storageIds[0] !== undefined && storageIds[0] !== null) {
        await removeFileById({ storageId: storageIds[0] });
      }

      setStorageIds([data.storageId]);
    } else {
      setStorageIds([...storageIds, data.storageId]);
    }
    setIsUploading(false);
  };

  const reset = () => {
    setStorageIds([]);
    setPreviewUrls([]);
    setFiles([]);
    if (inputRef.current) {
      inputRef.current.value = "";
    }
  };

  const removeByIndex = async (index: number) => {
    if (storageIds[index]) {
      await removeFileById({ storageId: storageIds[index] });
      setPreviewUrls(previewUrls.filter((_, i) => i !== index));
      setStorageIds(storageIds.filter((_, i) => i !== index));
      setFiles(files.filter((_, i) => i !== index));
    }
  };

  return {
    files,
    storageIds,
    previewUrls,
    isUploading,
    open,
    reset,
    removeByIndex,
    inputProps: {
      type: "file",
      className: "hidden",
      ref: inputRef,
      onChange: handleImageChange,
    },
    setStorageIds,
    setPreviewUrls,
  };
}
