export const courtKeys = {
  all: ["courts"] as const,
  list: () => [...courtKeys.all, "list"] as const,
  public: () => [...courtKeys.all, "public"] as const,
  byType: (type?: string) =>
    [...courtKeys.all, "by-type", type ?? "all"] as const,
};
