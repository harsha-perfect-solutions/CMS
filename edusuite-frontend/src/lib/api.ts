// Lightweight API client with Request Interceptors & 401 handling using native fetch

export interface ApiResponse<T = any> {
  data: T;
  status: number;
  statusText: string;
}

class ApiClient {
  private baseURL: string;

  constructor() {
    const host = typeof window !== "undefined" ? window.location.hostname : "localhost";
    const isLocalNetwork =
      typeof window !== "undefined" &&
      (host === "localhost" ||
        host === "127.0.0.1" ||
        host.startsWith("192.168.") ||
        host.startsWith("10.") ||
        host.startsWith("172."));
    this.baseURL = isLocalNetwork ? `http://${host}:5000/` : "/";
  }

  public getBaseURL(): string {
    return this.baseURL;
  }

  private async request<T = any>(
    endpoint: string,
    options: RequestInit = {},
  ): Promise<ApiResponse<T>> {
    const token =
      typeof window !== "undefined"
        ? localStorage.getItem("token") || localStorage.getItem("cms_token") || null
        : null;

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      ...(options.headers as Record<string, string>),
    };

    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    try {
      const response = await fetch(`${this.baseURL}${endpoint.replace(/^\//, "")}`, {
        ...options,
        headers,
      });

      // Handle 401 without forcing a full page reload / redirect to /login
      if (response.status === 401) {
        console.warn(`API 401 Unauthorized for ${endpoint}. Falling back to mock dataset.`);
        return {
          data: null as any,
          status: 401,
          statusText: "Unauthorized",
        };
      }

      let data: any = null;
      const contentType = response.headers.get("content-type");
      if (contentType && contentType.includes("application/json")) {
        data = await response.json();
      }

      return {
        data,
        status: response.status,
        statusText: response.statusText,
      };
    } catch (error) {
      return {
        data: null as any,
        status: 500,
        statusText: "Internal Error",
      };
    }
  }

  public async get<T = any>(
    endpoint: string,
    options: RequestInit & { params?: Record<string, any> } = {}
  ): Promise<ApiResponse<T>> {
    let finalEndpoint = endpoint;
    if (options.params) {
      const searchParams = new URLSearchParams();
      Object.entries(options.params).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== "") {
          searchParams.append(key, String(value));
        }
      });
      const queryString = searchParams.toString();
      if (queryString) {
        finalEndpoint += (finalEndpoint.includes("?") ? "&" : "?") + queryString;
      }
    }
    const { params, ...fetchOptions } = options;
    return this.request<T>(finalEndpoint, { method: "GET", ...fetchOptions });
  }

  public async post<T = any>(endpoint: string, body?: any): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: "POST",
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  public async put<T = any>(endpoint: string, body?: any): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: "PUT",
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  public async delete<T = any>(endpoint: string): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { method: "DELETE" });
  }
}

const api = new ApiClient();
export { api };
export default api;
