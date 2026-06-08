export class CloudinaryService {
  private static CLOUD_NAME = 'dchiewxeo';
  private static UPLOAD_PRESET = 'neighborly_upload';
  private static UPLOAD_URL = `https://api.cloudinary.com/v1_1/dchiewxeo/image/upload`;

  /**
   * Uploads an image to Cloudinary using an unsigned preset.
   * @param imageUri The local file URI from Expo ImagePicker
   * @returns The secure URL of the uploaded image
   */
  static async uploadImage(imageUri: string): Promise<string> {
    try {
      const formData = new FormData();
      
      // Extract file extension and type
      const fileExtension = imageUri.split('.').pop()?.toLowerCase() || 'jpg';
      const mimeType = fileExtension === 'png' ? 'image/png' : 'image/jpeg';
      
      // Format the file object required by React Native's FormData
      formData.append('file', {
        uri: imageUri,
        type: mimeType,
        name: `upload_${Date.now()}.${fileExtension}`,
      } as any);
      
      formData.append('upload_preset', this.UPLOAD_PRESET);
      formData.append('cloud_name', this.CLOUD_NAME);

      const response = await fetch(this.UPLOAD_URL, {
        method: 'POST',
        body: formData,
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'multipart/form-data',
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error?.message || 'Cloudinary upload failed');
      }

      return data.secure_url;
    } catch (error) {
      console.error('Cloudinary Upload Error:', error);
      throw error;
    }
  }
}
