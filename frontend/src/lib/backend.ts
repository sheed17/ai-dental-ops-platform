const BACKEND_BASE_URL = process.env.API_BASE_URL || process.env.NEXT_PUBLIC_API_BASE_URL;

export async function fetchBackend<T>(path: string): Promise<T> {
  if (!BACKEND_BASE_URL) {
    throw new Error("Missing API_BASE_URL for backend proxy.");
  }

  const response = await fetch(`${BACKEND_BASE_URL}${path}`, {
    headers: { Accept: "application/json" },
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Backend request failed: ${response.status} ${path}`);
  }

  return response.json() as Promise<T>;
}
