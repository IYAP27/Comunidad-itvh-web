// ═════════════════════════════════════════════════════════════════
// theme.js — traducción de themeNotifier (main.dart)
//
// En Flutter: ValueNotifier<ThemeMode> + SharedPreferences.
// En web: Notifier (nuestro mini ValueNotifier) + localStorage.
// ═════════════════════════════════════════════════════════════════

import { Notifier } from './notifier.js';

const CLAVE = 'theme_mode'; // 'light' | 'dark' | 'system'

function _cargarTema() {
  const valor = localStorage.getItem(CLAVE);
  if (valor === 'light' || valor === 'dark' || valor === 'system') return valor;
  return 'dark'; // mismo default que Flutter
}

export const themeNotifier = new Notifier(_cargarTema());

function _aplicarTema(modo) {
  const oscuro = modo === 'system'
    ? window.matchMedia('(prefers-color-scheme: dark)').matches
    : modo === 'dark';
  document.documentElement.classList.toggle('tema-claro', !oscuro);
  document.documentElement.classList.toggle('tema-oscuro', oscuro);
}

// Persiste y aplica cada vez que cambia, igual que el listener de
// themeNotifier en main.dart que llama _guardarTema().
themeNotifier.listen((modo) => {
  localStorage.setItem(CLAVE, modo);
  _aplicarTema(modo);
});

// Aplica el tema cargado al iniciar la app.
_aplicarTema(themeNotifier.value);

export function alternarTema() {
  themeNotifier.value = esOscuroActual() ? 'light' : 'dark';
}

export function esOscuroActual() {
  return themeNotifier.value === 'dark' ||
    (themeNotifier.value === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
}