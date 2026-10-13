import "./global.css";

import { StatusBar } from "expo-status-bar";

import { RootNavigation } from "./src/navigation/RootNavigation";

export default function App() {
  return (
    <>
      <StatusBar style="auto" />
      <RootNavigation />
    </>
  );
}
