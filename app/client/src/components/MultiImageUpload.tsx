import { useState, useRef, useCallback } from "react";
import { motion, AnimatePresence, Reorder } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Upload, X, GripVertical, ImageIcon, CheckCircle2, Loader2 } from "lucide-react";
import { trpc } from "@/lib/trpc";

interface MultiImageUploadProps {
  images: string[];
  onChange: (images: string[]) => void;
  maxImages?: number;
  maxSizeMB?: number;
  language?: "cn" | "en";
}

export function MultiImageUpload({
  images,
  onChange,
  maxImages = 10,
  maxSizeMB = 10,
  language = "cn",
}: MultiImageUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const uploadImageMutation = trpc.apartments.uploadImage.useMutation();

  const handleFileSelect = useCallback(async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    const remainingSlots = maxImages - images.length;
    if (remainingSlots <= 0) {
      toast.error(language === "cn" ? `最多只能上传 ${maxImages} 张图片` : `Maximum ${maxImages} images allowed`);
      return;
    }

    const filesToUpload = Array.from(files).slice(0, remainingSlots);
    setUploading(true);
    setUploadProgress(0);

    const newImages: string[] = [];
    let completed = 0;

    for (const file of filesToUpload) {
      // Validate file type
      if (!file.type.startsWith("image/")) {
        toast.error(language === "cn" ? `${file.name} 不是图片文件` : `${file.name} is not an image`);
        continue;
      }

      // Validate file size
      if (file.size > maxSizeMB * 1024 * 1024) {
        toast.error(
          language === "cn"
            ? `${file.name} 超过 ${maxSizeMB}MB 限制`
            : `${file.name} exceeds ${maxSizeMB}MB limit`
        );
        continue;
      }

      try {
        // Convert to base64
        const base64 = await fileToBase64(file);
        const base64Data = base64.split(",")[1]; // Remove data URL prefix

        // Upload to S3
        const result = await uploadImageMutation.mutateAsync({
          fileData: base64Data,
          mimeType: file.type,
          fileName: file.name,
        });

        newImages.push(result.url);
        completed++;
        setUploadProgress(Math.round((completed / filesToUpload.length) * 100));
      } catch (error) {
        console.error("Upload failed:", error);
        // Fallback to base64 if S3 upload fails
        try {
          const base64 = await fileToBase64(file);
          newImages.push(base64);
          completed++;
          setUploadProgress(Math.round((completed / filesToUpload.length) * 100));
          toast.info(language === "cn" ? "已使用本地存储" : "Using local storage");
        } catch {
          toast.error(language === "cn" ? `${file.name} 上传失败` : `Failed to upload ${file.name}`);
        }
      }
    }

    if (newImages.length > 0) {
      onChange([...images, ...newImages]);
      toast.success(
        language === "cn"
          ? `成功上传 ${newImages.length} 张图片`
          : `Successfully uploaded ${newImages.length} image(s)`
      );
    }

    setUploading(false);
    setUploadProgress(0);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }, [images, maxImages, maxSizeMB, language, onChange, uploadImageMutation]);

  const removeImage = (index: number) => {
    const newImages = images.filter((_, i) => i !== index);
    onChange(newImages);
  };

  const handleReorder = (newOrder: string[]) => {
    onChange(newOrder);
  };

  return (
    <div className="space-y-4">
      {/* Upload Area */}
      <input
        type="file"
        ref={fileInputRef}
        accept="image/*"
        multiple
        onChange={(e) => handleFileSelect(e.target.files)}
        className="hidden"
      />

      {images.length < maxImages && (
        <div
          onClick={() => !uploading && fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors ${
            uploading
              ? "border-primary bg-primary/5 cursor-wait"
              : "border-gray-300 hover:border-primary hover:bg-primary/5"
          }`}
        >
          {uploading ? (
            <div className="space-y-2">
              <Loader2 className="w-10 h-10 text-primary mx-auto animate-spin" />
              <p className="text-sm font-medium text-primary">
                {language === "cn" ? `上传中... ${uploadProgress}%` : `Uploading... ${uploadProgress}%`}
              </p>
            </div>
          ) : (
            <>
              <Upload className="w-10 h-10 text-gray-400 mx-auto mb-2" />
              <p className="text-sm font-medium text-gray-700">
                {language === "cn" ? "点击或拖拽上传图片" : "Click or drag to upload images"}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                {language === "cn"
                  ? `支持 JPG, PNG, WebP，最大 ${maxSizeMB}MB，最多 ${maxImages} 张`
                  : `Supports JPG, PNG, WebP, max ${maxSizeMB}MB, up to ${maxImages} images`}
              </p>
            </>
          )}
        </div>
      )}

      {/* Image Preview Grid with Reorder */}
      {images.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-gray-700">
              {language === "cn" ? `已上传 ${images.length}/${maxImages} 张` : `${images.length}/${maxImages} uploaded`}
            </p>
            <p className="text-xs text-gray-500">
              {language === "cn" ? "拖拽调整顺序，第一张为封面" : "Drag to reorder, first is cover"}
            </p>
          </div>

          <Reorder.Group
            axis="x"
            values={images}
            onReorder={handleReorder}
            className="flex flex-wrap gap-3"
          >
            <AnimatePresence>
              {images.map((image, index) => (
                <Reorder.Item
                  key={image}
                  value={image}
                  className="relative group"
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  whileDrag={{ scale: 1.05, zIndex: 10 }}
                >
                  <div className="relative w-24 h-24 rounded-lg overflow-hidden border border-border">
                    <img
                      src={image}
                      alt={`Image ${index + 1}`}
                      className="w-full h-full object-cover"
                    />
                    
                    {/* Cover badge */}
                    {index === 0 && (
                      <Badge className="absolute top-1 left-1 bg-primary text-white text-[10px] px-1.5 py-0.5">
                        {language === "cn" ? "封面" : "Cover"}
                      </Badge>
                    )}

                    {/* Drag handle */}
                    <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <div className="bg-white/80 rounded p-0.5 cursor-grab active:cursor-grabbing">
                        <GripVertical className="w-3 h-3 text-gray-600" />
                      </div>
                    </div>

                    {/* Delete button */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        removeImage(index);
                      }}
                      className="absolute bottom-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                    >
                      <X className="w-3 h-3" />
                    </button>

                    {/* S3 indicator */}
                    {!image.startsWith("data:") && (
                      <div className="absolute bottom-1 left-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Badge className="bg-green-500 text-white text-[10px] px-1 py-0">
                          <CheckCircle2 className="w-2 h-2 mr-0.5" />
                          S3
                        </Badge>
                      </div>
                    )}
                  </div>
                </Reorder.Item>
              ))}
            </AnimatePresence>
          </Reorder.Group>
        </div>
      )}

      {/* Empty state */}
      {images.length === 0 && !uploading && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-amber-50 border border-amber-200">
          <ImageIcon className="w-4 h-4 text-amber-600 flex-shrink-0" />
          <p className="text-xs text-amber-700">
            {language === "cn"
              ? "建议上传 3-5 张高质量图片，第一张将作为封面展示"
              : "Recommend uploading 3-5 high-quality images, first one will be the cover"}
          </p>
        </div>
      )}
    </div>
  );
}

// Helper function to convert file to base64
function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
