import { useReducer, useCallback } from "react";

export interface FilterState {
  keyword: string;
  condition: string | undefined;
  issueNumber: string;
  manufacturer: string;
  year: string;
  team: string;
  series: string;
  sportsCardsConditionText: string;
  sport: string | undefined;
  gradingService: string | undefined;
  grade: string | undefined;
  valueMin: number | undefined;
  valueMax: number | undefined;
  rookie: string | undefined;
  autographed: string | undefined;
  signed: string | undefined;
  facsimile: string | undefined;
  rarity: string | undefined;
}

export type FilterAction =
  | { type: "SET_KEYWORD"; payload: string }
  | { type: "SET_CONDITION"; payload: string | undefined }
  | { type: "SET_ISSUE_NUMBER"; payload: string }
  | { type: "SET_MANUFACTURER"; payload: string }
  | { type: "SET_YEAR"; payload: string }
  | { type: "SET_TEAM"; payload: string }
  | { type: "SET_SERIES"; payload: string }
  | { type: "SET_SPORTS_CARDS_CONDITION"; payload: string }
  | { type: "SET_SPORT"; payload: string | undefined }
  | { type: "SET_GRADING_SERVICE"; payload: string | undefined }
  | { type: "SET_GRADE"; payload: string | undefined }
  | { type: "SET_VALUE_MIN"; payload: number | undefined }
  | { type: "SET_VALUE_MAX"; payload: number | undefined }
  | { type: "SET_ROOKIE"; payload: string | undefined }
  | { type: "SET_AUTOGRAPHED"; payload: string | undefined }
  | { type: "SET_SIGNED"; payload: string | undefined }
  | { type: "SET_FACSIMILE"; payload: string | undefined }
  | { type: "SET_RARITY"; payload: string | undefined }
  | { type: "RESET_ALL" }
  | { type: "RESET_CATEGORY" };

const initialState: FilterState = {
  keyword: "",
  condition: undefined,
  issueNumber: "",
  manufacturer: "",
  year: "",
  team: "",
  series: "",
  sportsCardsConditionText: "",
  sport: undefined,
  gradingService: undefined,
  grade: undefined,
  valueMin: undefined,
  valueMax: undefined,
  rookie: undefined,
  autographed: undefined,
  signed: undefined,
  facsimile: undefined,
  rarity: undefined,
};

function filterReducer(state: FilterState, action: FilterAction): FilterState {
  switch (action.type) {
    case "SET_KEYWORD":
      return { ...state, keyword: action.payload };
    case "SET_CONDITION":
      return { ...state, condition: action.payload };
    case "SET_ISSUE_NUMBER":
      return { ...state, issueNumber: action.payload };
    case "SET_MANUFACTURER":
      return { ...state, manufacturer: action.payload };
    case "SET_YEAR":
      return { ...state, year: action.payload };
    case "SET_TEAM":
      return { ...state, team: action.payload };
    case "SET_SERIES":
      return { ...state, series: action.payload };
    case "SET_SPORTS_CARDS_CONDITION":
      return { ...state, sportsCardsConditionText: action.payload };
    case "SET_SPORT":
      return { ...state, sport: action.payload };
    case "SET_GRADING_SERVICE":
      return { ...state, gradingService: action.payload };
    case "SET_GRADE":
      return { ...state, grade: action.payload };
    case "SET_VALUE_MIN":
      return { ...state, valueMin: action.payload };
    case "SET_VALUE_MAX":
      return { ...state, valueMax: action.payload };
    case "SET_ROOKIE":
      return { ...state, rookie: action.payload };
    case "SET_AUTOGRAPHED":
      return { ...state, autographed: action.payload };
    case "SET_SIGNED":
      return { ...state, signed: action.payload };
    case "SET_FACSIMILE":
      return { ...state, facsimile: action.payload };
    case "SET_RARITY":
      return { ...state, rarity: action.payload };
    case "RESET_ALL":
      return initialState;
    case "RESET_CATEGORY":
      return {
        ...initialState,
        // Keep sort/view settings when changing categories
      };
    default:
      return state;
  }
}

/**
 * Hook for managing filter state with useReducer
 * Provides a cleaner, more maintainable way to handle multiple filter state updates
 * compared to using individual useState calls
 */
export function useFilterReducer() {
  const [state, dispatch] = useReducer(filterReducer, initialState);

  // Memoized action creators for better performance
  const setKeyword = useCallback((value: string) => {
    dispatch({ type: "SET_KEYWORD", payload: value });
  }, []);

  const setCondition = useCallback((value: string | undefined) => {
    dispatch({ type: "SET_CONDITION", payload: value });
  }, []);

  const setIssueNumber = useCallback((value: string) => {
    dispatch({ type: "SET_ISSUE_NUMBER", payload: value });
  }, []);

  const setManufacturer = useCallback((value: string) => {
    dispatch({ type: "SET_MANUFACTURER", payload: value });
  }, []);

  const setYear = useCallback((value: string) => {
    dispatch({ type: "SET_YEAR", payload: value });
  }, []);

  const setTeam = useCallback((value: string) => {
    dispatch({ type: "SET_TEAM", payload: value });
  }, []);

  const setSeries = useCallback((value: string) => {
    dispatch({ type: "SET_SERIES", payload: value });
  }, []);

  const setSportsCardsCondition = useCallback((value: string) => {
    dispatch({ type: "SET_SPORTS_CARDS_CONDITION", payload: value });
  }, []);

  const setSport = useCallback((value: string | undefined) => {
    dispatch({ type: "SET_SPORT", payload: value });
  }, []);

  const setGradingService = useCallback((value: string | undefined) => {
    dispatch({ type: "SET_GRADING_SERVICE", payload: value });
  }, []);

  const setGrade = useCallback((value: string | undefined) => {
    dispatch({ type: "SET_GRADE", payload: value });
  }, []);

  const setValueMin = useCallback((value: number | undefined) => {
    dispatch({ type: "SET_VALUE_MIN", payload: value });
  }, []);

  const setValueMax = useCallback((value: number | undefined) => {
    dispatch({ type: "SET_VALUE_MAX", payload: value });
  }, []);

  const setRookie = useCallback((value: string | undefined) => {
    dispatch({ type: "SET_ROOKIE", payload: value });
  }, []);

  const setAutographed = useCallback((value: string | undefined) => {
    dispatch({ type: "SET_AUTOGRAPHED", payload: value });
  }, []);

  const setSigned = useCallback((value: string | undefined) => {
    dispatch({ type: "SET_SIGNED", payload: value });
  }, []);

  const setFacsimile = useCallback((value: string | undefined) => {
    dispatch({ type: "SET_FACSIMILE", payload: value });
  }, []);

  const setRarity = useCallback((value: string | undefined) => {
    dispatch({ type: "SET_RARITY", payload: value });
  }, []);

  const resetAll = useCallback(() => {
    dispatch({ type: "RESET_ALL" });
  }, []);

  const resetCategory = useCallback(() => {
    dispatch({ type: "RESET_CATEGORY" });
  }, []);

  return {
    state,
    setKeyword,
    setCondition,
    setIssueNumber,
    setManufacturer,
    setYear,
    setTeam,
    setSeries,
    setSportsCardsCondition,
    setSport,
    setGradingService,
    setGrade,
    setValueMin,
    setValueMax,
    setRookie,
    setAutographed,
    setSigned,
    setFacsimile,
    setRarity,
    resetAll,
    resetCategory,
  };
}
