import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export function useFavicon() {
  useEffect(() => {
    const setFavicon = async () => {
      const { data } = await supabase
        .from("site_settings")
        .select("favicon_url")
        .maybeSingle();

      if (data?.favicon_url) {
        let link = document.querySelector<HTMLLinkElement>("link[rel='icon']");
        if (!link) {
          link = document.createElement("link");
          link.rel = "icon";
          document.head.appendChild(link);
        }
        link.href = data.favicon_url;
        link.type = "image/png";
        
        // Also remove any existing favicon references
        const existing = document.querySelectorAll<HTMLLinkElement>("link[rel='shortcut icon']");
        existing.forEach(el => el.remove());
      }
    };
    setFavicon();
  }, []);
}
