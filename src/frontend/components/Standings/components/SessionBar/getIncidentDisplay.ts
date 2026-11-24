export const getIncidentDisplay = (
  incidents: number,
  initial: number | string | undefined | null,
  subsequent: number | string | undefined | null,
  limit: number | string | undefined | null
): string => {
  const initialNum = initial as number;
  const subsequentNum = subsequent as number;

  const roundsCompleted = Math.floor((incidents - initialNum) / subsequentNum);
  const nextPenalty = initialNum + (roundsCompleted + 1) * subsequentNum;

  if (limit === 'unlimited' || !limit) {
    if (!initial || initial === 'unlimited') {
      return `${incidents} / ∞ x`;
    } else {
      if (incidents < initialNum) {
        return `${incidents} / ${initial} / ∞ x`;
      }
      if (!subsequent || subsequent === 'unlimited') {
        if (incidents < (initial as number)) {
          return `${incidents} / ${initial} / ∞ x`;
        }
        return `${incidents} / ∞ x`;
      }
      if (incidents >= (initial as number)) {
        return `${incidents} / ${nextPenalty} / ∞ x`;
      }
    }
    return `${incidents} / ∞ x`;
  }

  if (
    initial &&
    initial !== 'unlimited' &&
    (initial as number) >= (limit as number)
  ) {
    initial = undefined;
  }

  if (!initial || initial === 'unlimited') {
    return `${incidents} / ${limit} x`;
  }

  if (!subsequent || subsequent === 'unlimited') {
    if (incidents < (initial as number)) {
      return `${incidents} / ${initial} / ${limit} x`;
    }
    return `${incidents} / ${limit} x`;
  }

  if (incidents < (initial as number)) {
    return `${incidents} / ${initial} / ${limit} x`;
  }

  if (nextPenalty >= (limit as number)) {
    return `${incidents} / ${limit} x`;
  }

  return `${incidents} / ${nextPenalty} / ${limit} x`;
};
