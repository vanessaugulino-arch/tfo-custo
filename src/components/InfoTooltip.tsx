import * as Tooltip from "@radix-ui/react-tooltip";

/** Ícone "?" com explicação contextual — usado nos campos onde o conceito não é óbvio. */
export function InfoTooltip({ children }: { children: React.ReactNode }) {
  return (
    <Tooltip.Root>
      <Tooltip.Trigger asChild>
        <button
          type="button"
          onClick={(e) => e.preventDefault()}
          className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-muted text-muted-foreground text-[10px] font-semibold leading-none hover:bg-secondary hover:text-secondary-foreground transition-colors"
          aria-label="Ajuda"
        >
          ?
        </button>
      </Tooltip.Trigger>
      <Tooltip.Portal>
        <Tooltip.Content
          side="top"
          align="start"
          sideOffset={6}
          className="max-w-[260px] rounded-md bg-primary text-primary-foreground text-xs leading-relaxed px-3 py-2 shadow-lg z-50"
        >
          {children}
          <Tooltip.Arrow className="fill-primary" />
        </Tooltip.Content>
      </Tooltip.Portal>
    </Tooltip.Root>
  );
}
