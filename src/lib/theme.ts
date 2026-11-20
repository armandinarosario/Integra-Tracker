export type ThemePref = 'auto' | 'light' | 'dark';
const KEY = 'integra-tracker:theme';

export function getTheme(): ThemePref {
  try {
    const v = localStorage.getItem(KEY);
    return v === 'light' || v === 'dark' ? v : 'auto';
  } catch {
    return 'auto';
  }
}

/** Guarda a preferência neste dispositivo e aplica-a de imediato. */
export function setThemePref(t: ThemePref) {
  try {
    if (t === 'auto') localStorage.removeItem(KEY);
    else localStorage.setItem(KEY, t);
  } catch {
    /* sem armazenamento: aplica só nesta sessão */
  }
  if (t === 'auto') document.documentElement.removeAttribute('data-theme');
  else document.documentElement.setAttribute('data-theme', t);
}
