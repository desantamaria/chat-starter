import { v } from "convex/values";
import { internal } from "../_generated/api";
import {
  assertChannelMember,
  authenticatedMutation,
  authenticatedQuery,
} from "./helpers";

export const list = authenticatedQuery({
  args: {
    dmOrChannelId: v.union(v.id("directMessages"), v.id("channels")),
  },
  handler: async (ctx, { dmOrChannelId }) => {
    await assertChannelMember(ctx, dmOrChannelId);
    const messages = await ctx.db
      .query("messages")
      .withIndex("by_dmOrChannelId", (q) =>
        q.eq("dmOrChannelId", dmOrChannelId)
      )
      .collect();
    return await Promise.all(
      messages.map(async (message) => {
        const sender = await ctx.db.get(message.sender);
        const attachments = message.attachments
          ? await Promise.all(
              message.attachments.map(async (attachment) => {
                return await ctx.storage.getUrl(attachment);
              })
            )
          : undefined;
        return { ...message, attachments, sender };
      })
    );
  },
});

export const create = authenticatedMutation({
  args: {
    content: v.string(),
    attachments: v.optional(v.array(v.id("_storage"))),
    dmOrChannelId: v.union(v.id("directMessages"), v.id("channels")),
  },
  handler: async (ctx, { content, attachments, dmOrChannelId }) => {
    await assertChannelMember(ctx, dmOrChannelId);
    const messageId = await ctx.db.insert("messages", {
      content,
      attachments,
      dmOrChannelId,
      sender: ctx.user._id,
    });
    await ctx.scheduler.runAfter(0, internal.functions.typing.remove, {
      dmOrChannelId,
      user: ctx.user._id,
    });
    await ctx.scheduler.runAfter(0, internal.functions.moderation.run, {
      id: messageId,
    });
  },
});

export const remove = authenticatedMutation({
  args: {
    id: v.id("messages"),
  },
  handler: async (ctx, { id }) => {
    const message = await ctx.db.get(id);
    if (!message) {
      throw new Error("Message does not exist");
    } else if (message.sender !== ctx.user._id) {
      throw new Error("You are not the sender of this message");
    }
    await ctx.runMutation(internal.functions.moderation.deleteMessage, {
      id,
      reason: "D1",
    });
    if (message.attachments) {
      await Promise.all(
        message.attachments.map(async (attachment) => {
          await ctx.storage.delete(attachment);
        })
      );
    }
  },
});

export const edit = authenticatedMutation({
  args: {
    id: v.id("messages"),
    content: v.string(),
  },
  handler: async (ctx, { id, content }) => {
    const message = await ctx.db.get(id);
    if (!message) {
      throw new Error("Message does not exist");
    } else if (message.sender !== ctx.user._id) {
      throw new Error("You are not the sender of this message");
    }
    await ctx.db.patch(id, {
      content: content,
      edited: true,
    });
  },
});
