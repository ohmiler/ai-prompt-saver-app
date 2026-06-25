"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";

export function SearchBox() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();

  function updateSearch(value: string) {
    const params = new URLSearchParams(searchParams);

    if (value.trim()) {
      params.set("q", value);
    } else {
      params.delete("q");
    }

    startTransition(() => {
      router.replace(`${pathname}?${params.toString()}`);
    });
  }

  return (
    <input
      className="search-input"
      defaultValue={searchParams.get("q") ?? ""}
      name="q"
      onChange={(event) => updateSearch(event.target.value)}
      placeholder={pending ? "Searching..." : "Search title or content"}
      type="search"
    />
  );
}
