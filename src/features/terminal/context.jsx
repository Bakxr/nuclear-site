/* eslint-disable react-refresh/only-export-components */
import { createContext, useCallback, useContext, useEffect, useMemo, useReducer } from "react";
import {
  buildEntityIndex,
  filterMapItems,
  getEntityById,
  searchTerminalSnapshot,
  selectCountryRanking,
  selectFilingRows,
  selectMarketRows,
  selectNewsRows,
  selectOfficialWireRows,
  selectOperationsRows,
  selectPipelineRows,
  selectSourceRows,
} from "./selectors.js";

const WATCHLIST_KEY = "np-terminal-watchlist";
const COMPARE_KEY = "np-terminal-compare";
const MAX_COMPARE = 4;

const TerminalContext = createContext(null);

function readStoredArray(key) {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(key);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function createInitialState(isMobileViewport) {
  return {
    query: "",
    layer: "reactors",
    countryFilter: "",
    reactorTypeFilter: "",
    statusFilter: "",
    rankingMetric: "capacity",
    marketSort: "pct",
    newsTag: "All",
    selectedEntityId: null,
    compareIds: readStoredArray(COMPARE_KEY),
    watchedIds: readStoredArray(WATCHLIST_KEY),
    mapCollapsed: Boolean(isMobileViewport),
  };
}

function reducer(state, action) {
  switch (action.type) {
    case "setQuery":
      return { ...state, query: action.value };
    case "setLayer":
      return {
        ...state,
        layer: action.value,
        reactorTypeFilter: action.value === "reactors" ? state.reactorTypeFilter : "",
      };
    case "setCountryFilter":
      return { ...state, countryFilter: action.value };
    case "setReactorTypeFilter":
      return { ...state, reactorTypeFilter: action.value };
    case "setStatusFilter":
      return { ...state, statusFilter: action.value };
    case "setRankingMetric":
      return { ...state, rankingMetric: action.value };
    case "setMarketSort":
      return { ...state, marketSort: action.value };
    case "setNewsTag":
      return { ...state, newsTag: action.value };
    case "setCompareIds":
      return { ...state, compareIds: action.value };
    case "setWatchedIds":
      return { ...state, watchedIds: action.value };
    case "setMapCollapsed":
      return { ...state, mapCollapsed: action.value };
    case "patch":
      return { ...state, ...action.value };
    case "reset":
      return {
        ...state,
        query: "",
        layer: "reactors",
        countryFilter: "",
        reactorTypeFilter: "",
        statusFilter: "",
        rankingMetric: "capacity",
        marketSort: "pct",
        newsTag: "All",
        selectedEntityId: null,
      };
    default:
      return state;
  }
}

function inferLayerFromEntity(entity) {
  if (!entity) return "reactors";
  if (entity.entityType === "supplySite") return "uranium";
  if (entity.entityType === "company" && /uranium|fuel/i.test(entity.theme || "")) return "uranium";
  if (entity.entityType === "story" && /uranium|mine|mining|fuel|enrichment|haleu/i.test(`${entity.title} ${entity.curiosityHook}`)) return "uranium";
  return "reactors";
}

function inferPatchFromEntity(entity) {
  if (!entity) return {};
  if (entity.entityType === "country") return { countryFilter: entity.country, layer: "reactors", query: entity.country };
  if (entity.entityType === "plant") return { countryFilter: entity.country, layer: "reactors", reactorTypeFilter: entity.normalizedType, query: entity.name };
  if (entity.entityType === "supplySite") return { countryFilter: entity.country, layer: "uranium", query: entity.name };
  if (entity.entityType === "company") return { countryFilter: entity.countries?.[0] || "", layer: inferLayerFromEntity(entity), query: "" };
  if (entity.entityType === "story") return { countryFilter: entity.country || "", layer: inferLayerFromEntity(entity), query: "" };
  if (entity.entityType === "project") return { countryFilter: entity.country, layer: "reactors", query: entity.name };
  if (entity.entityType === "filing") return { countryFilter: entity.country || "", layer: inferLayerFromEntity(entity), query: "" };
  if (entity.entityType === "operationsSignal") return { countryFilter: entity.country || "USA", layer: "reactors", query: entity.plantName || entity.name };
  if (entity.entityType === "sourceBrief") return { query: "" };
  return {};
}

export function TerminalProvider({ snapshot, isMobileViewport, children }) {
  const [state, dispatch] = useReducer(reducer, isMobileViewport, createInitialState);
  const entityIndex = useMemo(() => buildEntityIndex(snapshot), [snapshot]);
  const selectedEntity = useMemo(() => (state.selectedEntityId ? entityIndex.get(state.selectedEntityId) || null : null), [entityIndex, state.selectedEntityId]);
  const mapItems = useMemo(() => filterMapItems(snapshot, state), [snapshot, state]);
  const rankingRows = useMemo(() => selectCountryRanking(snapshot, state.rankingMetric), [snapshot, state.rankingMetric]);
  const marketRows = useMemo(() => selectMarketRows(snapshot, { selectedEntity, marketSort: state.marketSort }), [snapshot, selectedEntity, state.marketSort]);
  const newsRows = useMemo(() => selectNewsRows(snapshot, { selectedEntity, newsTag: state.newsTag }), [snapshot, selectedEntity, state.newsTag]);
  const officialRows = useMemo(() => selectOfficialWireRows(snapshot, { selectedEntity }), [snapshot, selectedEntity]);
  const pipelineRows = useMemo(() => selectPipelineRows(snapshot, { selectedEntity }), [snapshot, selectedEntity]);
  const filingRows = useMemo(() => selectFilingRows(snapshot, { selectedEntity }), [snapshot, selectedEntity]);
  const operationsRows = useMemo(() => selectOperationsRows(snapshot, { selectedEntity }), [snapshot, selectedEntity]);
  const sourceRows = useMemo(() => selectSourceRows(snapshot), [snapshot]);
  const searchResults = useMemo(() => searchTerminalSnapshot(snapshot, state.query), [snapshot, state.query]);
  const compareEntities = useMemo(() => state.compareIds.map((id) => entityIndex.get(id)).filter(Boolean), [entityIndex, state.compareIds]);
  const watchedSet = useMemo(() => new Set(state.watchedIds), [state.watchedIds]);
  const availableCountries = useMemo(() => snapshot.entities.countries.map((country) => country.country).sort((a, b) => a.localeCompare(b)), [snapshot.entities.countries]);
  const availableReactorTypes = useMemo(() => [...new Set(snapshot.entities.plants.map((plant) => plant.normalizedType))].sort((a, b) => a.localeCompare(b)), [snapshot.entities.plants]);
  const availableStatuses = useMemo(() => [...new Set(snapshot.entities.plants.map((plant) => plant.status))], [snapshot.entities.plants]);

  useEffect(() => {
    if (typeof window !== "undefined") window.localStorage.setItem(COMPARE_KEY, JSON.stringify(state.compareIds));
  }, [state.compareIds]);

  useEffect(() => {
    if (typeof window !== "undefined") window.localStorage.setItem(WATCHLIST_KEY, JSON.stringify(state.watchedIds));
  }, [state.watchedIds]);

  const setQuery = useCallback((value) => dispatch({ type: "setQuery", value }), []);
  const setLayer = useCallback((value) => dispatch({ type: "setLayer", value }), []);
  const setCountryFilter = useCallback((value) => dispatch({ type: "setCountryFilter", value }), []);
  const setReactorTypeFilter = useCallback((value) => dispatch({ type: "setReactorTypeFilter", value }), []);
  const setStatusFilter = useCallback((value) => dispatch({ type: "setStatusFilter", value }), []);
  const setRankingMetric = useCallback((value) => dispatch({ type: "setRankingMetric", value }), []);
  const setMarketSort = useCallback((value) => dispatch({ type: "setMarketSort", value }), []);
  const setNewsTag = useCallback((value) => dispatch({ type: "setNewsTag", value }), []);
  const setMapCollapsed = useCallback((value) => dispatch({ type: "setMapCollapsed", value }), []);
  const resetWorkspace = useCallback(() => dispatch({ type: "reset" }), []);

  const selectEntity = useCallback((entityOrId) => {
    const entity = typeof entityOrId === "string" ? entityIndex.get(entityOrId) : entityOrId;
    if (!entity) return;
    dispatch({ type: "patch", value: { selectedEntityId: entity.id, ...inferPatchFromEntity(entity) } });
  }, [entityIndex]);

  const toggleCompare = useCallback((entityId) => {
    const entity = entityIndex.get(entityId);
    if (!entity || !["country", "plant", "company", "project"].includes(entity.entityType)) return;
    dispatch({
      type: "setCompareIds",
      value: state.compareIds.includes(entityId)
        ? state.compareIds.filter((id) => id !== entityId)
        : [...state.compareIds, entityId].slice(0, MAX_COMPARE),
    });
  }, [entityIndex, state.compareIds]);

  const toggleWatch = useCallback((entityId) => {
    dispatch({
      type: "setWatchedIds",
      value: state.watchedIds.includes(entityId)
        ? state.watchedIds.filter((id) => id !== entityId)
        : [...state.watchedIds, entityId],
    });
  }, [state.watchedIds]);

  const value = useMemo(() => ({
    snapshot,
    state,
    selectedEntity,
    mapItems,
    rankingRows,
    marketRows,
    newsRows,
    officialRows,
    pipelineRows,
    filingRows,
    operationsRows,
    sourceRows,
    searchResults,
    compareEntities,
    availableCountries,
    availableReactorTypes,
    availableStatuses,
    watchedSet,
    setQuery,
    setLayer,
    setCountryFilter,
    setReactorTypeFilter,
    setStatusFilter,
    setRankingMetric,
    setMarketSort,
    setNewsTag,
    setMapCollapsed,
    resetWorkspace,
    selectEntity,
    toggleCompare,
    toggleWatch,
    getEntityById: (entityId) => getEntityById(snapshot, entityId),
  }), [
    snapshot,
    state,
    selectedEntity,
    mapItems,
    rankingRows,
    marketRows,
    newsRows,
    officialRows,
    pipelineRows,
    filingRows,
    operationsRows,
    sourceRows,
    searchResults,
    compareEntities,
    availableCountries,
    availableReactorTypes,
    availableStatuses,
    watchedSet,
    setQuery,
    setLayer,
    setCountryFilter,
    setReactorTypeFilter,
    setStatusFilter,
    setRankingMetric,
    setMarketSort,
    setNewsTag,
    setMapCollapsed,
    resetWorkspace,
    selectEntity,
    toggleCompare,
    toggleWatch,
  ]);

  return <TerminalContext.Provider value={value}>{children}</TerminalContext.Provider>;
}

export function useTerminal() {
  const context = useContext(TerminalContext);
  if (!context) throw new Error("useTerminal must be used within a TerminalProvider.");
  return context;
}
