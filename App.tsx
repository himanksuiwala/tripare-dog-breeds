import "./global.css";

import { StatusBar } from "expo-status-bar";

import { ErrorBoundary } from "./src/components/ErrorBoundary";
import { AppErrorFallback } from "./src/components/ErrorFallbacks";
import { CatalogueSyncProvider } from "./src/features/breeds/CatalogueSyncContext";
import { RootNavigation } from "./src/navigation/RootNavigation";

export default function App() {
  return (
    <ErrorBoundary FallbackComponent={AppErrorFallback}>
      <CatalogueSyncProvider>
        <StatusBar style="auto" />
        <RootNavigation />
      </CatalogueSyncProvider>
    </ErrorBoundary>
  );
}
