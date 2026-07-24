// Utility to convert numbers to Spanish text in uppercase for legal contract documents

export function numberToWordsSpanish(n: number): string {
  const integerPart = Math.floor(Math.abs(n));
  if (integerPart === 0) return "CERO";

  const units = ["", "UN", "DOS", "TRES", "CUATRO", "CINCO", "SEIS", "SIETE", "OCHO", "NUEVE"];
  const teens = ["DIEZ", "ONCE", "DOCE", "TRECE", "CATORCE", "QUINCE", "DIECISÉIS", "DIECISIETE", "DIECIOCHO", "DIECINUEVE"];
  const tens = ["", "DIEZ", "VEINTE", "TREINTA", "CUARENTA", "CINCUENTA", "SESENTA", "SETENTA", "OCHENTA", "NOVENTA"];
  const hundreds = ["", "CIENTO", "DOSCIENTOS", "TRESCIENTOS", "CUATROCIENTOS", "QUINIENTOS", "SEISCIENTOS", "SETECIENTOS", "OCHOIENTOS", "NOVECIENTOS"];

  function processGroup(num: number): string {
    if (num === 0) return "";
    if (num === 100) return "CIEN";

    let str = "";
    const h = Math.floor(num / 100);
    const remainder = num % 100;

    if (h > 0) {
      str += hundreds[h] + " ";
    }

    if (remainder > 0) {
      if (remainder < 10) {
        str += units[remainder];
      } else if (remainder >= 10 && remainder < 20) {
        str += teens[remainder - 10];
      } else if (remainder === 20) {
        str += "VEINTE";
      } else if (remainder > 20 && remainder < 30) {
        str += "VEINTI" + units[remainder - 20];
      } else {
        const t = Math.floor(remainder / 10);
        const u = remainder % 10;
        str += tens[t];
        if (u > 0) {
          str += " Y " + units[u];
        }
      }
    }

    return str.trim();
  }

  if (integerPart >= 1000000) {
    const millions = Math.floor(integerPart / 1000000);
    const rest = integerPart % 1000000;
    const millPrefix = millions === 1 ? "UN MILLÓN" : `${processGroup(millions)} MILLONES`;
    return rest > 0 ? `${millPrefix} ${numberToWordsSpanish(rest)}` : millPrefix;
  }

  if (integerPart >= 1000) {
    const thousands = Math.floor(integerPart / 1000);
    const rest = integerPart % 1000;
    const thousPrefix = thousands === 1 ? "MIL" : `${processGroup(thousands)} MIL`;
    return rest > 0 ? `${thousPrefix} ${processGroup(rest)}` : thousPrefix;
  }

  return processGroup(integerPart);
}
