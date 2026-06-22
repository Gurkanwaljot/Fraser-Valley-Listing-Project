import { useEffect } from 'react';

interface MetaTag {
  name?: string;
  property?: string;
  content: string;
}

interface PreloadHint {
  href: string;
  as: 'image' | 'font' | 'script' | 'style';
  type?: string;
  fetchpriority?: 'high' | 'low' | 'auto';
}

interface DocumentHeadOptions {
  title?: string;
  description?: string;
  canonical?: string;
  meta?: MetaTag[];
  jsonLd?: Record<string, unknown>;
  preload?: PreloadHint[];
}

function setMeta(attr: 'name' | 'property', value: string, content: string) {
  let el = document.querySelector(`meta[${attr}="${value}"]`) as HTMLMetaElement | null;
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attr, value);
    document.head.appendChild(el);
  }
  el.setAttribute('content', content);
  return el;
}

function setCanonical(href: string) {
  let el = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
  if (!el) {
    el = document.createElement('link');
    el.setAttribute('rel', 'canonical');
    document.head.appendChild(el);
  }
  el.setAttribute('href', href);
  return el;
}

function setJsonLd(data: Record<string, unknown>) {
  let el = document.querySelector('script[data-seo-jsonld]') as HTMLScriptElement | null;
  if (!el) {
    el = document.createElement('script');
    el.setAttribute('type', 'application/ld+json');
    el.setAttribute('data-seo-jsonld', '');
    document.head.appendChild(el);
  }
  el.textContent = JSON.stringify(data);
  return el;
}

export function useDocumentHead(options: DocumentHeadOptions) {
  useEffect(() => {
    const prevTitle = document.title;
    const createdElements: Element[] = [];

    if (options.title) {
      document.title = options.title;
    }

    if (options.description) {
      setMeta('name', 'description', options.description);
    }

    if (options.canonical) {
      setCanonical(options.canonical);
    }

    if (options.meta) {
      for (const tag of options.meta) {
        if (tag.property) {
          setMeta('property', tag.property, tag.content);
        } else if (tag.name) {
          setMeta('name', tag.name, tag.content);
        }
      }
    }

    if (options.jsonLd) {
      setJsonLd(options.jsonLd);
    }

    if (options.preload) {
      for (const hint of options.preload) {
        const existing = document.querySelector(`link[rel="preload"][href="${hint.href}"]`);
        if (!existing) {
          const el = document.createElement('link');
          el.setAttribute('rel', 'preload');
          el.setAttribute('href', hint.href);
          el.setAttribute('as', hint.as);
          if (hint.type) el.setAttribute('type', hint.type);
          if (hint.fetchpriority) el.setAttribute('fetchpriority', hint.fetchpriority);
          document.head.appendChild(el);
          createdElements.push(el);
        }
      }
    }

    return () => {
      document.title = prevTitle;
      createdElements.forEach((el) => el.remove());
      const jsonLdEl = document.querySelector('script[data-seo-jsonld]');
      if (jsonLdEl) jsonLdEl.remove();
      const canonicalEl = document.querySelector('link[rel="canonical"]');
      if (canonicalEl) canonicalEl.remove();
    };
  }, [options.title, options.description, options.canonical, options.jsonLd, options.meta, options.preload]);
}
