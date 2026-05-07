"use client"

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import type { SurveyBlock } from "@/lib/fast-track-calculations"

function formatPercent(n: number): string {
  if (!isFinite(n)) return "0%"
  return `${Math.round(n * 100)}%`
}

function formatNumber(n: number): string {
  if (!isFinite(n)) return "0"
  return Math.round(n).toLocaleString()
}

interface SeatDemandViewProps {
  blocks: SurveyBlock[]
  activeBlockIndex: number
}

function BlockCard({ block, isActive }: { block: SurveyBlock; isActive: boolean }) {
  const totalSeats = block.rows.reduce((s, r) => s + r.seatCount, 0)
  const totalHeadcount = block.rows.reduce((s, r) => s + r.headcount, 0)
  const totalSeatsDisplay = totalSeats % 1 === 0 ? totalSeats : totalSeats.toFixed(1)

  return (
    <div
      className={`bg-white rounded-xl border overflow-hidden transition-all duration-200 ${
        isActive ? "border-teal-500 ring-2 ring-teal-500/20 shadow-md" : "border-slate-200"
      }`}
    >
      <div
        className={`p-4 border-b flex items-center justify-between gap-2 flex-wrap ${
          isActive
            ? "bg-gradient-to-r from-teal-600 to-teal-700 text-white border-teal-700"
            : "bg-slate-50 border-slate-200"
        }`}
      >
        <div className="flex items-center gap-2">
          <span className={`text-sm font-bold ${isActive ? "text-white" : "text-slate-900"}`}>
            {block.label}
          </span>
          {isActive && (
            <Badge className="text-[10px] bg-white/20 text-white border-white/30 hover:bg-white/30">
              Active Scenario
            </Badge>
          )}
        </div>
        <span
          className={`text-sm font-bold tabular-nums ${
            isActive ? "text-white" : "text-slate-900"
          }`}
        >
          {totalSeatsDisplay} seats
        </span>
      </div>

      <div className="overflow-x-auto">
        <Table className="min-w-[600px]">
          <TableHeader>
            <TableRow className="bg-slate-50/50 hover:bg-slate-50/50">
              <TableHead className="text-xs font-bold tracking-wide text-slate-600 w-[140px]">
                Type
              </TableHead>
              <TableHead className="text-right text-xs font-bold tracking-wide text-slate-600 w-[60px]">
                Days
              </TableHead>
              <TableHead className="text-right text-xs font-bold tracking-wide text-slate-600 w-[80px]">
                Survey %
              </TableHead>
              <TableHead className="text-right text-xs font-bold tracking-wide text-slate-600 w-[90px]">
                Adjusted %
              </TableHead>
              <TableHead className="text-right text-xs font-bold tracking-wide text-slate-600 w-[80px]">
                Headcount
              </TableHead>
              <TableHead className="text-right text-xs font-bold tracking-wide text-slate-600 w-[80px]">
                Desk Share
              </TableHead>
              <TableHead className="text-right text-xs font-bold tracking-wide text-slate-600 w-[80px]">
                Seats
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {block.rows.map((row, idx) => (
              <TableRow
                key={idx}
                className={
                  row.type === "Fully Remote" ? "bg-slate-50/40 hover:bg-slate-50/60" : ""
                }
              >
                <TableCell className="text-xs sm:text-sm font-medium text-slate-900">
                  {row.type}
                </TableCell>
                <TableCell className="text-right text-xs sm:text-sm tabular-nums text-slate-700">
                  {row.daysInOffice}
                </TableCell>
                <TableCell className="text-right text-xs sm:text-sm tabular-nums text-slate-700">
                  {row.type === "Fully Remote" ? "—" : formatPercent(row.surveyInput)}
                </TableCell>
                <TableCell className="text-right text-xs sm:text-sm tabular-nums text-slate-700">
                  {formatPercent(row.surveyAfterRemote)}
                </TableCell>
                <TableCell className="text-right text-xs sm:text-sm tabular-nums font-medium text-slate-900">
                  {formatNumber(row.headcount)}
                </TableCell>
                <TableCell className="text-right text-xs sm:text-sm tabular-nums text-slate-700">
                  {formatPercent(row.deskShare)}
                </TableCell>
                <TableCell className="text-right text-xs sm:text-sm tabular-nums font-bold text-teal-700">
                  {row.seatCount % 1 === 0 ? row.seatCount : row.seatCount.toFixed(1)}
                </TableCell>
              </TableRow>
            ))}
            <TableRow className="bg-slate-100/60 font-semibold border-t-2 border-slate-200">
              <TableCell colSpan={4} className="text-right text-xs font-bold italic text-slate-600">
                Totals
              </TableCell>
              <TableCell className="text-right text-xs sm:text-sm tabular-nums font-bold text-slate-900">
                {formatNumber(totalHeadcount)}
              </TableCell>
              <TableCell />
              <TableCell className="text-right text-xs sm:text-sm tabular-nums font-bold text-teal-700">
                {totalSeatsDisplay}
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </div>
    </div>
  )
}

export function SeatDemandView({ blocks, activeBlockIndex }: SeatDemandViewProps) {
  return (
    <div className="space-y-4">
      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <h3 className="text-base font-bold text-slate-900 mb-1">Seat Demand Model</h3>
        <p className="text-xs text-slate-500 italic">
          Each scenario distributes headcount across attendance patterns. The desk share ratio
          determines how many physical seats are needed per person based on their office frequency.
          The active scenario is highlighted below.
        </p>
      </div>
      <div className="space-y-4">
        {blocks.map((block, idx) => (
          <BlockCard key={idx} block={block} isActive={idx === activeBlockIndex} />
        ))}
      </div>
    </div>
  )
}
