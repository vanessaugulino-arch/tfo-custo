import * as Tooltip from "@radix-ui/react-tooltip";

export function TooltipProvider({ children }: { children: React.ReactNode }) {
  return (
    <Tooltip.Provider delayDuration={200}>
      {children}
    </Tooltip.Provider>
  );
}
