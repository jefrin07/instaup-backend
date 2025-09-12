import { Inngest } from "inngest";

// Create a client to send and receive events
export const inngest = new Inngest({
  id: "InstaUp",
  signingKey: process.env.INNGEST_SIGNING_KEY,  // <- add this
});

// Create an empty array where we'll export future Inngest functions
export const functions = [];