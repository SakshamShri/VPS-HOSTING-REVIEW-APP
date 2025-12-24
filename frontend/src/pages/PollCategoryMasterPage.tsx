import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import { CategoryTable } from "../components/poll-category/CategoryTable";
import { Button } from "../components/ui/button";
import type { CategoryNode } from "../types/category";
import { fetchCategoryTree } from "../api/category.api";

export function PollCategoryMasterPage() {
  const navigate = useNavigate();
  const [categories, setCategories] = useState<CategoryNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    const load = async () => {
      try {
        setLoading(true);
        const data = await fetchCategoryTree();
        if (isMounted) {
          setCategories(data);
        }
      } catch (err) {
        console.error(err);
        if (isMounted) {
          setError("Unable to load categories.");
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    void load();

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <h2 className="text-base font-semibold tracking-tight text-foreground">
            Poll Category Master
          </h2>
          <p className="text-xs text-muted-foreground">
            Define and manage the category hierarchy that powers your polls.
          </p>
        </div>
        <Button
          type="button"
          size="sm"
          className="sm:ml-auto"
          onClick={() => navigate("/admin/categories/new")}
        >
          + Add Category
        </Button>
      </div>

      {error && (
        <p className="text-xs text-destructive">
          {error}
        </p>
      )}

      <CategoryTable
        data={categories}
        onChange={async () => {
          try {
            setLoading(true);
            const data = await fetchCategoryTree();
            setCategories(data);
          } catch (err) {
            console.error(err);
            setError("Unable to load categories.");
          } finally {
            setLoading(false);
          }
        }}
      />
    </div>
  );
}
