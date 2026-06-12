import { getFunctions, httpsCallable } from "firebase/functions";
import { app } from "./firebase";
import { isAllowedImageUri, MAX_IMAGE_BYTES } from "@/utils/security";

const CLOUD_NAME = "dchiewxeo";
const UPLOAD_URL = `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`;

export class CloudinaryService {
  /**
   * Uploads an image using a server-signed Cloudinary signature.
   * Falls back is not provided — uploads require authentication.
   */
  static async uploadImage(imageUri: string): Promise<string> {
    if (!isAllowedImageUri(imageUri)) {
      throw new Error("Unsupported image type. Use JPG, PNG, or WebP.");
    }

    try {
      const functions = getFunctions(app);
      const getSignature = httpsCallable(functions, "getCloudinaryUploadSignature");
      const sigResult = await getSignature({});
      const sig = sigResult.data as {
        apiKey: string;
        timestamp: number;
        signature: string;
        folder: string;
      };

      const fileExtension = imageUri.split(".").pop()?.toLowerCase().split("?")[0] || "jpg";
      const mimeType =
        fileExtension === "png"
          ? "image/png"
          : fileExtension === "webp"
            ? "image/webp"
            : "image/jpeg";

      const formData = new FormData();
      formData.append("file", {
        uri: imageUri,
        type: mimeType,
        name: `upload_${Date.now()}.${fileExtension}`,
      } as any);
      formData.append("api_key", sig.apiKey);
      formData.append("timestamp", String(sig.timestamp));
      formData.append("signature", sig.signature);
      formData.append("folder", sig.folder);

      const response = await fetch(UPLOAD_URL, {
        method: "POST",
        body: formData,
        headers: {
          Accept: "application/json",
          "Content-Type": "multipart/form-data",
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error?.message || "Cloudinary upload failed");
      }

      if (data.bytes && data.bytes > MAX_IMAGE_BYTES) {
        await this.deleteImage(data.secure_url);
        throw new Error("Image exceeds the maximum allowed size (10 MB).");
      }

      return data.secure_url;
    } catch (error) {
      console.error("Cloudinary Upload Error:", error);
      throw error;
    }
  }

  /** Delete an image via secured Cloud Function (owner folder only). */
  static async deleteImage(secureUrl: string): Promise<void> {
    if (!secureUrl?.includes("cloudinary.com")) return;
    try {
      const functions = getFunctions(app);
      const deleteFn = httpsCallable(functions, "deleteCloudinaryImage");
      await deleteFn({ secureUrl });
    } catch (error) {
      console.warn("Cloudinary Delete Error:", error);
    }
  }
}
