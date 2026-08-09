export function getQueryLoadingState(query: {
  isLoading: boolean;
  isFetching: boolean;
  isPending?: boolean;
}) {
  const isInitialLoading = query.isLoading || query.isPending === true;
  const isRefreshing = query.isFetching && !isInitialLoading;

  return {
    isInitialLoading,
    isRefreshing,
    isLoading: isInitialLoading || query.isFetching,
  };
}
