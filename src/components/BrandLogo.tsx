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

export function BrandLogo({ size = "lg" }: { size?: "sm" | "lg" }) {
  const t = TAMANHOS[size];
  return (
    <div className={`flex items-center ${t.gap}`}>
      <img src="/logo-mark.svg" alt="" width={t.icon} height={t.icon} className="shrink-0" />
      <div className="flex flex-col leading-none">
        <span style={{ fontFamily: FONTE_FASHION, fontSize: t.fashion, color: "#e8c547" }}>Fashion</span>
        <span
          style={{ fontFamily: FONTE_SKILLS, fontSize: t.skills, color: "#7f96c4", fontWeight: 700, letterSpacing: "0.2em" }}
        >
          SKILLS
        </span>
      </div>
    </div>
  );
}
