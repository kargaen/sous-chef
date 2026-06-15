export const SeasonalService = {
  getCurrentMonth: (): number => {
    return new Date().getMonth() + 1;
  },
};
