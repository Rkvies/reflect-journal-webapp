export interface LanguageOption {
  code: string;         // BCP-47 speech recognition locale code e.g. 'en-US'
  langName: string;     // English display name for AI prompt e.g. 'Spanish'
  nativeName: string;   // Native display name e.g. 'Español'
  flag: string;         // Flag emoji
}

export const SUPPORTED_LANGUAGES: LanguageOption[] = [
  { code: 'en-US', langName: 'English (US)', nativeName: 'English (US)', flag: '🇺🇸' },
  { code: 'en-GB', langName: 'English (UK)', nativeName: 'English (UK)', flag: '🇬🇧' },
  { code: 'es-ES', langName: 'Spanish (Spain)', nativeName: 'Español (España)', flag: '🇪🇸' },
  { code: 'es-MX', langName: 'Spanish (Mexico)', nativeName: 'Español (México)', flag: '🇲🇽' },
  { code: 'fr-FR', langName: 'French', nativeName: 'Français', flag: '🇫🇷' },
  { code: 'de-DE', langName: 'German', nativeName: 'Deutsch', flag: '🇩🇪' },
  { code: 'zh-CN', langName: 'Mandarin Chinese (Simplified)', nativeName: '中文 (简体)', flag: '🇨🇳' },
  { code: 'zh-TW', langName: 'Mandarin Chinese (Traditional)', nativeName: '中文 (繁體)', flag: '🇹🇼' },
  { code: 'hi-IN', langName: 'Hindi', nativeName: 'हिन्दी', flag: '🇮🇳' },
  { code: 'ja-JP', langName: 'Japanese', nativeName: '日本語', flag: '🇯🇵' },
  { code: 'pt-BR', langName: 'Portuguese (Brazil)', nativeName: 'Português (Brasil)', flag: '🇧🇷' },
  { code: 'pt-PT', langName: 'Portuguese (Portugal)', nativeName: 'Português (Portugal)', flag: '🇵🇹' },
  { code: 'ar-SA', langName: 'Arabic', nativeName: 'العربية', flag: '🇸🇦' },
  { code: 'it-IT', langName: 'Italian', nativeName: 'Italiano', flag: '🇮🇹' },
  { code: 'ko-KR', langName: 'Korean', nativeName: '한국어', flag: '🇰🇷' },
  { code: 'ru-RU', langName: 'Russian', nativeName: 'Русский', flag: '🇷🇺' },
  { code: 'ta-IN', langName: 'Tamil', nativeName: 'தமிழ்', flag: '🇮🇳' },
  { code: 'te-IN', langName: 'Telugu', nativeName: 'తెలుగు', flag: '🇮🇳' },
  { code: 'bn-IN', langName: 'Bengali', nativeName: 'বাংলা', flag: '🇮🇳' },
  { code: 'mr-IN', langName: 'Marathi', nativeName: 'मराठी', flag: '🇮🇳' },
  { code: 'vi-VN', langName: 'Vietnamese', nativeName: 'Tiếng Việt', flag: '🇻🇳' },
  { code: 'nl-NL', langName: 'Dutch', nativeName: 'Nederlands', flag: '🇳🇱' },
  { code: 'tr-TR', langName: 'Turkish', nativeName: 'Türkçe', flag: '🇹🇷' },
  { code: 'pl-PL', langName: 'Polish', nativeName: 'Polski', flag: '🇵🇱' },
  { code: 'uk-UA', langName: 'Ukrainian', nativeName: 'Українська', flag: '🇺🇦' },
  { code: 'sv-SE', langName: 'Swedish', nativeName: 'Svenska', flag: '🇸🇪' },
];

export function getLanguageByCode(code: string): LanguageOption {
  return SUPPORTED_LANGUAGES.find(l => l.code === code) || SUPPORTED_LANGUAGES[0];
}
