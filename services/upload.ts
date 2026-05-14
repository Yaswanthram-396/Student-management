import { Platform } from "react-native";

export interface UploadAsset {
  uri: string;
  name?: string | null;
  mimeType?: string | null;
  file?: File;
}

export async function appendAssetToFormData(
  formData: FormData,
  fieldName: string,
  asset: UploadAsset,
  fallbackName = "upload.bin",
) {
  const fileName = asset.name || fallbackName;
  const mimeType = asset.mimeType || "application/octet-stream";

  if (Platform.OS === "web") {
    if (asset.file) {
      formData.append(fieldName, asset.file, fileName);
      return;
    }

    const response = await fetch(asset.uri);
    const blob = await response.blob();
    formData.append(fieldName, blob, fileName);
    return;
  }

  formData.append(fieldName, {
    uri: asset.uri,
    name: fileName,
    type: mimeType,
  } as any);
}
