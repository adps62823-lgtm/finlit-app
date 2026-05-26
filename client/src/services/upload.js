import { apiRequest } from "./api";

function inferResourceType(file) {
  if (!file) return "auto";
  if (file.type.startsWith("image/")) return "image";
  if (file.type.startsWith("video/") || file.type.startsWith("audio/")) return "video";
  return "raw";
}

export async function uploadToCloudinary(file, token) {
  if (!file) return null;

  const resourceType = inferResourceType(file);
  const signatureData = await apiRequest("/uploads/sign", token, {
    method: "POST",
    body: JSON.stringify({ resourceType }),
  });

  const formData = new FormData();
  formData.append("file", file);
  formData.append("api_key", signatureData.apiKey);
  formData.append("timestamp", String(signatureData.timestamp));
  formData.append("signature", signatureData.signature);
  formData.append("folder", signatureData.folder);

  const uploadResponse = await fetch(
    `https://api.cloudinary.com/v1_1/${signatureData.cloudName}/${signatureData.resourceType}/upload`,
    {
      method: "POST",
      body: formData,
    }
  );

  if (!uploadResponse.ok) {
    throw new Error("Cloudinary upload failed");
  }

  const uploaded = await uploadResponse.json();
  return {
    attachmentUrl: uploaded.secure_url,
    attachmentType: resourceType,
    attachmentName: file.name,
  };
}
