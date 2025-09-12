import { Inngest } from "inngest";
import { sendEmail } from "../utils/sendEmail";

// Create a client to send and receive events
export const inngest = new Inngest({
  id: "InstaUp",
  signingKey: process.env.INNGEST_SIGNING_KEY, // <- add this
});

export const userLoggedInFn = inngest.createFunction(
  { id: "user-logged-in" },
  { event: "user/logged.in" },
  async ({ event, step }) => {
    const { email, name } = event.data;

    await step.run("send-login-email", async () => {
      await sendEmail({
        to: email,
        subject: "New login to InstaUp 🚀",
        html: `<p>Hi ${name || "there"},</p>
               <p>You just logged in to <b>InstaUp</b>.</p>
               <p>If this wasn’t you, please reset your password immediately.</p>`,
        text: `Hi ${
          name || "there"
        },\n\nYou just logged in to InstaUp.\nIf this wasn’t you, reset your password immediately.`,
      });
    });

    return { status: "ok", notified: email };
  }
);
// Create an empty array where we'll export future Inngest functions
export const functions = [userLoggedInFn];
