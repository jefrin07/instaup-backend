import { Inngest } from "inngest";
import { sendEmail } from "../utils/sendEmail.js";
import Story from "../models/Story.js";
import cloudinary from "../utils/cloudinary.js";

// Create a client to send and receive events
export const inngest = new Inngest({
  id: "InstaUp",
  signingKey: process.env.INNGEST_SIGNING_KEY, // <- add this
  eventKey: process.env.INNGEST_EVENT_KEY, // needed to send events
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

export const deleteStoryFn = inngest.createFunction(
  { id: "delete-story-after-24h" },
  { event: "app/story.delete" },
  async ({ event, step }) => {
    const { storyId } = event.data;
    if (!storyId) {
      return { status: "error", reason: "No storyId provided" };
    }

    // Schedule deletion 24h from now
    const in24Hrs = new Date(Date.now() + 24 * 60 * 60 * 1000);
    await step.sleepUntil("wait-24h", in24Hrs);

    const result = await step.run("delete-story", async () => {
      const story = await Story.findById(storyId);
      if (!story) {
        return { deleted: false, reason: "Story not found" };
      }

      // Delete associated images from Cloudinary
      if (story.image_urls && story.image_urls.length > 0) {
        await Promise.all(
          story.image_urls.map((img) =>
            cloudinary.uploader.destroy(img.public_id)
          )
        );
      }

      // Delete story from DB
      await story.deleteOne();

      return { deleted: true, storyId };
    });

    return { status: "ok", ...result };
  }
);

// Create an empty array where we'll export future Inngest functions
export const functions = [userLoggedInFn, deleteStoryFn];
