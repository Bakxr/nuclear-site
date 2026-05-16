/* eslint-disable react-refresh/only-export-components */
import { createContext, useCallback, useContext, useEffect, useMemo, useReducer, useRef, useState } from "react";
import { getBrowserSupabaseClient } from "../../lib/supabaseClient.js";
import {
  addWatchEntry,
  bulkAddWatchEntries,
  loadWatchlist,
  removeWatchEntry,
} from "./services/watchlist.js";
import {
  createAlert as createAlertRemote,
  deleteAlert as deleteAlertRemote,
  listAlerts as listAlertsRemote,
} from "./services/alerts.js";
import {
  buildEntityIndex,
  filterMapItems,
  getEntityById,
  searchTerminalSnapshot,
  selectContractRows,
  selectCountryRanking,
  selectEarningsRows,
  selectFilingRows,
  selectInsiderRows,
  selectLobbyingRows,
  selectMarketRows,
  selectMaterialEventRows,
  selectNewsRows,
  selectNrcDocketRows,
  selectOfficialWireRows,
  selectOperationsRows,
  selectPipelineRows,
  selectPredictionMarketRows,
  selectSourceRows,
} from "./selectors.js";

const WATCHLIST_KEY = "np-terminal-watchlist";
const WATCHLIST_MIGRATED_KEY = "np-terminal-watchlist-migrated";
const COMPARE_KEY = "np-terminal-compare";
const MAX_COMPARE = 4;

