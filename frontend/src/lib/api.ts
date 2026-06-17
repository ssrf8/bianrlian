export type VerificationRecord = {
  id: number;
  account: string;
  status: string;
  video_filename: string;
  video_content_type: string;
  video_size: number;
  actions_passed: string;
  duration_ms: number;
  client_metadata: string;
  created_at: string;
};

export async function uploadVerification(input: {
  account: string;
  video: Blob;
  actionsPassed: string[];
  durationMs: number;
}) {
  const form = new FormData();
  const extension = input.video.type.includes("mp4") ? "mp4" : "webm";
  form.append("account", input.account);
  form.append("video", input.video, `face-verification-${Date.now()}.${extension}`);
  form.append("actionsPassed", JSON.stringify(input.actionsPassed));
  form.append("durationMs", String(input.durationMs));
  form.append(
    "clientMetadata",
    JSON.stringify({
      userAgent: navigator.userAgent,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
    })
  );

  const response = await fetch("/api/verification", {
    method: "POST",
    body: form
  });
  if (!response.ok) {
    throw new Error(await readApiError(response));
  }
  return response.json();
}

export async function adminLogin(username: string, password: string) {
  const response = await fetch("/api/admin/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password })
  });
  if (!response.ok) {
    throw new Error(await readApiError(response));
  }
  return (await response.json()) as { token: string };
}

export async function fetchVerifications(token: string) {
  const response = await fetch("/api/admin/verifications", {
    headers: { Authorization: `Bearer ${token}` }
  });
  if (!response.ok) {
    throw new Error(await readApiError(response));
  }
  return (await response.json()) as VerificationRecord[];
}

export async function deleteVerification(token: string, id: number) {
  const response = await fetch(`/api/admin/verifications/${id}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` }
  });
  if (!response.ok) {
    throw new Error(await readApiError(response));
  }
}

async function readApiError(response: Response) {
  try {
    const payload = await response.json();
    return payload.detail || "请求失败";
  } catch {
    return "请求失败";
  }
}
