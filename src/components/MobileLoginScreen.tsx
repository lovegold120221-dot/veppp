import { useState } from 'react';
import { Volume2, Command, Loader2, Globe } from 'lucide-react';
import { motion } from 'motion/react';
import { browserPopupRedirectResolver, GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { auth } from '../firebase';
import './styles/MobileLoginScreen.css';

// Comprehensive language list for VEP voice assistant
const LANGUAGES = [
  { code: 'nl', name: 'Dutch (Flemish)', flag: '🇳🇱' },
  { code: 'ab', name: 'Abkhaz', flag: '🇬🇪' },
  { code: 'ace', name: 'Acehnese', flag: '🇮🇩' },
  { code: 'ach', name: 'Acholi', flag: '🇺🇬' },
  { code: 'aa', name: 'Afar', flag: '🇩🇯' },
  { code: 'af', name: 'Afrikaans', flag: '🇿🇦' },
  { code: 'sq', name: 'Albanian', flag: '🇦🇱' },
  { code: 'alz', name: 'Alur', flag: '🇺🇬' },
  { code: 'am', name: 'Amharic', flag: '🇪🇹' },
  { code: 'ar', name: 'Arabic', flag: '🇸🇦' },
  { code: 'hy', name: 'Armenian', flag: '🇦🇲' },
  { code: 'as', name: 'Assamese', flag: '🇮🇳' },
  { code: 'av', name: 'Avar', flag: '🇷🇺' },
  { code: 'awa', name: 'Awadhi', flag: '🇮🇳' },
  { code: 'ay', name: 'Aymara', flag: '🇧🇴' },
  { code: 'az', name: 'Azerbaijani', flag: '🇦🇿' },
  { code: 'ban', name: 'Balinese', flag: '🇮🇩' },
  { code: 'bal', name: 'Baluchi', flag: '🇵🇰' },
  { code: 'bm', name: 'Bambara', flag: '🇲🇱' },
  { code: 'bci', name: 'Baoulé', flag: '🇨🇮' },
  { code: 'ba', name: 'Bashkir', flag: '🇷🇺' },
  { code: 'eu', name: 'Basque', flag: '🇪🇸' },
  { code: 'btx', name: 'Batak Karo', flag: '🇮🇩' },
  { code: 'tsm', name: 'Batak Simalungun', flag: '🇮🇩' },
  { code: 'bbc', name: 'Batak Toba', flag: '🇮🇩' },
  { code: 'be', name: 'Belarusian', flag: '🇧🇾' },
  { code: 'bem', name: 'Bemba', flag: '🇿🇲' },
  { code: 'bn', name: 'Bengali', flag: '🇧🇩' },
  { code: 'bew', name: 'Betawi', flag: '🇮🇩' },
  { code: 'bho', name: 'Bhojpuri', flag: '🇮🇳' },
  { code: 'bcl', name: 'Bikol', flag: '🇵🇭' },
  { code: 'bs', name: 'Bosnian', flag: '🇧🇦' },
  { code: 'br', name: 'Breton', flag: '🇫🇷' },
  { code: 'bg', name: 'Bulgarian', flag: '🇧🇬' },
  { code: 'bua', name: 'Buryat', flag: '🇷🇺' },
  { code: 'yue', name: 'Cantonese', flag: '🇭🇰' },
  { code: 'ca', name: 'Catalan', flag: '🇪🇸' },
  { code: 'ceb', name: 'Cebuano', flag: '🇵🇭' },
  { code: 'ch', name: 'Chamorro', flag: '🇬🇺' },
  { code: 'ce', name: 'Chechen', flag: '🇷🇺' },
  { code: 'ny', name: 'Chichewa', flag: '🇲🇼' },
  { code: 'zh', name: 'Chinese (Simplified)', flag: '🇨🇳' },
  { code: 'zh-TW', name: 'Chinese (Traditional)', flag: '🇹🇼' },
  { code: 'chk', name: 'Chuukese', flag: '🇫🇲' },
  { code: 'cv', name: 'Chuvash', flag: '🇷🇺' },
  { code: 'co', name: 'Corsican', flag: '🇫🇷' },
  { code: 'crh-Cyrl', name: 'Crimean Tatar (Cyrillic)', flag: '🇷🇺' },
  { code: 'crh-Latn', name: 'Crimean Tatar (Latin)', flag: '🇺🇦' },
  { code: 'hr', name: 'Croatian', flag: '🇭🇷' },
  { code: 'cs', name: 'Czech', flag: '🇨🇿' },
  { code: 'da', name: 'Danish', flag: '🇩🇰' },
  { code: 'prs', name: 'Dari', flag: '🇦🇫' },
  { code: 'dv', name: 'Dhivehi', flag: '🇲🇻' },
  { code: 'din', name: 'Dinka', flag: '🇸🇸' },
  { code: 'doi', name: 'Dogri', flag: '🇮🇳' },
  { code: 'dov', name: 'Dombe', flag: '🇲🇿' },
  { code: 'nl-BE', name: 'Dutch (Flemish)', flag: '🇧🇪' },
  { code: 'dyu', name: 'Dyula', flag: '🇨🇮' },
  { code: 'dz', name: 'Dzongkha', flag: '🇧🇹' },
  { code: 'en', name: 'English', flag: '🇬🇧' },
  { code: 'eo', name: 'Esperanto', flag: '🌍' },
  { code: 'et', name: 'Estonian', flag: '🇪🇪' },
  { code: 'ee', name: 'Ewe', flag: '🇬🇭' },
  { code: 'fo', name: 'Faroese', flag: '🇫🇴' },
  { code: 'fj', name: 'Fijian', flag: '🇫🇯' },
  { code: 'fil', name: 'Filipino', flag: '🇵🇭' },
  { code: 'fi', name: 'Finnish', flag: '🇫🇮' },
  { code: 'fon', name: 'Fon', flag: '🇧🇯' },
  { code: 'fr', name: 'French', flag: '🇫🇷' },
  { code: 'fr-CA', name: 'French (Canada)', flag: '🇨🇦' },
  { code: 'fy', name: 'Frisian', flag: '🇳🇱' },
  { code: 'fur', name: 'Friulian', flag: '🇮🇹' },
  { code: 'ff', name: 'Fulani', flag: '🌍' },
  { code: 'gaa', name: 'Ga', flag: '🇬🇭' },
  { code: 'gl', name: 'Galician', flag: '🇪🇸' },
  { code: 'ka', name: 'Georgian', flag: '🇬🇪' },
  { code: 'de', name: 'German', flag: '🇩🇪' },
  { code: 'el', name: 'Greek', flag: '🇬🇷' },
  { code: 'gn', name: 'Guarani', flag: '🇵🇾' },
  { code: 'gu', name: 'Gujarati', flag: '🇮🇳' },
  { code: 'ht', name: 'Haitian Creole', flag: '🇭🇹' },
  { code: 'cnh', name: 'Hakha Chin', flag: '🇲🇲' },
  { code: 'ha', name: 'Hausa', flag: '🇳🇬' },
  { code: 'haw', name: 'Hawaiian', flag: '🇺🇸' },
  { code: 'he', name: 'Hebrew', flag: '🇮🇱' },
  { code: 'hil', name: 'Hiligaynon', flag: '🇵🇭' },
  { code: 'hi', name: 'Hindi', flag: '🇮🇳' },
  { code: 'hmn', name: 'Hmong', flag: '🇨🇳' },
  { code: 'hu', name: 'Hungarian', flag: '🇭🇺' },
  { code: 'hrx', name: 'Hunsrik', flag: '🇧🇷' },
  { code: 'iba', name: 'Iban', flag: '🇲🇾' },
  { code: 'is', name: 'Icelandic', flag: '🇮🇸' },
  { code: 'ig', name: 'Igbo', flag: '🇳🇬' },
  { code: 'ilo', name: 'Ilocano', flag: '🇵🇭' },
  { code: 'id', name: 'Indonesian', flag: '🇮🇩' },
  { code: 'iu-Latn', name: 'Inuktut (Latin)', flag: '🇨🇦' },
  { code: 'iu', name: 'Inuktut (Syllabics)', flag: '🇨🇦' },
  { code: 'ga', name: 'Irish', flag: '🇮🇪' },
  { code: 'it', name: 'Italian', flag: '🇮🇹' },
  { code: 'jam', name: 'Jamaican Patois', flag: '🇯🇲' },
  { code: 'ja', name: 'Japanese', flag: '🇯🇵' },
  { code: 'jv', name: 'Javanese', flag: '🇮🇩' },
  { code: 'kac', name: 'Jingpo', flag: '🇲🇲' },
  { code: 'kl', name: 'Kalaallisut', flag: '🇬🇱' },
  { code: 'kn', name: 'Kannada', flag: '🇮🇳' },
  { code: 'kr', name: 'Kanuri', flag: '🇳🇬' },
  { code: 'pam', name: 'Kapampangan', flag: '🇵🇭' },
  { code: 'kk', name: 'Kazakh', flag: '🇰🇿' },
  { code: 'kha', name: 'Khasi', flag: '🇮🇳' },
  { code: 'km', name: 'Khmer', flag: '🇰🇭' },
  { code: 'cgg', name: 'Kiga', flag: '🇺🇬' },
  { code: 'kg', name: 'Kikongo', flag: '🇨🇩' },
  { code: 'rw', name: 'Kinyarwanda', flag: '🇷🇼' },
  { code: 'ktu', name: 'Kituba', flag: '🇨🇩' },
  { code: 'trp', name: 'Kokborok', flag: '🇮🇳' },
  { code: 'kv', name: 'Komi', flag: '🇷🇺' },
  { code: 'kok', name: 'Konkani', flag: '🇮🇳' },
  { code: 'ko', name: 'Korean', flag: '🇰🇷' },
  { code: 'kri', name: 'Krio', flag: '🇸🇱' },
  { code: 'ku', name: 'Kurdish (Kurmanji)', flag: '🇹🇷' },
  { code: 'ckb', name: 'Kurdish (Sorani)', flag: '🇮🇶' },
  { code: 'ky', name: 'Kyrgyz', flag: '🇰🇬' },
  { code: 'lo', name: 'Lao', flag: '🇱🇦' },
  { code: 'ltg', name: 'Latgalian', flag: '🇱🇻' },
  { code: 'la', name: 'Latin', flag: '🏛️' },
  { code: 'lv', name: 'Latvian', flag: '🇱🇻' },
  { code: 'lij', name: 'Ligurian', flag: '🇮🇹' },
  { code: 'li', name: 'Limburgish', flag: '🇳🇱' },
  { code: 'ln', name: 'Lingala', flag: '🇨🇩' },
  { code: 'lt', name: 'Lithuanian', flag: '🇱🇹' },
  { code: 'lmo', name: 'Lombard', flag: '🇮🇹' },
  { code: 'lg', name: 'Luganda', flag: '🇺🇬' },
  { code: 'luo', name: 'Luo', flag: '🇰🇪' },
  { code: 'lb', name: 'Luxembourgish', flag: '🇱🇺' },
  { code: 'mk', name: 'Macedonian', flag: '🇲🇰' },
  { code: 'mad', name: 'Madurese', flag: '🇮🇩' },
  { code: 'mai', name: 'Maithili', flag: '🇮🇳' },
  { code: 'mak', name: 'Makassar', flag: '🇮🇩' },
  { code: 'mg', name: 'Malagasy', flag: '🇲🇬' },
  { code: 'ms', name: 'Malay', flag: '🇲🇾' },
  { code: 'ms-Arab', name: 'Malay (Jawi)', flag: '🇲🇾' },
  { code: 'ml', name: 'Malayalam', flag: '🇮🇳' },
  { code: 'mt', name: 'Maltese', flag: '🇲🇹' },
  { code: 'mam', name: 'Mam', flag: '🇬🇹' },
  { code: 'gv', name: 'Manx', flag: '🇮🇲' },
  { code: 'mi', name: 'Maori', flag: '🇳🇿' },
  { code: 'mr', name: 'Marathi', flag: '🇮🇳' },
  { code: 'mh', name: 'Marshallese', flag: '🇲🇭' },
  { code: 'mwr', name: 'Marwadi', flag: '🇮🇳' },
  { code: 'mfe', name: 'Mauritian Creole', flag: '🇲🇺' },
  { code: 'mhr', name: 'Meadow Mari', flag: '🇷🇺' },
  { code: 'mni', name: 'Meiteilon (Manipuri)', flag: '🇮🇳' },
  { code: 'min', name: 'Minang', flag: '🇮🇩' },
  { code: 'lus', name: 'Mizo', flag: '🇮🇳' },
  { code: 'mn', name: 'Mongolian', flag: '🇲🇳' },
  { code: 'my', name: 'Myanmar (Burmese)', flag: '🇲🇲' },
  { code: 'nhe', name: 'Nahuatl', flag: '🇲🇽' },
  { code: 'nd', name: 'Ndau', flag: '🇿🇼' },
  { code: 'nr', name: 'Ndebele (South)', flag: '🇿🇦' },
  { code: 'new', name: 'Nepalbhasa (Newari)', flag: '🇳🇵' },
  { code: 'ne', name: 'Nepali', flag: '🇳🇵' },
  { code: 'nqo', name: 'NKo', flag: '🇬🇳' },
  { code: 'no', name: 'Norwegian', flag: '🇳🇴' },
  { code: 'nus', name: 'Nuer', flag: '🇸🇸' },
  { code: 'oc', name: 'Occitan', flag: '🇫🇷' },
  { code: 'or', name: 'Odia (Oriya)', flag: '🇮🇳' },
  { code: 'om', name: 'Oromo', flag: '🇪🇹' },
  { code: 'os', name: 'Ossetian', flag: '🇬🇪' },
  { code: 'pag', name: 'Pangasinan', flag: '🇵🇭' },
  { code: 'pap', name: 'Papiamento', flag: '🇨🇼' },
  { code: 'ps', name: 'Pashto', flag: '🇦🇫' },
  { code: 'fa', name: 'Persian', flag: '🇮🇷' },
  { code: 'pl', name: 'Polish', flag: '🇵🇱' },
  { code: 'pt-BR', name: 'Portuguese (Brazil)', flag: '🇧🇷' },
  { code: 'pt', name: 'Portuguese (Portugal)', flag: '🇵🇹' },
  { code: 'pa', name: 'Punjabi (Gurmukhi)', flag: '🇮🇳' },
  { code: 'pa-Arab', name: 'Punjabi (Shahmukhi)', flag: '🇵🇰' },
  { code: 'qu', name: 'Quechua', flag: '🇵🇪' },
  { code: 'kek', name: "Q'eqchi'", flag: '🇬🇹' },
  { code: 'rom', name: 'Romani', flag: '🌍' },
  { code: 'ro', name: 'Romanian', flag: '🇷🇴' },
  { code: 'rn', name: 'Rundi', flag: '🇧🇮' },
  { code: 'ru', name: 'Russian', flag: '🇷🇺' },
  { code: 'se', name: 'Sami (North)', flag: '🇳🇴' },
  { code: 'sm', name: 'Samoan', flag: '🇼🇸' },
  { code: 'sg', name: 'Sango', flag: '🇨🇫' },
  { code: 'sa', name: 'Sanskrit', flag: '🇮🇳' },
  { code: 'sat', name: 'Santali (Latin)', flag: '🇮🇳' },
  { code: 'sat-Olck', name: 'Santali (Ol Chiki)', flag: '🇮🇳' },
  { code: 'gd', name: 'Scots Gaelic', flag: '🏴󠁧󠁢󠁳󠁣󠁴󠁿' },
  { code: 'nso', name: 'Sepedi', flag: '🇿🇦' },
  { code: 'sr', name: 'Serbian', flag: '🇷🇸' },
  { code: 'st', name: 'Sesotho', flag: '🇱🇸' },
  { code: 'crs', name: 'Seychellois Creole', flag: '🇸🇨' },
  { code: 'shn', name: 'Shan', flag: '🇲🇲' },
  { code: 'sn', name: 'Shona', flag: '🇿🇼' },
  { code: 'scn', name: 'Sicilian', flag: '🇮🇹' },
  { code: 'szl', name: 'Silesian', flag: '🇵🇱' },
  { code: 'sd', name: 'Sindhi', flag: '🇵🇰' },
  { code: 'si', name: 'Sinhala', flag: '🇱🇰' },
  { code: 'sk', name: 'Slovak', flag: '🇸🇰' },
  { code: 'sl', name: 'Slovenian', flag: '🇸🇮' },
  { code: 'so', name: 'Somali', flag: '🇸🇴' },
  { code: 'es', name: 'Spanish', flag: '🇪🇸' },
  { code: 'su', name: 'Sundanese', flag: '🇮🇩' },
  { code: 'sus', name: 'Susu', flag: '🇬🇳' },
  { code: 'sw', name: 'Swahili', flag: '🇹🇿' },
  { code: 'ss', name: 'Swati', flag: '🇸🇿' },
  { code: 'sv', name: 'Swedish', flag: '🇸🇪' },
  { code: 'ty', name: 'Tahitian', flag: '🇵🇫' },
  { code: 'tg', name: 'Tajik', flag: '🇹🇯' },
  { code: 'ber', name: 'Tamazight', flag: '🇲🇦' },
  { code: 'ber-Tfng', name: 'Tamazight (Tifinagh)', flag: '🇲🇦' },
  { code: 'ta', name: 'Tamil', flag: '🇮🇳' },
  { code: 'tt', name: 'Tatar', flag: '🇷🇺' },
  { code: 'te', name: 'Telugu', flag: '🇮🇳' },
  { code: 'tet', name: 'Tetum', flag: '🇹🇱' },
  { code: 'th', name: 'Thai', flag: '🇹🇭' },
  { code: 'bo', name: 'Tibetan', flag: '🇨🇳' },
  { code: 'ti', name: 'Tigrinya', flag: '🇪🇷' },
  { code: 'tiv', name: 'Tiv', flag: '🇳🇬' },
  { code: 'tpi', name: 'Tok Pisin', flag: '🇵🇬' },
  { code: 'to', name: 'Tongan', flag: '🇹🇴' },
  { code: 'lua', name: 'Tshiluba', flag: '🇨🇩' },
  { code: 'ts', name: 'Tsonga', flag: '🇿🇦' },
  { code: 'tn', name: 'Tswana', flag: '🇧🇼' },
  { code: 'tcy', name: 'Tulu', flag: '🇮🇳' },
  { code: 'tum', name: 'Tumbuka', flag: '🇲🇼' },
  { code: 'tr', name: 'Turkish', flag: '🇹🇷' },
  { code: 'tk', name: 'Turkmen', flag: '🇹🇲' },
  { code: 'tyv', name: 'Tuvan', flag: '🇷🇺' },
  { code: 'tw', name: 'Twi', flag: '🇬🇭' },
  { code: 'udm', name: 'Udmurt', flag: '🇷🇺' },
  { code: 'uk', name: 'Ukrainian', flag: '🇺🇦' },
  { code: 'ur', name: 'Urdu', flag: '🇵🇰' },
  { code: 'ug', name: 'Uyghur', flag: '🇨🇳' },
  { code: 'uz', name: 'Uzbek', flag: '🇺🇿' },
  { code: 've', name: 'Venda', flag: '🇿🇦' },
  { code: 'vec', name: 'Venetian', flag: '🇮🇹' },
  { code: 'vi', name: 'Vietnamese', flag: '🇻🇳' },
  { code: 'war', name: 'Waray', flag: '🇵🇭' },
  { code: 'cy', name: 'Welsh', flag: '🏴󠁧󠁢󠁷󠁬󠁳󠁿' },
  { code: 'wo', name: 'Wolof', flag: '🇸🇳' },
  { code: 'xh', name: 'Xhosa', flag: '🇿🇦' },
  { code: 'sah', name: 'Yakut', flag: '🇷🇺' },
  { code: 'yi', name: 'Yiddish', flag: '🇮🇱' },
  { code: 'yo', name: 'Yoruba', flag: '🇳🇬' },
  { code: 'yua', name: 'Yucatec Maya', flag: '🇲🇽' },
  { code: 'zap', name: 'Zapotec', flag: '🇲🇽' },
  { code: 'zu', name: 'Zulu', flag: '🇿🇦' },
];

interface MobileLoginScreenProps {
  onLogin: (user: any) => void;
  onStoreCredentials: (user: any, credential: any) => Promise<void>;
}

export default function MobileLoginScreen({ onLogin, onStoreCredentials }: MobileLoginScreenProps) {
  const [isLoading, setIsLoading] = useState(false);

  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    try {
      const provider = new GoogleAuthProvider();
      
      // Add only valid Google service scopes for the live agent
      const scopes = [
        'https://www.googleapis.com/auth/gmail.readonly',      // Gmail read access
        'https://www.googleapis.com/auth/gmail.send',          // Gmail send access
        'https://www.googleapis.com/auth/gmail.compose',       // Gmail compose
        'https://www.googleapis.com/auth/calendar.readonly',   // Calendar read access
        'https://www.googleapis.com/auth/calendar.events',      // Calendar events management
        'https://www.googleapis.com/auth/drive.readonly',       // Drive read access
        'https://www.googleapis.com/auth/drive.file',           // Drive file access
        'https://www.googleapis.com/auth/spreadsheets.readonly', // Sheets read access
        'https://www.googleapis.com/auth/spreadsheets',         // Sheets full access
        'https://www.googleapis.com/auth/documents.readonly',    // Docs read access
        'https://www.googleapis.com/auth/documents',            // Docs full access
        'https://www.googleapis.com/auth/youtube.readonly',      // YouTube read access
        'https://www.googleapis.com/auth/youtube.upload',        // YouTube upload
        'https://www.googleapis.com/auth/analytics.readonly',   // Analytics read access
        'https://www.googleapis.com/auth/contacts.readonly',    // Contacts read access
        'https://www.googleapis.com/auth/tasks',                 // Tasks
        'https://www.googleapis.com/auth/photos.readonly',       // Photos read access
        'https://www.googleapis.com/auth/cloud-platform',        // Cloud Platform
        'https://www.googleapis.com/auth/cloud-billing',        // Cloud Billing
        'https://www.googleapis.com/auth/firebase',              // Firebase
        'https://www.googleapis.com/auth/sqlservice',           // Cloud SQL
        'https://www.googleapis.com/auth/sqlservice.admin',      // Cloud SQL Admin
        'https://www.googleapis.com/auth/bigquery',              // BigQuery
        'https://www.googleapis.com/auth/bigquery.readonly',     // BigQuery read-only
        'https://www.googleapis.com/auth/logging.read',          // Cloud Logging read-only
        'https://www.googleapis.com/auth/monitoring',           // Cloud Monitoring
        'https://www.googleapis.com/auth/monitoring.read',      // Cloud Monitoring read-only
        'https://www.googleapis.com/auth/trace.append',         // Cloud Trace
        'https://www.googleapis.com/auth/cloudruntimeconfig',    // Cloud Runtime Config
        'https://www.googleapis.com/auth/devstorage.full_control', // Cloud Storage full control
        'https://www.googleapis.com/auth/fitness.activity.read', // Fitness activity
        'https://www.googleapis.com/auth/fitness.body.read',     // Fitness body
        'https://www.googleapis.com/auth/photoslibrary',          // Photos Library
        'https://www.googleapis.com/auth/photoslibrary.readonly', // Photos Library read-only
        'https://www.googleapis.com/auth/forms',                 // Forms
        'https://www.googleapis.com/auth/forms.body',            // Forms body
        'https://www.googleapis.com/auth/chat.messages',         // Chat messages
        'https://www.googleapis.com/auth/chat.spaces',           // Chat spaces
        'https://www.googleapis.com/auth/chat.memberships',      // Chat memberships
        'https://www.googleapis.com/auth/userinfo.email',         // User email
        'https://www.googleapis.com/auth/userinfo.profile'        // User profile
      ];
      
      scopes.forEach(scope => {
        provider.addScope(scope);
      });
      
      // Set custom parameters for better UX
      provider.setCustomParameters({
        prompt: 'consent', // Force consent screen to show all permissions
        access_type: 'offline' // Get refresh token for long-lived access
      });
      
      const result = await signInWithPopup(auth, provider, browserPopupRedirectResolver);
      
      // Store Google credentials for live agent use
      if (result.user) {
        // Get the OAuth credential from the result
        const credential = GoogleAuthProvider.credentialFromResult(result);
        if (credential) {
          await onStoreCredentials(result.user, credential);
        }
        onLogin(result.user);
      }
    } catch (error) {
      console.error('Google sign-in error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="mobile-login-screen">
      <div className="hardware-grid" />
      <div className="ambient-glow" />
      
      <div className="status-bar">
        <span>12:03 AM</span>
        <div className="signal-bars">
          <div className="signal-bar signal-bar-1">
            <div className="signal-bar-fill"></div>
          </div>
          <div className="signal-bar signal-bar-2">
            <div className="signal-bar-fill"></div>
          </div>
          <div className="signal-bar signal-bar-3">
            <div className="signal-bar-fill"></div>
          </div>
        </div>
      </div>
      
      <div className="login-content">
        <motion.div 
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="logo-container"
        >
          <div className="logo-inner">
            <Volume2 className="w-10 h-10 text-amber-500" />
          </div>
          <div className="logo-badge">
            <Command className="w-4 h-4 text-black" />
          </div>
        </motion.div>
        
        <h1 className="app-title">Vep</h1>
        <p className="app-subtitle">
          Powered by Aoede Persona
        </p>
        
        <div className="login-button-container">
          <button 
            onClick={handleGoogleSignIn}
            disabled={isLoading}
            className="login-button"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Initializing...
              </>
            ) : (
              'Initialize Vep Identity'
            )}
          </button>
        </div>
        
        <div className="service-icons">
          <img src="https://www.gstatic.com/images/branding/product/2x/gmail_64dp.png" className="service-icon" alt="G" />
          <img src="https://www.gstatic.com/images/branding/product/2x/calendar_64dp.png" className="service-icon" alt="C" />
          <img src="https://www.gstatic.com/images/branding/product/2x/drive_64dp.png" className="service-icon" alt="D" />
          <img src="https://www.gstatic.com/images/branding/product/2x/sheets_64dp.png" className="service-icon" alt="S" />
        </div>
      </div>
    </div>
  );
}
