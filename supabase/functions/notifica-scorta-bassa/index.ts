// Edge Function Supabase: invia una notifica push a tutti i dispositivi
// iscritti quando un materiale scende sotto la scorta minima.
//
// Viene chiamata dal database (trigger notifica_se_sotto_scorta in
// supabase/schema.sql) tramite pg_net, con un corpo JSON tipo:
//   { secret, materiale_id, nome, quantita_totale, quantita_minima, unita_misura }
//
// Variabili d'ambiente richieste (da impostare come "secrets" della
// funzione, vedi README.md):
//   VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT, FUNCTION_SECRET
// SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY sono gia' disponibili
// automaticamente per ogni Edge Function di Supabase.

import webpush from "npm:web-push@3.6.7";

const VAPID_PUBLIC_KEY = Deno.env.get("VAPID_PUBLIC_KEY") ?? "";
const VAPID_PRIVATE_KEY = Deno.env.get("VAPID_PRIVATE_KEY") ?? "";
const VAPID_SUBJECT = Deno.env.get("VAPID_SUBJECT") ?? "mailto:info@example.com";
const FUNCTION_SECRET = Deno.env.get("FUNCTION_SECRET") ?? "";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
}

interface RichiestaNotifica {
  secret: string;
  materiale_id: string;
  nome: string;
  quantita_totale: number;
  quantita_minima: number;
  unita_misura: string;
}

interface Iscrizione {
  id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
}

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  let payload: RichiestaNotifica;
  try {
    payload = await req.json();
  } catch {
    return new Response("JSON non valido", { status: 400 });
  }

  if (!FUNCTION_SECRET || payload.secret !== FUNCTION_SECRET) {
    return new Response("Non autorizzato", { status: 401 });
  }

  const risposta = await fetch(
    `${SUPABASE_URL}/rest/v1/push_subscriptions?select=id,endpoint,p256dh,auth`,
    {
      headers: {
        apikey: SERVICE_ROLE_KEY,
        Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
      },
    },
  );

  if (!risposta.ok) {
    return new Response("Impossibile leggere le iscrizioni", { status: 500 });
  }

  const iscrizioni: Iscrizione[] = await risposta.json();

  const titolo = `Scorta bassa: ${payload.nome}`;
  const corpo = `Disponibili ${payload.quantita_totale} ${payload.unita_misura} (minimo ${payload.quantita_minima})`;

  let inviate = 0;

  await Promise.all(
    iscrizioni.map(async (iscrizione) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: iscrizione.endpoint,
            keys: { p256dh: iscrizione.p256dh, auth: iscrizione.auth },
          },
          JSON.stringify({ title: titolo, body: corpo, materialeId: payload.materiale_id }),
        );
        inviate += 1;
      } catch (err) {
        const statusCode = (err as { statusCode?: number }).statusCode;
        // 404/410: il dispositivo si e' disiscritto o la sottoscrizione e'
        // scaduta lato browser. La rimuoviamo per non riprovare all'infinito.
        if (statusCode === 404 || statusCode === 410) {
          await fetch(`${SUPABASE_URL}/rest/v1/push_subscriptions?id=eq.${iscrizione.id}`, {
            method: "DELETE",
            headers: {
              apikey: SERVICE_ROLE_KEY,
              Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
            },
          });
        }
      }
    }),
  );

  return new Response(JSON.stringify({ iscrizioni: iscrizioni.length, inviate }), {
    headers: { "Content-Type": "application/json" },
  });
});
