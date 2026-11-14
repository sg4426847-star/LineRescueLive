import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import LineRescueApp from "./pages/LineRescue";
import PublicBackorderDemo from "./pages/PublicBackorderDemo";

function App() {
  return <ErrorBoundary>
    <TooltipProvider>
      <Toaster />
      <Switch>
        <Route path="/" component={LineRescueApp} />
        <Route path="/factory" component={LineRescueApp} />
        <Route path="/production" component={LineRescueApp} />
        <Route path="/simulator" component={LineRescueApp} />
        <Route path="/risk" component={LineRescueApp} />
        <Route path="/recovery" component={LineRescueApp} />
        <Route path="/impact" component={LineRescueApp} />
        <Route path="/what-if" component={LineRescueApp} />
        <Route path="/scenario" component={LineRescueApp} />
        <Route path="/assistant" component={LineRescueApp} />
        <Route path="/voice" component={LineRescueApp} />
        <Route path="/audit" component={LineRescueApp} />
        <Route path="/data" component={LineRescueApp} />
        <Route path="/business" component={LineRescueApp} />
        <Route path="/public-backorder-demo" component={PublicBackorderDemo} />
        <Route path="/404" component={NotFound} />
        <Route component={NotFound} />
      </Switch>
    </TooltipProvider>
  </ErrorBoundary>;
}

export default App;
