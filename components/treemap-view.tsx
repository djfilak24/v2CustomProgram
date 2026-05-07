"use client"

import { useMemo } from "react";
import { Treemap, ResponsiveContainer, Tooltip } from "recharts";
import type { SpaceProgram } from "@/lib/fast-track-calculations";

interface TreemapViewProps {
  program: SpaceProgram;
}

const CATEGORY_COLORS = {
  individual: ["#34D399", "#2DD4A8", "#6EE7B7", "#A7F3D0", "#10B981"],
  collaborative: ["#2DD4BF", "#14B8A6", "#5EEAD4", "#99F6E4", "#0D9488"],
  support: ["#8B5CF6", "#7C3AED", "#A78BFA", "#C4B5FD", "#6D28D9"],
};

interface TreemapDataItem {
  name: string;
  size: number;
  qty: number;
  fill: string;
  category: string;
}

function formatSf(num: number): string {
  return `${Math.round(num).toLocaleString()} SF`;
}

const CustomTreemapContent = (props: any) => {
  const { x, y, width, height, name, qty, size, fill, root } = props;

  if (!width || !height || width < 30 || height < 20) return null;

  const areaValue = size || props.value || 0;
  const displayName = name || "";
  const displayQty = qty || 0;
  const displayFill = fill || root?.fill || "#888";

  const showFull = width > 90 && height > 50;
  const showCompact = width > 55 && height > 30;

  return (
    <g>
      <rect
        x={x}
        y={y}
        width={width}
        height={height}
        rx={6}
        ry={6}
        style={{
          fill: displayFill,
          stroke: "rgba(255,255,255,0.3)",
          strokeWidth: 2,
          transition: "all 400ms cubic-bezier(0.4, 0, 0.2, 1)",
        }}
      />
      {showFull && displayName && (
        <>
          <text
            x={x + 10}
            y={y + 20}
            fill="white"
            fontSize={Math.min(13, width / 10)}
            fontWeight={600}
            style={{ transition: "all 400ms cubic-bezier(0.4, 0, 0.2, 1)" }}
          >
            {displayName}
          </text>
          <text
            x={x + 10}
            y={y + 38}
            fill="rgba(255,255,255,0.85)"
            fontSize={Math.min(11, width / 12)}
            fontStyle="italic"
            style={{ transition: "all 400ms cubic-bezier(0.4, 0, 0.2, 1)" }}
          >
            {displayQty} - {formatSf(areaValue)}
          </text>
        </>
      )}
      {!showFull && showCompact && displayName && (
        <text
          x={x + 6}
          y={y + height / 2 + 4}
          fill="white"
          fontSize={Math.min(10, width / 8)}
          fontWeight={500}
          style={{ transition: "all 400ms cubic-bezier(0.4, 0, 0.2, 1)" }}
        >
          {displayName.length > width / 7 ? displayName.slice(0, Math.floor(width / 7)) + "..." : displayName}
        </text>
      )}
    </g>
  );
};

const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-white rounded-lg px-3 py-2 text-sm shadow-lg border border-slate-200">
        <p className="font-semibold text-slate-900">{data.name}</p>
        <p className="text-slate-600 italic text-xs">
          {data.qty} units - {formatSf(data.size)}
        </p>
        <p className="text-[10px] text-slate-500 capitalize">{data.category}</p>
      </div>
    );
  }
  return null;
};

export function TreemapChart({ program }: TreemapViewProps) {
  const data = useMemo(() => {
    const items: TreemapDataItem[] = [];

    program.individual.forEach((item, idx) => {
      if (item.totalArea > 0) {
        items.push({
          name: item.name.replace("Resident ", "").replace("Unassigned ", ""),
          size: item.totalArea,
          qty: item.quantity,
          fill: CATEGORY_COLORS.individual[idx % CATEGORY_COLORS.individual.length],
          category: "individual",
        });
      }
    });

    program.collaborative.forEach((item, idx) => {
      if (item.totalArea > 0) {
        items.push({
          name: item.name,
          size: item.totalArea,
          qty: item.quantity,
          fill: CATEGORY_COLORS.collaborative[idx % CATEGORY_COLORS.collaborative.length],
          category: "collaborative",
        });
      }
    });

    program.support.forEach((item, idx) => {
      if (item.totalArea > 0) {
        items.push({
          name: item.name,
          size: item.totalArea,
          qty: item.quantity,
          fill: CATEGORY_COLORS.support[idx % CATEGORY_COLORS.support.length],
          category: "support",
        });
      }
    });

    return items;
  }, [program]);

  return (
    <div className="w-full h-[280px] sm:h-[400px]">
      <ResponsiveContainer width="100%" height="100%">
        <Treemap
          data={data}
          dataKey="size"
          nameKey="name"
          content={<CustomTreemapContent />}
          isAnimationActive={false}
        >
          <Tooltip content={<CustomTooltip />} />
        </Treemap>
      </ResponsiveContainer>
    </div>
  );
}
