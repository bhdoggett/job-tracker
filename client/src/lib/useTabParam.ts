import { useSearchParams } from "react-router-dom";

/**
 * Keep a tab selection in the URL instead of component state.
 *
 * Tabs held in `useState` are lost the moment the component unmounts, so
 * navigating away and back always lands on the default tab. Putting the
 * selection in the query string makes it survive navigation, refreshes, and
 * browser back/forward, and makes a given tab linkable.
 *
 * An unrecognised value falls back to the default rather than rendering an
 * empty tab body.
 */
export function useTabParam<T extends string>(
  validTabs: readonly T[],
  fallback: T,
  param = "tab"
): [T, (next: T) => void] {
  const [searchParams, setSearchParams] = useSearchParams();

  const raw = searchParams.get(param);
  const tab = validTabs.includes(raw as T) ? (raw as T) : fallback;

  const setTab = (next: T) => {
    const params = new URLSearchParams(searchParams);
    params.set(param, next);
    // Replace rather than push: switching tabs shouldn't fill the history
    // stack with entries the back button has to walk through.
    setSearchParams(params, { replace: true });
  };

  return [tab, setTab];
}
