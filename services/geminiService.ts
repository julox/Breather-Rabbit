import { GoogleGenAI } from "@google/genai";

const apiKey = process.env.API_KEY;

const RABBIT_QUOTES = [
  "Inhala el futuro, exhala el drama.",
  "Si un conejo puede estar tranquilo siendo presa, tú también puedes.",
  "La calma es tu superpoder, úsala antes de que se te acabe.",
  "No eres una tortuga, pero respira despacio por un rato.",
  "Menos estrés, más oxígeno. Es gratis.",
  "La zanahoria de la paz está dentro de ti.",
  "Controla tu respiración y controlarás hasta tus ganas de gritar.",
  "Hoy es un buen día para no perder los nervios.",
  "Tu mente es un jardín, deja de regar las malas hierbas.",
  "Respira. Es lo único que tienes que hacer bien ahora mismo.",
  "El estrés no combina con tu outfit de hoy.",
  "Sé como el aire: fluye y no te choques con los muebles.",
  "Oxigena ese cerebro, que lo vas a necesitar.",
  "Un conejo sabio dijo una vez: snif, snif... relax.",
  "No te ahogues en un vaso de agua, mejor bébetelo después.",
  "La ansiedad miente, tu respiración no.",
  "Eres más fuerte que tus excusas para no relajarte.",
  "Dale a tu cuerpo la gasolina premium: O2.",
  "Silencia el ruido, sube el volumen a tus pulmones.",
  "Esto es mejor (y más barato) que un café doble."
];

export const getMotivationalQuote = async (): Promise<string> => {
  // Selecciona una frase aleatoria del array estático
  const randomIndex = Math.floor(Math.random() * RABBIT_QUOTES.length);
  return RABBIT_QUOTES[randomIndex];
};

export const getSessionInsight = async (totalMinutes: number, rounds: number): Promise<string> => {
  if (!apiKey) return "¡Gran sesión! Tu cuerpo y mente te lo agradecen.";

  try {
    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `El usuario acaba de completar ${rounds} rondas de respiración cíclica intensa (hiperventilación controlada y retención) en ${totalMinutes.toFixed(1)} minutos. Dale un consejo muy breve (max 20 palabras) sobre los beneficios que acaba de obtener. Tono científico pero con un toque simpático.`,
      config: {
        thinkingConfig: { thinkingBudget: 0 }
      }
    });

    return response.text.trim();
  } catch (error) {
    console.error("Error getting insight:", error);
    return "Has oxigenado tu cuerpo y reducido tus niveles de estrés. ¡Bien hecho!";
  }
};