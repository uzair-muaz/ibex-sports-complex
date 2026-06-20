export const feedbackKeys = {
  all: ["feedback"] as const,
  list: () => [...feedbackKeys.all, "list"] as const,
};
