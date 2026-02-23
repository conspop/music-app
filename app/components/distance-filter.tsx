import { useSearchParams } from "react-router";
import { Slider } from "~/components/ui/slider";
import { Checkbox } from "~/components/ui/checkbox";
import { MapPin } from "lucide-react";

interface DistanceFilterProps {
  defaultRadiusKm: number;
}

const MIN_KM = 10;
const MAX_KM = 500;

export function DistanceFilter({ defaultRadiusKm }: DistanceFilterProps) {
  const [searchParams, setSearchParams] = useSearchParams();

  const raw = searchParams.get("distance");
  const isAny = raw === "any";
  const currentKm = isAny
    ? defaultRadiusKm
    : raw != null
      ? clamp(parseInt(raw, 10) || defaultRadiusKm, MIN_KM, MAX_KM)
      : defaultRadiusKm;

  function handleSliderChange(values: number[]) {
    setSearchParams((prev) => {
      const updated = new URLSearchParams(prev);
      updated.set("distance", String(values[0]));
      return updated;
    });
  }

  function handleAnyToggle(checked: boolean) {
    setSearchParams((prev) => {
      const updated = new URLSearchParams(prev);
      if (checked) {
        updated.set("distance", "any");
      } else {
        updated.delete("distance");
      }
      return updated;
    });
  }

  return (
    <div className="flex items-center gap-4">
      <MapPin className="h-4 w-4 shrink-0 text-muted-foreground" />
      <Slider
        min={MIN_KM}
        max={MAX_KM}
        step={10}
        value={[currentKm]}
        onValueChange={handleSliderChange}
        disabled={isAny}
        className="w-40"
      />
      <span className="min-w-22 text-sm text-muted-foreground">
        {isAny ? "Any distance" : `Within ${currentKm} km`}
      </span>
      <label className="flex cursor-pointer items-center gap-1.5 text-sm text-muted-foreground">
        <Checkbox checked={isAny} onCheckedChange={handleAnyToggle} />
        Any
      </label>
    </div>
  );
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
