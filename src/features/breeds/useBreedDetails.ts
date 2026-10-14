import { useCallback, useEffect, useState } from "react";

import {
  BreedNotFoundError,
  fetchBreedDetails,
  type BreedDetails,
} from "../../api/breedDetails";
import {
  readCachedBreedDetails,
  upsertCachedBreedDetails,
} from "../../data/catalogueDatabase";

type BreedDetailsState =
  | { status: "loading"; breedId: string }
  | { status: "success"; breedId: string; details: BreedDetails }
  | { status: "not-found"; breedId: string }
  | { status: "error"; breedId: string };

export function useBreedDetails(breedId: string) {
  const [state, setState] = useState<BreedDetailsState>({
    status: "loading",
    breedId,
  });
  const [requestKey, setRequestKey] = useState(0);

  useEffect(() => {
    const controller = new AbortController();

    void readCachedBreedDetails(breedId)
      .then(async (cached) => {
        if (controller.signal.aborted) return;
        if (cached) {
          setState({ status: "success", breedId, details: cached });
          return;
        }
        const details = await fetchBreedDetails(breedId, controller.signal);
        await upsertCachedBreedDetails(details);
        if (!controller.signal.aborted) {
          setState({ status: "success", breedId, details });
        }
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        setState({
          status: error instanceof BreedNotFoundError ? "not-found" : "error",
          breedId,
        });
      });

    return () => controller.abort();
  }, [breedId, requestKey]);

  const retry = useCallback(() => {
    setState({ status: "loading", breedId });
    setRequestKey((key) => key + 1);
  }, [breedId]);

  const currentState: BreedDetailsState =
    state.breedId === breedId ? state : { status: "loading", breedId };

  return { state: currentState, retry };
}
