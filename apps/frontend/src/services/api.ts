const API_BASE = import.meta.env.VITE_API_BASE || "/api";

class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<{ data: T; status: number }> {
    const url = `${this.baseUrl}${endpoint}`;
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      ...(options.headers as Record<string, string>),
    };

    const response = await fetch(url, {
      ...options,
      headers,
    });

    let data: T;
    try {
      data = await response.json();
    } catch {
      data = null as T;
    }

    if (!response.ok) {
      const error = data as { detail?: string } | null;
      throw new Error(error?.detail || `HTTP ${response.status}: ${response.statusText}`);
    }

    return { data: data as T, status: response.status };
  }

  async get<T>(endpoint: string): Promise<{ data: T; status: number }> {
    return this.request<T>(endpoint, { method: "GET" });
  }

  async post<T>(endpoint: string, body: unknown): Promise<{ data: T; status: number }> {
    return this.request<T>(endpoint, {
      method: "POST",
      body: JSON.stringify(body),
    });
  }

  async patch<T>(endpoint: string, body: unknown): Promise<{ data: T; status: number }> {
    return this.request<T>(endpoint, {
      method: "PATCH",
      body: JSON.stringify(body),
    });
  }

  async delete<T>(endpoint: string): Promise<{ data: T; status: number }> {
    return this.request<T>(endpoint, { method: "DELETE" });
  }
}

export const api = new ApiClient(API_BASE);