"use client";
import { Tile } from "@/components/tile/tile";
import type { Tile as TileT } from "@/lib/tile-manager";
import { cn } from "@/lib/utils";
import { useI18n } from "@/lib/i18n/client";

export interface RackProps {
  tiles: TileT[];
  slots?: number;
  selectedId?: string | null;
  markedIds?: Set<string>;
  hiddenCount?: number;
  disabled?: boolean;
  onTilePointerDown?: (e: React.PointerEvent, tileId: string) => void;
  onSlotClick?: (index: number) => void;
  className?: string;
}

/** The player's 8-slot rack. Hidden racks (opponent) render face-down placeholders only. */
export function Rack({ tiles, slots = 8, selectedId, markedIds, hiddenCount, disabled, onTilePointerDown, onSlotClick, className }: RackProps) {
  const { t } = useI18n();
  const count = Math.max(slots, tiles.length);
  return (
    <div
      className={cn("grid w-full max-w-[640px] gap-[1.4%] rounded-2xl border border-line bg-[#f1f2f6] p-[1.6%] shadow-inner", className)}
      style={{ gridTemplateColumns: `repeat(${count}, minmax(0, 1fr))` }}
      aria-label={t("rack.aria")}
      data-testid="rack"
    >
      {Array.from({ length: count }).map((_, i) => {
        const t = tiles[i];
        const hidden = hiddenCount !== undefined && i < hiddenCount;
        return (
          <div key={t?.id ?? `slot-${i}`} data-rack-index={i} className="aspect-square" onClick={() => !t && onSlotClick?.(i)}>
            {t ? (
              <div
                className={cn("no-select h-full w-full", !disabled && "cursor-grab active:cursor-grabbing")}
                onPointerDown={(e) => !disabled && onTilePointerDown?.(e, t.id)}
                data-tile-id={t.id}
              >
                <Tile face={t.face} kind={t.kind} points={t.points} selected={selectedId === t.id} error={markedIds?.has(t.id)} />
              </div>
            ) : hidden ? (
              <div className="h-full w-full rounded-[16%] border border-[#dcd3bb] bg-[#efe6cf]" />
            ) : (
              <div className="h-full w-full rounded-[16%] border border-dashed border-[#d8dbe3]" />
            )}
          </div>
        );
      })}
    </div>
  );
}
