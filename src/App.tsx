import { Switch, Route, Router as WouterRouter } from "wouter";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Home from "@/pages/Home";
import PdfMerger from "@/pages/PdfMerger";
import PdfCompress from "@/pages/PdfCompress";
import PdfSplit from "@/pages/PdfSplit";
import PdfToImages from "@/pages/PdfToImages";
import NotFound from "@/pages/not-found";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/merge" component={PdfMerger} />
      <Route path="/compress" component={PdfCompress} />
      <Route path="/split" component={PdfSplit} />
      <Route path="/to-images" component={PdfToImages} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <TooltipProvider>
      <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
        <Router />
      </WouterRouter>
      <Toaster />
    </TooltipProvider>
  );
}

export default App;
