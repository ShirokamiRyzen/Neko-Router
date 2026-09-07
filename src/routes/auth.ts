import { Elysia, t } from "elysia";
import { isDefaultPin, verifyPin, changePin, getJwtSecret } from "../services/auth";
import { jwt } from "@elysiajs/jwt";

export const authRoutes = new Elysia({ prefix: "/api/auth" })
  .use(
    jwt({
      name: "jwt",
      secret: getJwtSecret(),
      exp: "7d",
    })
  )
  .get("/status", async ({ cookie, jwt }) => {
    const isDefault = isDefaultPin();
    let authenticated = false;

    const session = cookie?.session;
    if (session?.value) {
      try {
        const payload = await jwt.verify(session.value as string);
        if (payload && payload.role === "admin") {
          authenticated = true;
        }
      } catch (e) {
        authenticated = false;
      }
    }

    return {
      isDefaultPin: isDefault,
      authenticated,
    };
  })
  .post(
    "/login",
    async ({ body, cookie, jwt, set }) => {
      const { pin } = body;
      const isValid = await verifyPin(pin);

      if (!isValid) {
        set.status = 401;
        return { success: false, message: "Invalid PIN" };
      }

      const token = await jwt.sign({ role: "admin", timestamp: Date.now() });

      cookie.session?.set({
        value: token,
        httpOnly: true,
        maxAge: 7 * 24 * 60 * 60,
        path: "/",
        sameSite: "lax",
      });

      return {
        success: true,
        token,
        isDefaultPin: isDefaultPin(),
      };
    },
    {
      body: t.Object({
        pin: t.String(),
      }),
    }
  )
  .post(
    "/change-pin",
    async ({ body, cookie, jwt, set }) => {
      const { currentPin, newPin } = body;
      const result = await changePin(currentPin, newPin);

      if (!result.success) {
        set.status = 400;
        return { success: false, message: result.error || "Failed to update PIN" };
      }

      // Re-sign session with new PIN
      const token = await jwt.sign({ role: "admin", timestamp: Date.now() });
      cookie.session?.set({
        value: token,
        httpOnly: true,
        maxAge: 7 * 24 * 60 * 60,
        path: "/",
        sameSite: "lax",
      });

      return {
        success: true,
        message: "PIN updated successfully",
        token,
      };
    },
    {
      body: t.Object({
        currentPin: t.String(),
        newPin: t.String({ minLength: 6 }),
      }),
    }
  )
  .post("/logout", ({ cookie }) => {
    cookie.session?.remove();
    return { success: true };
  });
