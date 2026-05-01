import { authService } from "../services/authService";
import { resetMockAuthUsers } from "../services/mockAuthService";

describe("authService debug", () => {
  it("logs in demo account", async () => {
    resetMockAuthUsers();
    await expect(
      authService.login({ email: "demo@f1insighthub.dev", password: "DemoPass!123" })
    ).resolves.toMatchObject({
      user: {
        email: "demo@f1insighthub.dev",
      },
    });
  });
});
