# Rased — Veille sanitaire (frontend)

Interface de surveillance de santé publique : écran de connexion + tableau de bord.

## Démarrer

```bash
npm install
npm run dev
```

L'application se lance sur `http://localhost:8080`. L'entrée unique est
`src/routes/index.tsx` : elle affiche `Login`, puis `Dashboard` après connexion
(ou via « Découvrir la plateforme » en mode démonstration).

## Structure

| Fichier | Rôle |
| --- | --- |
| `src/routes/index.tsx` | Point d'entrée : Login → Dashboard |
| `src/components/Login.tsx` | Formulaire accessible (validation inline, états de chargement) |
| `src/components/Dashboard.tsx` | KPI, alertes en direct, couverture wilaya, table d'événements |
| `src/components/KpiCard.tsx`, `Badge.tsx`, `FeedItem.tsx`, `EventRow.tsx` | Composants réutilisables |
| `src/lib/mockData.ts` | Données factices calquées sur le schéma DB |
| `src/lib/supabase.ts` | Client Supabase (placeholder / mock) |
| `src/styles.css` | Design system (palette teal/bleu du logo) |

## Brancher Supabase

1. Renseigner les variables d'environnement :

```
VITE_SUPABASE_URL=https://xxxx.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_xxx
```

2. Dans `src/lib/supabase.ts`, remplacer le client mock par :

```ts
import { createClient } from "@supabase/supabase-js";
export const supabase = createClient(url!, anonKey!);
```

3. Remplacer les données de `src/lib/mockData.ts` par des requêtes réelles, par ex. :

```ts
const { data } = await supabase
  .from("health_events")
  .select("id, incident_type, severity, status, patient_proof_url, created_at, facility_id, doctor_id, patient_nin, description")
  .order("created_at", { ascending: false });
```

Les noms de champs de l'UI correspondent déjà au schéma
(`health_events`, `facilities`, `doctors`, `patients`, `users`, `health_authorities`).
Le backend et la base ne sont pas modifiés.

## Accessibilité

HTML sémantique, labels associés, `aria-invalid` / `aria-describedby` sur les
erreurs, `role="alert"`, régions `aria-live`, focus visible, contrastes AA.
