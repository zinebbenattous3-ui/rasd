import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

/**
 * Minimal, extensible i18n layer.
 *
 * Add a language:
 *   1. add an entry to `LOCALES`
 *   2. add the matching dictionary in `dictionaries`
 * Add a string: add the key to `fr` (the reference locale) then to the others.
 * Missing keys fall back to the reference locale, so partial translations are safe.
 */

export const LOCALES = [
  { code: "fr", label: "FR", name: "Français", dir: "ltr" },
  { code: "ar", label: "AR", name: "العربية", dir: "rtl" },
  { code: "en", label: "EN", name: "English", dir: "ltr" },
] as const;

export type Locale = (typeof LOCALES)[number]["code"];

const fr = {
  "nav.home": "Accueil",
  "nav.roles": "Rôles",
  "nav.how": "Fonctionnement",
  "nav.about": "À propos",
  "nav.login": "Se connecter",
  "nav.signup": "Créer un compte",
  "nav.menu": "Menu",
  "nav.main": "Navigation principale",
  "lang.label": "Langue",

  "hero.eyebrow": "Santé publique · Surveillance épidémiologique",
  "hero.title": "Détecter tôt, répondre vite, protéger durablement",
  "hero.lead":
    "Rased est la plateforme qui relie les médecins, les établissements de santé et les autorités sanitaires autour d'un même flux d'information : la déclaration d'un événement sanitaire et son suivi jusqu'à sa clôture.",
  "hero.cta": "Accéder à l'espace professionnel",
  "hero.stat.wilayas": "Wilayas couvertes",
  "hero.stat.facilities": "Établissements connectés",
  "hero.stat.delay": "Délai moyen d'alerte",

  "cta.title": "Vous êtes praticien ou autorité sanitaire ?",
  "cta.body": "Rejoignez le réseau ou explorez le tableau de bord en mode démonstration.",
  "cta.action": "Découvrir la plateforme",

  "footer.tagline": "Nous surveillons aujourd'hui pour protéger demain.",
  "footer.platform": "Plateforme",
  "footer.org": "Organisation",
  "footer.workspace": "Espace professionnel",
  "footer.contact": "Contact",
  "footer.legal": "Réseau national de veille sanitaire. Données protégées et accès contrôlé.",
} as const;

export type TranslationKey = keyof typeof fr;

const ar: Partial<Record<TranslationKey, string>> = {
  "nav.home": "الرئيسية",
  "nav.roles": "الأدوار",
  "nav.how": "آلية العمل",
  "nav.about": "من نحن",
  "nav.login": "تسجيل الدخول",
  "nav.signup": "إنشاء حساب",
  "nav.menu": "القائمة",
  "nav.main": "التنقل الرئيسي",
  "lang.label": "اللغة",
  "hero.eyebrow": "الصحة العمومية · الترصد الوبائي",
  "hero.title": "نكتشف مبكرًا، نستجيب بسرعة، نحمي على المدى الطويل",
  "hero.lead":
    "رصد منصة تربط الأطباء والمؤسسات الصحية والسلطات الصحية ضمن تدفق معلومات واحد: التصريح بالحدث الصحي ومتابعته حتى إغلاقه.",
  "hero.cta": "الدخول إلى الفضاء المهني",
  "hero.stat.wilayas": "الولايات المغطاة",
  "hero.stat.facilities": "المؤسسات المرتبطة",
  "hero.stat.delay": "متوسط زمن الإنذار",
  "cta.title": "هل أنت ممارس صحي أو سلطة صحية؟",
  "cta.body": "انضم إلى الشبكة أو استكشف لوحة القيادة في الوضع التجريبي.",
  "cta.action": "اكتشف المنصة",
  "footer.tagline": "نرصد اليوم .. لنحمي الغد.",
  "footer.platform": "المنصة",
  "footer.org": "المؤسسة",
  "footer.workspace": "الفضاء المهني",
  "footer.contact": "اتصل بنا",
  "footer.legal": "الشبكة الوطنية للترصد الصحي. بيانات محمية ووصول مُراقَب.",
};

const en: Partial<Record<TranslationKey, string>> = {
  "nav.home": "Home",
  "nav.roles": "Roles",
  "nav.how": "How it works",
  "nav.about": "About",
  "nav.login": "Sign in",
  "nav.signup": "Create account",
  "nav.menu": "Menu",
  "nav.main": "Main navigation",
  "lang.label": "Language",
  "hero.eyebrow": "Public health · Epidemiological surveillance",
  "hero.title": "Detect early, respond fast, protect for the long run",
  "hero.lead":
    "Rased connects doctors, health facilities and health authorities around a single information flow: reporting a health event and tracking it through to closure.",
  "hero.cta": "Enter the professional workspace",
  "hero.stat.wilayas": "Wilayas covered",
  "hero.stat.facilities": "Connected facilities",
  "hero.stat.delay": "Average alert delay",
  "cta.title": "Are you a practitioner or a health authority?",
  "cta.body": "Join the network or explore the dashboard in demo mode.",
  "cta.action": "Explore the platform",
  "footer.tagline": "We watch today to protect tomorrow.",
  "footer.platform": "Platform",
  "footer.org": "Organisation",
  "footer.workspace": "Professional workspace",
  "footer.contact": "Contact",
  "footer.legal": "National health surveillance network. Protected data, controlled access.",
};

const dictionaries: Record<Locale, Partial<Record<TranslationKey, string>>> = { fr, ar, en };

const STORAGE_KEY = "rased.locale";

interface I18nValue {
  locale: Locale;
  setLocale: (l: Locale) => void;
  t: (key: TranslationKey) => string;
  dir: "ltr" | "rtl";
}

const I18nContext = createContext<I18nValue | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>("fr");

  useEffect(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY) as Locale | null;
    if (stored && LOCALES.some((l) => l.code === stored)) setLocaleState(stored);
  }, []);

  const setLocale = useCallback((l: Locale) => {
    setLocaleState(l);
    window.localStorage.setItem(STORAGE_KEY, l);
  }, []);

  const dir = (LOCALES.find((l) => l.code === locale)?.dir ?? "ltr") as "ltr" | "rtl";

  useEffect(() => {
    document.documentElement.lang = locale;
    document.documentElement.dir = dir;
  }, [locale, dir]);

  const t = useCallback(
    (key: TranslationKey) => dictionaries[locale][key] ?? fr[key] ?? key,
    [locale],
  );

  const value = useMemo(() => ({ locale, setLocale, t, dir }), [locale, setLocale, t, dir]);
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nValue {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n must be used inside <I18nProvider>");
  return ctx;
}
