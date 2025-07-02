interface TokenResponse {
  token: string;
  expiresIn: number;
  tokenType: string;
}

class JWTService {
  private token: string | null = null;
  private tokenExpiry: number | null = null;
  private refreshPromise: Promise<string> | null = null;
  private aiServiceUrl: string;
  private originalFetch: typeof fetch;
  private interceptorInstalled = false;

  constructor() {
    // Use environment variable or default to localhost for development
    this.aiServiceUrl =
      process.env.VITE_AI_SERVICE_URL || "http://localhost:5000";
    this.originalFetch = window.fetch.bind(window);
  }

  // Install global fetch interceptor
  installFetchInterceptor(): void {
    if (this.interceptorInstalled) return;

    window.fetch = async (
      input: RequestInfo | URL,
      init?: RequestInit
    ): Promise<Response> => {
      const url = input instanceof Request ? input.url : input.toString();

      // Check if this is an AI service request
      if (this.isAIServiceRequest(url)) {
        return this.handleAIServiceRequest(input, init);
      }

      // For all other requests, use original fetch
      return this.originalFetch(input, init);
    };

    this.interceptorInstalled = true;
    console.log("🔐 JWT fetch interceptor installed for AI service requests");
  }

  private isAIServiceRequest(url: string): boolean {
    // Check if URL is for AI service (localhost:5000 or configured AI service URL)
    return (
      url.includes("localhost:5000") ||
      url.includes(this.aiServiceUrl) ||
      url.includes("/copilotkit") ||
      url.includes("/api/ai/")
    );
  }

  private async handleAIServiceRequest(
    input: RequestInfo | URL,
    init?: RequestInit
  ): Promise<Response> {
    try {
      const token = await this.getValidToken();

      if (!token) {
        throw new Error("No valid JWT token available for AI service request");
      }

      // Prepare headers with JWT token
      const headers = new Headers(init?.headers);
      headers.set("Authorization", `Bearer ${token}`);
      headers.set("Content-Type", "application/json");

      const requestInit: RequestInit = {
        ...init,
        headers
      };

      // Make the request
      const response = await this.originalFetch(input, requestInit);

      // If token expired, try once more with refresh
      if (response.status === 401) {
        console.log(
          "🔄 JWT token expired, attempting refresh for AI service request"
        );
        this.clearToken();
        const newToken = await this.getValidToken();

        if (newToken) {
          headers.set("Authorization", `Bearer ${newToken}`);
          return this.originalFetch(input, { ...requestInit, headers });
        } else {
          console.error(
            "❌ Unable to refresh JWT token for AI service request"
          );
        }
      }

      return response;
    } catch (error) {
      console.error("❌ Error in AI service request interceptor:", error);
      //   throw error;
      // Fall back to original fetch without auth (will likely fail, but preserves behavior)
      return this.originalFetch(input, init);
    }
  }

  async getValidToken(): Promise<string | null> {
    // If we have a valid token, return it
    if (
      this.token &&
      this.tokenExpiry &&
      Date.now() < this.tokenExpiry - 60000
    ) {
      // 1 min buffer
      return this.token;
    }

    // If we're already refreshing, wait for that
    if (this.refreshPromise) {
      try {
        return await this.refreshPromise;
      } catch {
        return null;
      }
    }

    // Start refresh process
    this.refreshPromise = this.refreshToken();
    try {
      const token = await this.refreshPromise;
      this.refreshPromise = null;
      return token;
    } catch {
      this.refreshPromise = null;
      return null;
    }
  }

  private async refreshToken(): Promise<string> {
    try {
      const response = await fetch("/jwt/ai-token", {
        method: "POST",
        credentials: "include", // Include session cookie
        headers: {
          "Content-Type": "application/json"
        }
      });

      if (!response.ok) {
        throw new Error("Token refresh failed");
      }

      const data: TokenResponse = await response.json();

      this.token = data.token;
      this.tokenExpiry = Date.now() + data.expiresIn * 1000;

      return data.token;
    } catch (error) {
      this.clearToken();
      throw error;
    }
  }

  clearToken(): void {
    this.token = null;
    this.tokenExpiry = null;
  }

  // Method to check if user has a valid session (can obtain tokens)
  async hasValidSession(): Promise<boolean> {
    try {
      const token = await this.getValidToken();
      return !!token;
    } catch {
      return false;
    }
  }
}

export const jwtService = new JWTService();
