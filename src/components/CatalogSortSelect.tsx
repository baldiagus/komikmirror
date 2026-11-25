"use client";

import React from "react";

export function CatalogSortSelect({ defaultValue }: { defaultValue: string }) {
  return (
    <select
      name="sort"
      aria-label="Urutkan"
      defaultValue={defaultValue}
      onChange={(e) => e.currentTarget.form?.requestSubmit()}
    >
      <option value="">Update terbaru</option>
      <option value="rating">Rating tertinggi</option>
      <option value="name">Judul A–Z</option>
    </select>
  );
}
