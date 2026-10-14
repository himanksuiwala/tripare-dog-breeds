import "./global.css";

import { StatusBar } from "expo-status-bar";

import { CatalogueSyncProvider } from "./src/features/breeds/CatalogueSyncContext";
import { RootNavigation } from "./src/navigation/RootNavigation";

export default function App() {
  return (
    <CatalogueSyncProvider>
      <StatusBar style="auto" />
      <RootNavigation />
    </CatalogueSyncProvider>
  );
}
