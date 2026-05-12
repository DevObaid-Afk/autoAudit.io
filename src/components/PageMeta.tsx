import { useEffect } from "react";

type PageMetaProps = {
  title: string;
  description: string;
  canonicalPath?: string;
  image?: string;
  keywords?: string[];
  noindex?: boolean;
  schema?: Record<string, unknown> | Array<Record<string, unknown>> | ((siteUrl: string) => Record<string, unknown> | Array<Record<string, unknown>>);
};

const configuredSiteUrl = import.meta.env.VITE_SITE_URL?.replace(/\/$/, "");

export function PageMeta({ title, description, canonicalPath, image, keywords = [], noindex = false, schema }: PageMetaProps) {
  useEffect(() => {
    const siteUrl = configuredSiteUrl || window.location.origin;
    const canonicalUrl = canonicalPath ? `${siteUrl}${canonicalPath}` : window.location.href;
    const imageUrl = image ?? `${siteUrl}/obaid-photo.png`;

    document.title = title;
    updateMeta("description", description);
    updateMeta("robots", noindex ? "noindex,nofollow" : "index,follow");
    updateMeta("keywords", keywords.join(", "));
    updateMeta("og:title", title, "property");
    updateMeta("og:description", description, "property");
    updateMeta("og:type", "website", "property");
    updateMeta("og:url", canonicalUrl, "property");
    updateMeta("og:image", imageUrl, "property");
    updateMeta("twitter:card", "summary_large_image");
    updateMeta("twitter:title", title);
    updateMeta("twitter:description", description);
    updateMeta("twitter:image", imageUrl);
    updateCanonical(canonicalUrl);
    updateSchema(typeof schema === "function" ? schema(siteUrl) : schema);
  }, [canonicalPath, description, image, keywords, noindex, schema, title]);

  return null;
}

function updateMeta(name: string, content: string, attribute = "name") {
  let element = document.head.querySelector<HTMLMetaElement>(`meta[${attribute}="${name}"]`);
  if (!element) {
    element = document.createElement("meta");
    element.setAttribute(attribute, name);
    document.head.appendChild(element);
  }

  element.content = content;
}

function updateCanonical(href: string) {
  let element = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
  if (!element) {
    element = document.createElement("link");
    element.rel = "canonical";
    document.head.appendChild(element);
  }

  element.href = href;
}

function updateSchema(schema?: Record<string, unknown> | Array<Record<string, unknown>>) {
  const id = "page-structured-data";
  const existing = document.head.querySelector<HTMLScriptElement>(`script#${id}`);

  if (!schema) {
    existing?.remove();
    return;
  }

  const element = existing ?? document.createElement("script");
  element.id = id;
  element.type = "application/ld+json";
  element.text = JSON.stringify(schema);

  if (!existing) {
    document.head.appendChild(element);
  }
}
