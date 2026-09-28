import { Component, type ReactNode } from "react";
import { Button } from "@/components/ui/button";

interface State {
  error: Error | null;
}

/** Last line of defence against a blank screen when a component throws while rendering. */
export class ErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error) {
    console.error("Unhandled UI error:", error);
  }

  render() {
    if (!this.state.error) return this.props.children;
    const isChunkError = /dynamically imported module|Loading chunk/i.test(this.state.error.message);
    return (
      <div className="container-page flex min-h-[60vh] flex-col items-center justify-center py-16 text-center">
        <p className="eyebrow">Unexpected error</p>
        <h1 className="mt-2 text-3xl font-semibold">This page couldn't be displayed</h1>
        <p className="mt-3 max-w-md text-muted-foreground">
          {isChunkError
            ? "A newer version of EventSphere is available. Reload to continue."
            : "Something went wrong while showing this page. Reloading usually fixes it."}
        </p>
        <div className="mt-6 flex gap-3">
          <Button onClick={() => window.location.reload()}>Reload page</Button>
          <Button variant="outline" onClick={() => (window.location.href = "/")}>
            Go home
          </Button>
        </div>
      </div>
    );
  }
}
