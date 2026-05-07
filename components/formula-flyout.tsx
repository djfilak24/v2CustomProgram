"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calculator, Info } from "lucide-react"

interface FormulaFlyoutProps {
  title: string
  formula: string
  inputs: { name: string; value: number | string }[]
  result: number | string
  rounding?: string
  description?: string
  trigger?: React.ReactNode
}

export function FormulaFlyout({ title, formula, inputs, result, rounding, description, trigger }: FormulaFlyoutProps) {
  const [open, setOpen] = useState(false)

  const defaultTrigger = (
    <Button variant="ghost" size="sm" className="h-6 w-6 p-0 opacity-60 hover:opacity-100">
      <Calculator className="h-3 w-3" />
    </Button>
  )

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>{trigger || defaultTrigger}</PopoverTrigger>
      <PopoverContent className="w-80 p-4" align="start">
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Calculator className="h-4 w-4 text-primary" />
            <h4 className="font-semibold text-sm">{title}</h4>
          </div>

          {description && <p className="text-xs text-muted-foreground">{description}</p>}

          <div className="space-y-2">
            <div className="text-xs font-medium text-slate-700">Formula:</div>
            <div className="bg-slate-100 p-2 rounded text-xs font-mono">{formula}</div>
          </div>

          {rounding && (
            <div className="space-y-1">
              <div className="text-xs font-medium text-slate-700">Rounding:</div>
              <div className="text-xs text-slate-600">{rounding}</div>
            </div>
          )}

          <div className="space-y-2">
            <div className="text-xs font-medium text-slate-700">Inputs:</div>
            <div className="space-y-1">
              {inputs &&
                inputs.map((input, index) => (
                  <div key={index} className="flex justify-between text-xs">
                    <span className="text-slate-600">{input.name}:</span>
                    <span className="font-mono">{input.value}</span>
                  </div>
                ))}
            </div>
          </div>

          <div className="pt-2 border-t">
            <div className="flex justify-between items-center">
              <span className="text-xs font-medium text-slate-700">Result:</span>
              <span className="font-mono font-bold text-primary">{result}</span>
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}

interface FormulaIconProps {
  title?: string
  formula?: string
  inputs?: { name: string; value: number | string }[]
  result?: number | string
  rounding?: string
  description?: string
}

export function FormulaIcon(props: FormulaIconProps = {}) {
  const {
    title = "Calculation Details",
    formula = "See calculation breakdown",
    inputs = [],
    result = "N/A",
    rounding,
    description = "Calculation details",
  } = props

  return (
    <FormulaFlyout
      title={title}
      formula={formula}
      inputs={inputs}
      result={result}
      rounding={rounding}
      description={description}
      trigger={
        <Button variant="ghost" size="sm" className="h-4 w-4 p-0 opacity-50 hover:opacity-100 ml-1">
          <Info className="h-3 w-3" />
        </Button>
      }
    />
  )
}
