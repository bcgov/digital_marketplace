import { jwtService } from "./jwt.service";

class AppInitService {
  private initialized = false;

  async initialize(): Promise<void> {
    if (this.initialized) return;

    console.log("🚀 Initializing Digital Marketplace App...");

    try {
      // Initialize JWT fetch interceptor
      jwtService.installFetchInterceptor();

      // Check if user has a valid session
      const hasValidSession = await jwtService.hasValidSession();
      console.log(
        `🔑 User session status: ${hasValidSession ? "Valid" : "Invalid/None"}`
      );

      this.initialized = true;
      console.log("✅ App initialization complete");
    } catch (error) {
      console.error("❌ App initialization failed:", error);
      // Don't throw - allow app to continue even if JWT init fails
    }
  }
}

export const appInitService = new AppInitService();
