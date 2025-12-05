// Ya no necesitamos importar la API de Google ya que usaremos frases locales
// import { GoogleGenAI } from "@google/genai";

const RABBIT_QUOTES = [
  "La paz viene de tu madriguera interior, no la busques en otro prado",
  "Si un conejo puede estar tranquilo siendo presa, tú también puedes.",
  "La calma es tu superpoder, úsala antes de que se te acabe.",
  "No eres una tortuga, pero respira despacio por un rato.",
  "Menos estrés, más oxígeno. Es gratis.",
  "La zanahoria de la paz está dentro de ti.",
  "Controla tu respiración y controlarás hasta tus ganas de gritar.",
  "Hoy es un buen día para hacer unas buenas respiraciones",
  "Tu mente es un jardín, deja de regar las malas hierbas.",
  "Respira. Es lo único que tienes que hacer bien ahora mismo.",
  "Sé como el aire: fluye y no te choques con los muebles.",
  "Oxigena ese cerebro, que lo vas a necesitar.",
  "Un conejo sabio dijo una vez: respira, respira... relaja.",
  "No te ahogues en un vaso de agua, mejor bébetelo después.",
  "Date un atracón de buenas respiraciones hoy",
  "Eres más fuerte que tus excusas para no relajarte.",
  "Dale a tu cuerpo la gasolina premium: O2.",
  "Silencia el ruido, sube el volumen a tus pulmones.",
  "Esto es mejor (y más barato) que un café doble.",
  "Sal de la madriguera, entra en tu vida.",
  "El sabio apuntó a la zanahoria y el necio miro al dedo.",
  "La madriguera está en tu pecho: entra y descansa.",
  "Si el conejo no pierde la calma, ¿por qué deberías hacerlo tú?",
  "El aire es gratis, pero vale más que cualquier lujo",
  "Primero respira, luego come zanahorias, no al reves.",
  "Las zanahorias se acaban, pero la calma siempre está disponible.",
  "No saltes hacia el pasado ni corras al futuro, respira en tu madriguera ahora.",
  "Tu mente es tu jardín: si piensas en calma, florecen zanahorias",
  "Miles de respiraciones pueden empezar con una sola inhalación, y tu aire no se agotará",
  "La raíz del estrés es aferrarse a la madriguera equivocada.",
  "La vida es un salto tras otro, no una sola zanahoria.",
  "Un conejo tranquilo encuentra más zanahorias que uno nervioso.",
  "Tres cosas no pueden ocultarse: el sol, la luna y tu necesidad de respirar."
];

const ZEN_RABBIT_KOANS = [
  "El maestro dijo: 'Si te encuentras con el Buda, ofrécele una zanahoria'. Tú te has encontrado contigo mismo.",
  "Tu mente era un mono saltando, ahora es un conejo descansando al sol. Eso es progreso.",
  "No es el viento lo que se mueve, ni la bandera... son tus orejas las que se han relajado.",
  "Antes de la iluminación: cortar leña y respirar. Después de la iluminación: cortar leña y respirar mejor.",
  "El vacío no es la nada, es el espacio donde cabe más oxígeno (y quizás un poco de alfalfa).",
  "Has soltado el apego al dióxido de carbono. Ahora suelta el apego a querer ser productivo.",
  "Forma es vacío, vacío es forma. Y tu cuerpo ahora es pura vibración zen.",
  "Un conejo no se preocupa por el invierno mientras mastica hoy. Tú has masticado el presente.",
  "El sonido de una sola oreja aplaudiendo es el silencio que sientes ahora mismo.",
  "Si no puedes encontrar la verdad justo donde estás, ¿dónde esperas encontrarla? ¿En la otra madriguera?",
  "El río fluye sin esfuerzo. Tu sangre fluye con oxígeno. Sé el río, no la piedra.",
  "Al final, todo es impermanente. Excepto la gloria de haber terminado esta sesión.",
  "Siéntate como una montaña, respira como el viento, come como si nadie te viera.",
  "El estrés es solo un pensamiento que no has exhalado todavía. Ya se fue.",
  "No busques huellas del buey, busca tu propia respiración. Ahí estabas todo el tiempo.",
  "El tazón está limpio. Tu mente está limpia. Ahora ve y ensúcialos con vida.",
  "Cuando camines, camina. Cuando comas, come. Cuando respires, no hagas nada más (como acabas de hacer).",
  "El gran camino no tiene puerta, pero tú acabas de entrar por la ventana de la nariz.",
  "El gran conejo ancestral estaría orgulloso de ti"
];

export const getMotivationalQuote = async (): Promise<string> => {
  const randomIndex = Math.floor(Math.random() * RABBIT_QUOTES.length);
  return RABBIT_QUOTES[randomIndex];
};

export const getSessionInsight = async (totalMinutes: number, rounds: number): Promise<string> => {
  // Ya no usamos la API, devolvemos un Koan Zen del Conejo
  const randomIndex = Math.floor(Math.random() * ZEN_RABBIT_KOANS.length);
  return ZEN_RABBIT_KOANS[randomIndex];
};