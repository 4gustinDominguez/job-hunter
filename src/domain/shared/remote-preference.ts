export const REMOTE_PREFERENCES = ["ANY", "ONSITE", "HYBRID", "REMOTE"] as const;

export type RemotePreference = (typeof REMOTE_PREFERENCES)[number];
