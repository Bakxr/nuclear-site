export function mergeTerminalSnapshots(localStocks, remoteSnapshot) {
  if (!remoteSnapshot?.entities) return null;

  const localMarketIndex = new Map((localStocks || []).map((item) => [item.ticker, item]));
  const mergedMarketInstruments = remoteSnapshot.entities.marketInstruments.map((item) => {
    const localItem = localMarketIndex.get(item.ticker);
    if (!localItem) return item;

    return {
      ...item,
      sector: item.sector || localItem.sector,
      desc: item.desc || localItem.desc,
      pe: item.pe || localItem.pe,
      mktCap: item.mktCap || localItem.mktCap,
      // Server history is real daily closes; local history is only a fallback.
      history: Array.isArray(item.history) && item.history.length ? item.history : localItem.history || [],
    };
  });

  return {
    ...remoteSnapshot,
    entities: {
      ...remoteSnapshot.entities,
      marketInstruments: mergedMarketInstruments,
    },
  };
}
