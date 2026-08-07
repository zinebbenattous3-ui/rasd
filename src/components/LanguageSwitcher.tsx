import { useI18n, LOCALES } from "@/lib/i18n";

export function LanguageSwitcher() {
  const { locale, setLocale, t } = useI18n();
  return (
    <div className="lang-switch" role="group" aria-label={t("lang.label")}>
      {LOCALES.map((l) => (
        <button
          key={l.code}
          type="button"
          className={`lang-btn${l.code === locale ? " active" : ""}`}
          aria-pressed={l.code === locale}
          lang={l.code}
          title={l.name}
          onClick={() => setLocale(l.code)}
        >
          {l.label}
        </button>
      ))}
    </div>
  );
}
