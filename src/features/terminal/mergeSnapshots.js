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
      history: Array.isArray(localItem.history) && localItem.history.length ? localItem.history : item.history || [],
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
