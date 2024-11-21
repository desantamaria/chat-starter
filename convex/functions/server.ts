import { v } from "convex/values";
import {
  assertServerMember,
  assertServerOwner,
  authenticatedMutation,
  authenticatedQuery,
} from "./helpers";

export const list = authenticatedQuery({
  handler: async (ctx) => {
    const serverMembers = await ctx.db
      .query("serverMembers")
      .withIndex("by_userId", (q) => q.eq("userId", ctx.user._id))
      .collect();
    const servers = await Promise.all(
      serverMembers.map(async ({ serverId }) => {
        const server = await ctx.db.get(serverId);
        if (!server) {
          return null;
        }
        return {
          ...server,
          iconUrl: server.iconId
            ? await ctx.storage.getUrl(server.iconId)
            : null,
        };
      })
    );
    return servers.filter((server) => server !== null);
  },
});

export const get = authenticatedQuery({
  args: {
    id: v.id("servers"),
  },
  handler: async (ctx, { id }) => {
    await assertServerMember(ctx, id);
    const server = await ctx.db.get(id);
    if (!server) {
      return null;
    }
    return {
      ...server,
      iconUrl: server.iconId ? await ctx.storage.getUrl(server.iconId) : null,
    };
  },
});

export const members = authenticatedQuery({
  args: {
    id: v.id("servers"),
  },
  handler: async (ctx, { id }) => {
    await assertServerMember(ctx, id);
    const serverMembers = await ctx.db
      .query("serverMembers")
      .withIndex("by_serverId", (q) => q.eq("serverId", id))
      .collect();
    const users = await Promise.all(
      serverMembers.map(async ({ userId }) => {
        return await ctx.db.get(userId);
      })
    );
    return users.filter((user) => user !== null);
  },
});

export const create = authenticatedMutation({
  args: {
    name: v.string(),
    iconId: v.optional(v.id("_storage")),
  },
  handler: async (ctx, { name, iconId }) => {
    const serverId = await ctx.db.insert("servers", {
      name,
      iconId,
      ownerId: ctx.user._id,
    });
    const defaultChannelId = await ctx.db.insert("channels", {
      name: "general",
      serverId,
    });
    await ctx.db.patch(serverId, {
      defaultChannelId,
    });
    await ctx.db.insert("serverMembers", {
      serverId,
      userId: ctx.user._id,
    });
    return { serverId, defaultChannelId };
  },
});

export const edit = authenticatedMutation({
  args: {
    id: v.id("servers"),
    name: v.optional(v.string()),
    ownerId: v.optional(v.id("users")),
    iconId: v.optional(v.id("_storage")),
    defaultChannelId: v.optional(v.id("channels")),
  },
  handler: async (ctx, { id, name, ownerId, iconId, defaultChannelId }) => {
    await assertServerOwner(ctx, id);
    await ctx.db.patch(id, { name, ownerId, iconId, defaultChannelId });
  },
});

export const remove = authenticatedMutation({
  args: {
    id: v.id("servers"),
  },
  handler: async (ctx, { id }) => {
    await assertServerOwner(ctx, id);

    // Remove related channels
    const channels = await ctx.db
      .query("channels")
      .withIndex("by_serverId", (q) => q.eq("serverId", id))
      .collect();
    await Promise.all(
      channels.map(async (channel) => {
        await ctx.db.delete(channel._id);
      })
    );

    // Remove related invites
    const invites = await ctx.db
      .query("invites")
      .withIndex("by_serverId", (q) => q.eq("serverId", id))
      .collect();
    await Promise.all(
      invites.map(async (invite) => {
        await ctx.db.delete(invite._id);
      })
    );

    // Remove relationship between members and server
    const serverMembers = await ctx.db
      .query("serverMembers")
      .withIndex("by_serverId", (q) => q.eq("serverId", id))
      .collect();
    await Promise.all(
      serverMembers.map(async (serverMember) => {
        await ctx.db.delete(serverMember._id);
      })
    );

    // Remove server
    const server = await ctx.db.get(id);
    if (server) {
      if (server.iconId) {
        await ctx.storage.delete(server.iconId);
      }
      await ctx.db.delete(server._id);
    }
  },
});
