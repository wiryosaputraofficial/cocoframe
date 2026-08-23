import { defineLayout } from "@cocoframe/core";
import { MarketingFooter, MarketingHeader } from "../components/marketing-shell.tsx";

export default defineLayout(({ children, context }) => {
  const pathname = context.url.pathname;
  const active = pathname === "/" ? "home" : pathname.startsWith("/features") || pathname.startsWith("/cocospecs") || pathname.startsWith("/cocoref") || pathname.startsWith("/cocoqa") ? "features" : pathname.startsWith("/docs") ? "docs" : pathname.startsWith("/cocoql") ? "cocoql" : pathname.startsWith("/components") ? "components" : pathname.startsWith("/icons") ? "icons" : pathname.startsWith("/templates") ? "templates" : "none";
  return <><MarketingHeader active={active} />{children}<MarketingFooter /></>;
});
