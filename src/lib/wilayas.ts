export interface Wilaya {
  code: string;       // e.g. "01", "16", "69"
  number: number;     // e.g. 1, 16, 69
  name: string;       // French/Latin name e.g. "Alger", "Messaad"
  nameAr: string;     // Arabic name e.g. "الجزائر", "مسعد"
}

export const ALGERIA_WILAYAS_69: Wilaya[] = [
  { code: "01", number: 1, name: "Adrar", nameAr: "أدرار" },
  { code: "02", number: 2, name: "Chlef", nameAr: "الشلف" },
  { code: "03", number: 3, name: "Laghouat", nameAr: "الأغواط" },
  { code: "04", number: 4, name: "Oum El Bouaghi", nameAr: "أم البواقي" },
  { code: "05", number: 5, name: "Batna", nameAr: "باتنة" },
  { code: "06", number: 6, name: "Béjaïa", nameAr: "بجاية" },
  { code: "07", number: 7, name: "Biskra", nameAr: "بسكرة" },
  { code: "08", number: 8, name: "Béchar", nameAr: "بشار" },
  { code: "09", number: 9, name: "Blida", nameAr: "البليدة" },
  { code: "10", number: 10, name: "Bouira", nameAr: "البويرة" },
  { code: "11", number: 11, name: "Tamanrasset", nameAr: "تمنراست" },
  { code: "12", number: 12, name: "Tébessa", nameAr: "تبسة" },
  { code: "13", number: 13, name: "Tlemcen", nameAr: "تلمسان" },
  { code: "14", number: 14, name: "Tiaret", nameAr: "تيارت" },
  { code: "15", number: 15, name: "Tizi Ouzou", nameAr: "تيزي وزو" },
  { code: "16", number: 16, name: "Alger", nameAr: "الجزائر" },
  { code: "17", number: 17, name: "Djelfa", nameAr: "الجلفة" },
  { code: "18", number: 18, name: "Jijel", nameAr: "جيجل" },
  { code: "19", number: 19, name: "Sétif", nameAr: "سطيف" },
  { code: "20", number: 20, name: "Saïda", nameAr: "سعيدة" },
  { code: "21", number: 21, name: "Skikda", nameAr: "سكيكدة" },
  { code: "22", number: 22, name: "Sidi Bel Abbès", nameAr: "سيدي بلعباس" },
  { code: "23", number: 23, name: "Annaba", nameAr: "عنابة" },
  { code: "24", number: 24, name: "Guelma", nameAr: "قالمة" },
  { code: "25", number: 25, name: "Constantine", nameAr: "قسنطينة" },
  { code: "26", number: 26, name: "Médéa", nameAr: "المدية" },
  { code: "27", number: 27, name: "Mostaganem", nameAr: "مستغانم" },
  { code: "28", number: 28, name: "M'Sila", nameAr: "المسيلة" },
  { code: "29", number: 29, name: "Mascara", nameAr: "معسكر" },
  { code: "30", number: 30, name: "Ouargla", nameAr: "ورقلة" },
  { code: "31", number: 31, name: "Oran", nameAr: "وهران" },
  { code: "32", number: 32, name: "El Bayadh", nameAr: "البيض" },
  { code: "33", number: 33, name: "Illizi", nameAr: "إليزي" },
  { code: "34", number: 34, name: "Bordj Bou Arreridj", nameAr: "برج بوعريريج" },
  { code: "35", number: 35, name: "Boumerdès", nameAr: "بومرداس" },
  { code: "36", number: 36, name: "El Tarf", nameAr: "الطارف" },
  { code: "37", number: 37, name: "Tindouf", nameAr: "تندوف" },
  { code: "38", number: 38, name: "Tissemsilt", nameAr: "تيسمسيلت" },
  { code: "39", number: 39, name: "El Oued", nameAr: "الوادي" },
  { code: "40", number: 40, name: "Khenchela", nameAr: "خنشلة" },
  { code: "41", number: 41, name: "Souk Ahras", nameAr: "سوق أهراس" },
  { code: "42", number: 42, name: "Tipaza", nameAr: "تيبازة" },
  { code: "43", number: 43, name: "Mila", nameAr: "ميلة" },
  { code: "44", number: 44, name: "Aïn Defla", nameAr: "عين الدفلى" },
  { code: "45", number: 45, name: "Naâma", nameAr: "النعامة" },
  { code: "46", number: 46, name: "Aïn Témouchent", nameAr: "عين تموشنت" },
  { code: "47", number: 47, name: "Ghardaïa", nameAr: "غرداية" },
  { code: "48", number: 48, name: "Relizane", nameAr: "غليزان" },
  { code: "49", number: 49, name: "Timimoun", nameAr: "تيميمون" },
  { code: "50", number: 50, name: "Bordj Badji Mokhtar", nameAr: "برج باجي مختار" },
  { code: "51", number: 51, name: "Ouled Djellal", nameAr: "أولاد جلال" },
  { code: "52", number: 52, name: "Béni Abbès", nameAr: "بني عباس" },
  { code: "53", number: 53, name: "In Salah", nameAr: "عين صالح" },
  { code: "54", number: 54, name: "In Guezzam", nameAr: "عين قزام" },
  { code: "55", number: 55, name: "Touggourt", nameAr: "تقرت" },
  { code: "56", number: 56, name: "Djanet", nameAr: "جانت" },
  { code: "57", number: 57, name: "El M'Ghair", nameAr: "المغير" },
  { code: "58", number: 58, name: "El Meniaa", nameAr: "المنيعة" },
  { code: "59", number: 59, name: "Aflou", nameAr: "أفلو" },
  { code: "60", number: 60, name: "El Abiodh Sidi Cheikh", nameAr: "الأبيض سيدي الشيخ" },
  { code: "61", number: 61, name: "El Aricha", nameAr: "العريشة" },
  { code: "62", number: 62, name: "El Kantara", nameAr: "القنطرة" },
  { code: "63", number: 63, name: "Barika", nameAr: "بريكة" },
  { code: "64", number: 64, name: "Bou Saâda", nameAr: "بوسعادة" },
  { code: "65", number: 65, name: "Bir El Ater", nameAr: "بئر العاتر" },
  { code: "66", number: 66, name: "Ksar El Boukhari", nameAr: "قصر البخاري" },
  { code: "67", number: 67, name: "Ksar Chellala", nameAr: "قصر الشلالة" },
  { code: "68", number: 68, name: "Aïn Oussera", nameAr: "عين وسارة" },
  { code: "69", number: 69, name: "Messaad", nameAr: "مسعد" }
];

export const WILAYAS_LIST_NAMES = ALGERIA_WILAYAS_69.map((w) => `${w.code} - ${w.name}`);
export const WILAYA_NAMES_ONLY = ALGERIA_WILAYAS_69.map((w) => w.name);

export function getWilayaByCode(code: string | number): Wilaya | undefined {
  const codeStr = typeof code === "number" ? String(code).padStart(2, "0") : String(code).padStart(2, "0");
  return ALGERIA_WILAYAS_69.find((w) => w.code === codeStr);
}

export function getWilayaByName(name: string): Wilaya | undefined {
  if (!name) return undefined;
  const cleanName = name.toLowerCase().trim();
  return ALGERIA_WILAYAS_69.find(
    (w) =>
      w.name.toLowerCase() === cleanName ||
      w.nameAr === cleanName ||
      `${w.code} - ${w.name}`.toLowerCase() === cleanName
  );
}
