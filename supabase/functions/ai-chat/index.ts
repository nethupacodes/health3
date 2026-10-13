// Supabase Edge Function. The Anthropic API key lives only here (as a secret), never in the app.
// Deploy: supabase functions deploy ai-chat   |   supabase secrets set ANTHROPIC_API_KEY=sk-ant-...
import { createClient } from 'npm:@supabase/supabase-js@2';

const SYSTEM = `You are Health Mate AI, a friendly wellness assistant inside a health app.
Rules:
- Give general wellness guidance only: sleep, activity, hydration, meals, stress, routines.
- Never diagnose a condition, interpret symptoms as a disease, or recommend medication or doses.
- Only use measurements that appear in the data summary. If a value is missing, say it is missing. Never invent numbers.
- If the data summary says DEMO DATA, say that the numbers are demo data.
- State uncertainty plainly. For worrying symptoms, persistent problems or medical questions, recommend seeing a doctor. For emergencies, tell the user to contact local emergency services now.
- Keep answers short, practical and kind. Use plain text, short paragraphs or simple dashes.`;

const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type' };
const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { ...cors, 'Content-Type': 'application/json' } });

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  const sb = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, { global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } } });
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return json({ error: 'Unauthorized' }, 401);

  let body: any; try { body = await req.json(); } catch { return json({ error: 'Bad request' }, 400); }
  let messages = Array.isArray(body.messages) ? body.messages.slice(-12) : [];
  messages = messages.filter((m: any) => (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string' && m.content.length <= 2000);
  while (messages.length && messages[0].role !== 'user') messages.shift();
  if (!messages.length || messages[messages.length - 1].role !== 'user') return json({ error: 'Bad request' }, 400);
  const summary = typeof body.summary === 'string' ? body.summary.slice(0, 3000) : '';

  const r = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'x-api-key': Deno.env.get('ANTHROPIC_API_KEY')!, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
    body: JSON.stringify({
      model: Deno.env.get('AI_MODEL') ?? 'claude-sonnet-5-5', max_tokens: 700,
      system: SYSTEM + (summary ? `\n\nUser data summary:\n${summary}` : '\n\nNo health data was shared. Do not assume any measurements.'),
      messages: messages.map((m: any) => ({ role: m.role, content: m.content })),
    }),
  });
  if (!r.ok) return json({ error: 'AI service error' }, 502);
  const d = await r.json();
  const reply = (d.content ?? []).filter((b: any) => b.type === 'text').map((b: any) => b.text).join('\n').trim();
  return json({ reply });
});
