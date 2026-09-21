// ═════════════════════════════════════════════════════════════════
// notifier.js
//
// Mini equivalente de ValueNotifier de Flutter para JS vanilla.
// Guarda un valor y notifica a quien esté escuchando cuando cambia.
//
// Uso:
//   const tema = new Notifier('dark');
//   tema.listen((valor) => console.log('Tema cambió a', valor));
//   tema.value = 'light'; // dispara el listener automáticamente
// ═════════════════════════════════════════════════════════════════

export class Notifier {
  #value;
  #listeners = new Set();

  constructor(valorInicial) {
    this.#value = valorInicial;
  }

  get value() {
    return this.#value;
  }

  set value(nuevoValor) {
    if (this.#value === nuevoValor) return; // evita notificar sin cambio real
    this.#value = nuevoValor;
    this.#listeners.forEach((fn) => fn(this.#value));
  }

  /// Suscribe una función que se llama cada vez que [value] cambia.
  /// Devuelve una función para des-suscribirse.
  listen(fn) {
    this.#listeners.add(fn);
    return () => this.#listeners.delete(fn);
  }
}