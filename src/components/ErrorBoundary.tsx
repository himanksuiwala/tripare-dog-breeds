import type { ComponentType, ErrorInfo, ReactNode } from "react";
import { Component } from "react";

export type ErrorFallbackProps = {
  onRetry: () => void;
};

type ErrorBoundaryProps = {
  children: ReactNode;
  FallbackComponent: ComponentType<ErrorFallbackProps>;
  resetKeys?: readonly unknown[];
};

type ErrorBoundaryState = {
  hasError: boolean;
};

function resetKeysChanged(
  previousKeys: readonly unknown[],
  currentKeys: readonly unknown[],
): boolean {
  return (
    previousKeys.length !== currentKeys.length ||
    previousKeys.some((key, index) => !Object.is(key, currentKeys[index]))
  );
}

export class ErrorBoundary extends Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  state: ErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error("An unexpected rendering error was caught.", error, info);
  }

  componentDidUpdate(previousProps: ErrorBoundaryProps): void {
    if (
      this.state.hasError &&
      resetKeysChanged(
        previousProps.resetKeys ?? [],
        this.props.resetKeys ?? [],
      )
    ) {
      this.reset();
    }
  }

  private reset = (): void => {
    this.setState({ hasError: false });
  };

  render(): ReactNode {
    if (this.state.hasError) {
      const { FallbackComponent } = this.props;
      return <FallbackComponent onRetry={this.reset} />;
    }

    return this.props.children;
  }
}
