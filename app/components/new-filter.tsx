import { useSearchParams } from "react-router";
import { Checkbox } from "~/components/ui/checkbox";
import { Sparkles } from "lucide-react";

export function NewFilter() {
  const [searchParams, setSearchParams] = useSearchParams();

  const newParam = searchParams.get("new");
  const isNewOnly = newParam === "1" || newParam === "true";

  function handleToggle(checked: boolean | "indeterminate") {
    setSearchParams((prev) => {
      const updated = new URLSearchParams(prev);
      if (checked === true) {
        updated.set("new", "1");
      } else {
        updated.delete("new");
      }
      return updated;
    });
  }

  return (
    <label className="flex cursor-pointer items-center gap-1.5 text-sm text-muted-foreground">
      <Checkbox checked={isNewOnly} onCheckedChange={handleToggle} />
      <Sparkles className="h-4 w-4 shrink-0" />
      New only
    </label>
  );
}
