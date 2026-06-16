import { createServerFn } from "@tanstack/react-start";
import { registerUser, authenticateUser, createSession, deleteSession, getSession, getUserById, createTeam, joinTeam, getTeamMembers } from "./db";

export const register = createServerFn({ method: "POST" })
  .validator((d: unknown) => {
    const { email, name, password } = d as { email: string; name: string; password: string };
    if (!email || !name || !password) throw new Error("email, name, and password required");
    if (password.length < 8) throw new Error("Password must be at least 8 characters");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error("Invalid email");
    return { email: email.trim().toLowerCase(), name: name.trim(), password };
  })
  .handler(async ({ data }) => {
    const userId = await registerUser(data.email, data.name, data.password);
    const token = await createSession(userId);
    const user = await getUserById(userId);
    return { user, token };
  });

export const login = createServerFn({ method: "POST" })
  .validator((d: unknown) => {
    const { email, password } = d as { email: string; password: string };
    if (!email || !password) throw new Error("email and password required");
    return { email: email.trim().toLowerCase(), password };
  })
  .handler(async ({ data }) => {
    const user = await authenticateUser(data.email, data.password);
    if (!user) throw new Error("Invalid email or password");
    const token = await createSession(user.id);
    return { user, token };
  });

export const logout = createServerFn({ method: "POST" })
  .validator((d: unknown) => {
    const { token } = d as { token?: string };
    if (!token) throw new Error("No session");
    return { token };
  })
  .handler(async ({ data }) => {
    await deleteSession(data.token);
    return { success: true };
  });

export const getCurrentUser = createServerFn({ method: "GET" })
  .validator((d: unknown) => {
    const { token } = d as { token?: string };
    if (!token) return { token: "" };
    return { token };
  })
  .handler(async ({ data }) => {
    if (!data.token) return { user: null };
    const user = await getSession(data.token);
    return { user };
  });

export const createTeamFn = createServerFn({ method: "POST" })
  .validator((d: unknown) => {
    const { token, name } = d as { token: string; name: string };
    if (!token || !name) throw new Error("token and name required");
    return { token, name: name.trim() };
  })
  .handler(async ({ data }) => {
    const user = await getSession(data.token);
    if (!user) throw new Error("Not authenticated");
    const teamId = await createTeam(data.name, user.id);
    return { teamId, name: data.name };
  });

export const joinTeamFn = createServerFn({ method: "POST" })
  .validator((d: unknown) => {
    const { token, teamId } = d as { token: string; teamId: string };
    if (!token || !teamId) throw new Error("token and teamId required");
    return { token, teamId };
  })
  .handler(async ({ data }) => {
    const user = await getSession(data.token);
    if (!user) throw new Error("Not authenticated");
    await joinTeam(user.id, data.teamId);
    return { success: true };
  });

export const getTeamMembersFn = createServerFn({ method: "GET" })
  .validator((d: unknown) => {
    const { token } = d as { token?: string };
    if (!token) throw new Error("Not authenticated");
    return { token };
  })
  .handler(async ({ data }) => {
    const user = await getSession(data.token);
    if (!user || !user.team_id) throw new Error("No team");
    const members = await getTeamMembers(user.team_id);
    return { members, teamId: user.team_id };
  });
