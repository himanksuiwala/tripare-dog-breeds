import { useCallback, useEffect, useState } from 'react';

import {
  BreedNotFoundError,
  fetchBreedDetails,
  type BreedDetails,
} from '../../api/breedDetails';

type BreedDetailsState =
  | { status: 'loading'; breedId: string }
  | { status: 'success'; breedId: string; details: BreedDetails }
  | { status: 'not-found'; breedId: string }
  | { status: 'error'; breedId: string };

export function useBreedDetails(breedId: string) {
  const [state, setState] = useState<BreedDetailsState>({ status: 'loading', breedId });
  const [requestKey, setRequestKey] = useState(0);

  useEffect(() => {
    const controller = new AbortController();

    void fetchBreedDetails(breedId, controller.signal)
      .then((details) => setState({ status: 'success', breedId, details }))
      .catch((error: unknown) => {
        if (controller.signal.aborted) {
          return;
        }
        setState({
          status: error instanceof BreedNotFoundError ? 'not-found' : 'error',
          breedId,
        });
      });

    return () => controller.abort();
  }, [breedId, requestKey]);

  const retry = useCallback(() => {
    setState({ status: 'loading', breedId });
    setRequestKey((key) => key + 1);
  }, [breedId]);

  const currentState: BreedDetailsState =
    state.breedId === breedId ? state : { status: 'loading', breedId };

  return { state: currentState, retry };
}