function describeEntityForWatch(entity) {
  if (!entity) return { entity_type: "unknown", entity_label: "" };
  const type = entity.entityType || "unknown";
  const label = entity.name || entity.title || entity.ticker || entity.country || entity.id || "";
  return { entity_type: type, entity_label: String(label).slice(0, 200) };
}

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
    selectedMarketId: null,
    compareIds: readStoredArray(COMPARE_KEY),
    watchedIds: readStoredArray(WATCHLIST_KEY),
    mapCollapsed: Boolean(isMobileViewport),
    paletteOpen: false,
    helpOpen: false,
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
    case "setPaletteOpen":
      return { ...state, paletteOpen: action.value };
    case "setHelpOpen":
      return { ...state, helpOpen: action.value };
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
  const insiderRows = useMemo(() => selectInsiderRows(snapshot, { selectedEntity }), [snapshot, selectedEntity]);
  const contractRows = useMemo(() => selectContractRows(snapshot), [snapshot]);
  const lobbyingRows = useMemo(() => selectLobbyingRows(snapshot), [snapshot]);
  const earningsRows = useMemo(() => selectEarningsRows(snapshot, { selectedEntity }), [snapshot, selectedEntity]);
  const materialEventRows = useMemo(() => selectMaterialEventRows(snapshot, { selectedEntity }), [snapshot, selectedEntity]);
  const nrcDocketRows = useMemo(() => selectNrcDocketRows(snapshot, { selectedEntity }), [snapshot, selectedEntity]);
  const predictionMarketRows = useMemo(() => selectPredictionMarketRows(snapshot), [snapshot]);
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

  // Supabase-backed cross-device watchlist. We keep `state.watchedIds` as the
  // source of truth and mirror it to the `terminal_watchlist` table whenever
  // the user is authenticated. For unauthenticated users the localStorage
  // cache above is the only persistence layer — everything below is additive.
  const supabase = useMemo(() => {
    try {
      return getBrowserSupabaseClient() || null;
    } catch {
      return null;
    }
  }, []);
  const [watchlistEntries, setWatchlistEntries] = useState([]);
  const watchlistEntriesRef = useRef([]);
  const watchedIdsRef = useRef(state.watchedIds);
  useEffect(() => {
    watchlistEntriesRef.current = watchlistEntries;
  }, [watchlistEntries]);
  useEffect(() => {
    watchedIdsRef.current = state.watchedIds;
  }, [state.watchedIds]);

  useEffect(() => {
    if (!supabase) return undefined;

    let cancelled = false;

    async function hydrate() {
      const cloud = await loadWatchlist(supabase);
      if (cancelled) return;

      const cloudIds = cloud.map((row) => row.entity_id);
      const localIds = watchedIdsRef.current || [];

      // One-time migration: push any localStorage-only IDs to the cloud.
      const migratedFlag = typeof window !== "undefined"
        ? window.localStorage.getItem(WATCHLIST_MIGRATED_KEY)
        : "1";
      const missingFromCloud = localIds.filter((id) => !cloudIds.includes(id));
      if (!migratedFlag && missingFromCloud.length > 0) {
        const entries = missingFromCloud.map((id) => {
          const entity = entityIndex.get(id);
          const { entity_type, entity_label } = describeEntityForWatch(entity);
          return { entity_id: id, entity_type, entity_label };
        });
        await bulkAddWatchEntries(supabase, entries);
      }
      if (typeof window !== "undefined") {
        window.localStorage.setItem(WATCHLIST_MIGRATED_KEY, "1");
      }

      // Refresh after any migration writes so created_at ordering is right.
      const finalRows = missingFromCloud.length > 0 ? await loadWatchlist(supabase) : cloud;
      if (cancelled) return;

      setWatchlistEntries(finalRows);

      const finalIds = finalRows.map((row) => row.entity_id);
      const mergedIds = Array.from(new Set([...finalIds, ...localIds]));
      const sameLength = mergedIds.length === localIds.length;
      const sameSet = sameLength && mergedIds.every((id) => localIds.includes(id));
      if (!sameSet) {
        dispatch({ type: "setWatchedIds", value: mergedIds });
      }
    }

    hydrate().catch((err) => console.warn("[terminal-watchlist] hydrate failed", err));

    // Re-hydrate on auth state changes (sign-in/out).
    const { data: authSub } = supabase.auth.onAuthStateChange((event) => {
      if (cancelled) return;
      if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED") {
        hydrate().catch(() => {});
      } else if (event === "SIGNED_OUT") {
        setWatchlistEntries([]);
      }
    });

    return () => {
      cancelled = true;
      authSub?.subscription?.unsubscribe?.();
    };
  }, [entityIndex, supabase]);

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
  const setPaletteOpen = useCallback((value) => dispatch({ type: "setPaletteOpen", value }), []);
  const setHelpOpen = useCallback((value) => dispatch({ type: "setHelpOpen", value }), []);
  const openPalette = useCallback(() => dispatch({ type: "setPaletteOpen", value: true }), []);
  const closePalette = useCallback(() => dispatch({ type: "setPaletteOpen", value: false }), []);
  const openHelp = useCallback(() => dispatch({ type: "setHelpOpen", value: true }), []);
  const closeHelp = useCallback(() => dispatch({ type: "setHelpOpen", value: false }), []);
  const openMarket = useCallback((market) => {
    if (!market) return;
    const id = typeof market === "string" ? market : market.id;
    if (!id) return;
    dispatch({ type: "patch", value: { selectedMarketId: id } });
  }, []);
  const closeMarket = useCallback(() => dispatch({ type: "patch", value: { selectedMarketId: null } }), []);
  const selectedMarket = useMemo(() => {
    if (!state.selectedMarketId) return null;
    const rows = snapshot?.entities?.predictionMarkets || [];
    return rows.find((row) => row.id === state.selectedMarketId) || null;
  }, [snapshot, state.selectedMarketId]);
  const toggleHelp = useCallback(() => dispatch({ type: "patch", value: { helpOpen: !state.helpOpen } }), [state.helpOpen]);

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
    if (!entityId) return;
    const isWatched = state.watchedIds.includes(entityId);
    const prevIds = state.watchedIds;
    const prevEntries = watchlistEntriesRef.current;
    const nextIds = isWatched
      ? state.watchedIds.filter((id) => id !== entityId)
      : [...state.watchedIds, entityId];
    dispatch({ type: "setWatchedIds", value: nextIds });

    const entity = entityIndex.get(entityId);
    const { entity_type, entity_label } = describeEntityForWatch(entity);

    if (isWatched) {
      setWatchlistEntries((rows) => rows.filter((row) => row.entity_id !== entityId));
    } else {
      const exists = prevEntries.some((row) => row.entity_id === entityId);
      if (!exists) {
        setWatchlistEntries((rows) => [
          { entity_id: entityId, entity_type, entity_label, created_at: new Date().toISOString() },
          ...rows,
        ]);
      }
    }

    if (!supabase) return;

    const op = isWatched
      ? removeWatchEntry(supabase, entityId)
      : addWatchEntry(supabase, { entity_id: entityId, entity_type, entity_label });

    op.catch((err) => {
      console.warn("[terminal-watchlist] toggleWatch failed, rolling back", err);
      dispatch({ type: "setWatchedIds", value: prevIds });
      setWatchlistEntries(prevEntries);
    });
  }, [state.watchedIds, entityIndex, supabase]);

  // Alerts: additive layer over the watchlist. We hydrate from /api/alerts
  // when the user is authenticated; unauth users see an empty list.
  const [alerts, setAlerts] = useState([]);
  const [alertsLoading, setAlertsLoading] = useState(false);
  const [alertsError, setAlertsError] = useState(null);

  const refreshAlerts = useCallback(async () => {
    if (!supabase) return;
    setAlertsLoading(true);
    setAlertsError(null);
    try {
      const rows = await listAlertsRemote(supabase);
      setAlerts(Array.isArray(rows) ? rows : []);
    } catch (err) {
      setAlertsError(err?.message || "Failed to load alerts.");
    } finally {
      setAlertsLoading(false);
    }
  }, [supabase]);

  const createAlert = useCallback(async (payload) => {
    if (!supabase) throw new Error("Sign in to create alerts.");
    const created = await createAlertRemote(supabase, payload);
    if (created) setAlerts((rows) => [created, ...rows]);
    return created;
  }, [supabase]);

  const deleteAlert = useCallback(async (id) => {
    if (!supabase) return;
    const prev = alerts;
    setAlerts((rows) => rows.filter((row) => row.id !== id));
    try {
      await deleteAlertRemote(supabase, id);
    } catch (err) {
      console.warn("[terminal-alerts] delete failed", err);
      setAlerts(prev);
    }
  }, [supabase, alerts]);

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
    insiderRows,
    contractRows,
    lobbyingRows,
    earningsRows,
    materialEventRows,
    nrcDocketRows,
    predictionMarketRows,
    searchResults,
    compareEntities,
    availableCountries,
    availableReactorTypes,
    availableStatuses,
    watchedSet,
    watchlistEntries,
    alerts,
    alertsLoading,
    alertsError,
    refreshAlerts,
    createAlert,
    deleteAlert,
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
    setPaletteOpen,
    setHelpOpen,
    openPalette,
    closePalette,
    openHelp,
    closeHelp,
    toggleHelp,
    selectedMarket,
    openMarket,
    closeMarket,
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
    insiderRows,
    contractRows,
    lobbyingRows,
    earningsRows,
    materialEventRows,
    nrcDocketRows,
    predictionMarketRows,
    searchResults,
    compareEntities,
    availableCountries,
    availableReactorTypes,
    availableStatuses,
    watchedSet,
    watchlistEntries,
    alerts,
    alertsLoading,
    alertsError,
    refreshAlerts,
    createAlert,
    deleteAlert,
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
    setPaletteOpen,
    setHelpOpen,
    openPalette,
    closePalette,
    openHelp,
    closeHelp,
    toggleHelp,
    selectedMarket,
    openMarket,
    closeMarket,
  ]);

  return <TerminalContext.Provider value={value}>{children}</TerminalContext.Provider>;
}

export function useTerminal() {
  const context = useContext(TerminalContext);
  if (!context) throw new Error("useTerminal must be used within a TerminalProvider.");
  return context;
}
