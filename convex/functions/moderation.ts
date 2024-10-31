import Groq from "groq-sdk";
import { action, mutation, query } from "../_generated/server";
import { v } from "convex/values";
import { api } from "../_generated/api";

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

export const run = action({
  args: {
    id: v.id("messages"),
  },
  handler: async (ctx, { id }) => {
    // 1. Get Message
    const message = await ctx.runQuery(api.functions.moderation.getMessage, {
      id,
    });
    // 2. Use Groq SDK to send message to moderation endpoint
    if (!message) {
      return;
    }
    const result = await groq.chat.completions.create({
      model: "llama-guard-3-8b",
      messages: [
        {
          role: "user",
          content: message.content,
        },
      ],
    });
    // 3. If message is flagged, we'll delete the message
    await ctx.runMutation(api.functions.moderation.deleteMessage, {
      id,
    });
    const value = result.choices[0].message.content;
    console.log(value);
  },
});

export const getMessage = query({
  args: {
    id: v.id("messages"),
  },
  handler: async (ctx, { id }) => {
    return await ctx.db.get(id);
  },
});

export const deleteMessage = mutation({
  args: {
    id: v.id("messages"),
  },
  handler: (ctx, { id }) => {},
});
