const TAMANHOS = {
  sm: { icon: 32, fashion: "1.15rem", skills: "0.6rem", gap: "gap-2" },
  lg: { icon: 64, fashion: "2.75rem", skills: "1.1rem", gap: "gap-4" },
} as const;

/**
 * "Avalon" é a fonte usada na marca, mas é uma fonte licenciada — sem o arquivo com a
 * licença certa não dá para embutir no site, então cai no fallback cursivo do sistema.
 */
const FONTE_FASHION = "Avalon, 'Avalon Chaligraphy', 'Segoe Script', 'Brush Script MT', cursive";
const FONTE_SKILLS = "'Alegreya Sans', Georgia, sans-serif";

/** Cor de "Fashion" muda com o fundo para manter contraste: vinho da marca sobre fundo claro, dourado sobre fundo escuro. */
const COR_FASHION = { light: "#2e1f24", dark: "#e8c547" } as const;
const COR_SKILLS = "#7f96c4";

interface BrandLogoProps {
  size?: "sm" | "lg";
  /** Fundo sobre o qual a logo será colocada — escolhe a cor de "Fashion" com melhor contraste. */
  theme?: "light" | "dark";
  /** "full" = ícone + texto; use "icon" ou "text" isoladamente em espaços pequenos. */
  variant?: "full" | "icon" | "text";
}

export function BrandLogo({ size = "lg", theme = "light", variant = "full" }: BrandLogoProps) {
  const t = TAMANHOS[size];

  const icone = <img src="/logo-mark.svg" alt="" width={t.icon} height={t.icon} className="shrink-0" />;
  const texto = (
    <div className="flex flex-col leading-none">
      <span style={{ fontFamily: FONTE_FASHION, fontSize: t.fashion, color: COR_FASHION[theme] }}>Fashion</span>
      <span style={{ fontFamily: FONTE_SKILLS, fontSize: t.skills, color: COR_SKILLS, fontWeight: 700, letterSpacing: "0.04em" }}>
        Skills
      </span>
    </div>
  );

  if (variant === "icon") return icone;
  if (variant === "text") return texto;
  return (
    <div className={`flex items-center ${t.gap}`}>
      {icone}
      {texto}
    </div>
  );
}
