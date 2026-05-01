import type { Profile } from "@job-tracker/shared";
import { api } from "./client.ts";

export const profileApi = {
  get: () => api.get<Profile | null>("/api/profile"),
  update: (data: Partial<Profile> & { ein?: string }) =>
    api.put<Profile>("/api/profile", data),
};
