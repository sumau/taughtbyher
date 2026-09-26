import { useEffect } from "react";
import { useLocation } from "wouter";
import { routeMetadataForPath } from "./route-map";

export function RouteMeta() {
  const [location] = useLocation();

  useEffect(() => {
    const { title, description } = routeMetadataForPath(location);

    document.title = title;
    for (const [selector, content] of [
      ['meta[name="description"]', description],
      ['meta[property="og:title"]', title],
      ['meta[property="og:description"]', description],
      ['meta[name="twitter:title"]', title],
      ['meta[name="twitter:description"]', description],
    ]) {
      document.querySelector<HTMLMetaElement>(selector)?.setAttribute("content", content);
    }
  }, [location]);

  return null;
}