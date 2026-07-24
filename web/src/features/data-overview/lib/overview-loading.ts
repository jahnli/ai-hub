interface OverviewLoadingInput {
  statsFetching: boolean
  hasStatsData: boolean
  subStatsFetching: boolean
  hasSubStatsData: boolean
  usageFetching: boolean
  hasUsageData: boolean
  usersFetching: boolean
  hasUsersData: boolean
  rankingsFetching: boolean
  hasRankingsData: boolean
}

interface OverviewLoadingState {
  isSearching: boolean
  showStatsSkeleton: boolean
  showSubStatsSkeleton: boolean
  showUsageSkeleton: boolean
  showUsersSkeleton: boolean
  showRankingsSkeleton: boolean
}

export function getOverviewLoadingState(
  input: OverviewLoadingInput
): OverviewLoadingState {
  return {
    isSearching:
      input.statsFetching ||
      input.subStatsFetching ||
      input.usageFetching ||
      input.usersFetching ||
      input.rankingsFetching,
    showStatsSkeleton: input.statsFetching && !input.hasStatsData,
    showSubStatsSkeleton: input.subStatsFetching && !input.hasSubStatsData,
    showUsageSkeleton: input.usageFetching && !input.hasUsageData,
    showUsersSkeleton: input.usersFetching && !input.hasUsersData,
    showRankingsSkeleton: input.rankingsFetching && !input.hasRankingsData,
  }
}
