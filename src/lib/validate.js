export const clean = (s, max = 200) => String(s ?? '').replace(/[\u0000-\u001F\u007F]/g, ' ').trim().slice(0, max);
export const isEmail = (s) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(s).trim());
export const isPhone = (s) => { const d = String(s).replace(/\D/g, ''); return /^\+?[0-9 ()\-]+$/.test(String(s).trim()) && d.length >= 7 && d.length <= 15; };
export const passwordProblem = (p) => {
  if (!p || p.length < 8) return 'Use at least 8 characters.';
  if (!/[A-Za-z]/.test(p) || !/[0-9]/.test(p)) return 'Include at least one letter and one number.';
  return null;
};
export const numIn = (v, min, max) => { const n = Number(v); return Number.isFinite(n) && n >= min && n <= max ? n : null; };
export const dayKey = (d) => { const x = new Date(d); return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`; };
