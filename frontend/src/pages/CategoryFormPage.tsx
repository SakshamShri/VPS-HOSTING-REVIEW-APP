import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import { Input } from "../components/ui/input";
import { Textarea } from "../components/ui/textarea";
import { Label } from "../components/ui/label";
import { Switch } from "../components/ui/switch";
import { Button } from "../components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";
import { CategoryTypeSelector } from "../components/CategoryTypeSelector";
import { ParentCategorySelect } from "../components/ParentCategorySelect";
import { InheritedField } from "../components/InheritedField";
import { OverrideToggle } from "../components/OverrideToggle";
import type { CategoryNode } from "../types/category";
import type {
  CategoryFormMode,
  CategoryFormValues,
  InheritedStates,
  OverrideFlags,
  RegionScope,
  PsiParameter,
  ClaimRequirementField,
} from "../types/category.form.types";
import { editChildCategoryMock } from "../mocks/categoryEdit.mock";
import { ImpactPreviewModal } from "../components/ImpactPreviewModal";
import { impactPreviewMock } from "../mocks/impactPreview.mock";
import { createCategory, updateCategory, fetchParentCategories } from "../api/category.api";

type CategoryFormPageProps = {
  mode: CategoryFormMode;
};

type RegionCity = { value: string; label: string };
type RegionState = { value: string; label: string; cities: RegionCity[] };
type RegionCountry = { value: string; label: string; states: RegionState[] };

const INDIA_STATES_DISTRICTS: Record<string, string> = {
  // Keep this intentionally small for the UI demo
  "Rajasthan": "Jaipur|Jodhpur|Udaipur",
  "Maharashtra": "Mumbai|Pune|Nagpur",
  "Uttar Pradesh": "Lucknow|Kanpur|Varanasi",
  "Karnataka": "Bengaluru|Mysuru|Mangaluru",
};

const INDIA_REGION_RAW: Record<string, string[]> = Object.entries(INDIA_STATES_DISTRICTS).reduce(
  (acc, [state, districts]) => {
    acc[state] = districts.split("|");
    return acc;
  },
  {} as Record<string, string[]>
);

const slugify = (value: string): string =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .trim() || "item";

const buildIndiaRegion = (): RegionCountry => ({
  value: "INDIA",
  label: "India",
  states: Object.entries(INDIA_REGION_RAW).map(([state, cities]) => ({
    value: slugify(state) || state,
    label: state,
    cities: cities.map((city, idx) => ({
      value: `${slugify(city) || city}-${idx}`,
      label: city,
    })),
  })),
});

const REGION_DATA: Record<string, RegionCountry> = {
  INDIA: buildIndiaRegion(),
  BRAZIL: {
    value: "BRAZIL",
    label: "Brazil",
    states: [
      {
        value: "SP",
        label: "São Paulo",
        cities: [
          { value: "SAO", label: "São Paulo" },
          { value: "CMP", label: "Campinas" },
          { value: "SJC", label: "São José dos Campos" },
          { value: "SBC", label: "São Bernardo do Campo" },
        ],
      },
      {
        value: "RJ",
        label: "Rio de Janeiro",
        cities: [
          { value: "RIO", label: "Rio de Janeiro" },
          { value: "NIT", label: "Niterói" },
          { value: "PET", label: "Petrópolis" },
          { value: "NVA", label: "Nova Iguaçu" },
        ],
      },
      {
        value: "MG",
        label: "Minas Gerais",
        cities: [
          { value: "BHZ", label: "Belo Horizonte" },
          { value: "UDI", label: "Uberlândia" },
          { value: "JDF", label: "Juiz de Fora" },
          { value: "CNT", label: "Contagem" },
        ],
      },
      {
        value: "RS",
        label: "Rio Grande do Sul",
        cities: [
          { value: "POA", label: "Porto Alegre" },
          { value: "CXS", label: "Caxias do Sul" },
          { value: "PEL", label: "Pelotas" },
        ],
      },
      {
        value: "BA",
        label: "Bahia",
        cities: [
          { value: "SSA", label: "Salvador" },
          { value: "FSA", label: "Feira de Santana" },
          { value: "VDC", label: "Vitória da Conquista" },
        ],
      },
      {
        value: "PR",
        label: "Paraná",
        cities: [
          { value: "CWB", label: "Curitiba" },
          { value: "LDB", label: "Londrina" },
          { value: "MGA", label: "Maringá" },
        ],
      },
    ],
  },
};

const DEFAULT_COUNTRY = "INDIA";
const ALL_VALUE = "__ALL__";
/*
    "Pollachi",
    "Rajapalayam",
    "Sivakasi",
    "Pudukkottai",
    "Neyveli (TS)",
    "Nagapattinam",
    "Viluppuram",
    "Tiruchengode",
    "Vaniyambadi",
    "Theni Allinagaram",
    "Udhagamandalam",
    "Aruppukkottai",
    "Paramakudi",
    "Arakkonam",
    "Virudhachalam",
    "Srivilliputhur",
    "Tindivanam",
    "Virudhunagar",
    "Karur",
    "Valparai",
    "Sankarankovil",
    "Tenkasi",
    "Palani",
    "Pattukkottai",
    "Tirupathur",
    "Ramanathapuram",
    "Udumalaipettai",
    "Gobichettipalayam",
    "Thiruvarur",
    "Thiruvallur",
    "Panruti",
    "Namakkal",
    "Thirumangalam",
    "Vikramasingapuram",
    "Nellikuppam",
    "Rasipuram",
    "Tiruttani",
    "Nandivaram-Guduvancheri",
    "Periyakulam",
    "Pernampattu",
    "Vellakoil",
    "Sivaganga",
    "Vadalur",
    "Rameshwaram",
    "Tiruvethipuram",
    "Perambalur",
    "Usilampatti",
    "Vedaranyam",
    "Sathyamangalam",
    "Puliyankudi",
    "Nanjikottai",
    "Thuraiyur",
    "Sirkali",
    "Tiruchendur",
    "Periyasemur",
    "Sattur",
    "Vandavasi",
    "Tharamangalam",
    "Tirukkoyilur",
    "Oddanchatram",
    "Palladam",
    "Vadakkuvalliyur",
    "Tirukalukundram",
    "Uthamapalayam",
    "Surandai",
    "Sankari",
    "Shenkottai",
    "Vadipatti",
    "Sholingur",
    "Tirupathur",
    "Manachanallur",
    "Viswanatham",
    "Polur",
    "Panagudi",
    "Uthiramerur",
    "Thiruthuraipoondi",
    "Pallapatti",
    "Ponneri",
    "Lalgudi",
    "Natham",
    "Unnamalaikadai",
    "P.N.Patti",
    "Tharangambadi",
    "Tittakudi",
    "Pacode",
    "O' Valley",
    "Suriyampalayam",
    "Sholavandan",
    "Thammampatti",
    "Namagiripettai",
    "Peravurani",
    "Parangipettai",
    "Pudupattinam",
    "Pallikonda",
    "Sivagiri",
    "Punjaipugalur",
    "Padmanabhapuram",
    "Thirupuvanam",
  ],
  "Madhya Pradesh": [
    "Indore",
    "Bhopal",
    "Jabalpur",
    "Gwalior",
    "Ujjain",
    "Sagar",
    "Ratlam",
    "Satna",
    "Murwara (Katni)",
    "Morena",
    "Singrauli",
    "Rewa",
    "Vidisha",
    "Ganjbasoda",
    "Shivpuri",
    "Mandsaur",
    "Neemuch",
    "Nagda",
    "Itarsi",
    "Sarni",
    "Sehore",
    "Mhow Cantonment",
    "Seoni",
    "Balaghat",
    "Ashok Nagar",
    "Tikamgarh",
    "Shahdol",
    "Pithampur",
    "Alirajpur",
    "Mandla",
    "Sheopur",
    "Shajapur",
    "Panna",
    "Raghogarh-Vijaypur",
    "Sendhwa",
    "Sidhi",
    "Pipariya",
    "Shujalpur",
    "Sironj",
    "Pandhurna",
    "Nowgong",
    "Mandideep",
    "Sihora",
    "Raisen",
    "Lahar",
    "Maihar",
    "Sanawad",
    "Sabalgarh",
    "Umaria",
    "Porsa",
    "Narsinghgarh",
    "Malaj Khand",
    "Sarangpur",
    "Mundi",
    "Nepanagar",
    "Pasan",
    "Mahidpur",
    "Seoni-Malwa",
    "Rehli",
    "Manawar",
    "Rahatgarh",
    "Panagar",
    "Wara Seoni",
    "Tarana",
    "Sausar",
    "Rajgarh",
    "Niwari",
    "Mauganj",
    "Manasa",
    "Nainpur",
    "Prithvipur",
    "Sohagpur",
    "Nowrozabad (Khodargama)",
    "Shamgarh",
    "Maharajpur",
    "Multai",
    "Pali",
    "Pachore",
    "Rau",
    "Mhowgaon",
    "Vijaypur",
    "Narsinghgarh",
  ],
  Jharkhand: [
    "Dhanbad",
    "Ranchi",
    "Jamshedpur",
    "Bokaro Steel City",
    "Deoghar",
    "Phusro",
    "Adityapur",
    "Hazaribag",
    "Giridih",
    "Ramgarh",
    "Jhumri Tilaiya",
    "Saunda",
    "Sahibganj",
    "Medininagar (Daltonganj)",
    "Chaibasa",
    "Chatra",
    "Gumia",
    "Dumka",
    "Madhupur",
    "Chirkunda",
    "Pakaur",
    "Simdega",
    "Musabani",
    "Mihijam",
    "Patratu",
    "Lohardaga",
    "Tenu dam-cum-Kathhara",
  ],
  Mizoram: ["Aizawl", "Lunglei", "Saiha"],
  Nagaland: ["Dimapur", "Kohima", "Zunheboto", "Tuensang", "Wokha", "Mokokchung"],
  "Himachal Pradesh": ["Shimla", "Mandi", "Solan", "Nahan", "Sundarnagar", "Palampur", "Kullu"],
  Tripura: [
    "Agartala",
    "Udaipur",
    "Dharmanagar",
    "Pratapgarh",
    "Kailasahar",
    "Belonia",
    "Khowai",
  ],
  "Andhra Pradesh": [
    "Visakhapatnam",
    "Vijayawada",
    "Guntur",
    "Nellore",
    "Kurnool",
    "Rajahmundry",
    "Kakinada",
    "Tirupati",
    "Anantapur",
    "Kadapa",
    "Vizianagaram",
    "Eluru",
    "Ongole",
    "Nandyal",
    "Machilipatnam",
    "Adoni",
    "Tenali",
    "Chittoor",
    "Hindupur",
    "Proddatur",
    "Bhimavaram",
    "Madanapalle",
    "Guntakal",
    "Dharmavaram",
    "Gudivada",
    "Srikakulam",
    "Narasaraopet",
    "Rajampet",
    "Tadpatri",
    "Tadepalligudem",
    "Chilakaluripet",
    "Yemmiganur",
    "Kadiri",
    "Chirala",
    "Anakapalle",
    "Kavali",
    "Palacole",
    "Sullurpeta",
    "Tanuku",
    "Rayachoti",
    "Srikalahasti",
    "Bapatla",
    "Naidupet",
    "Nagari",
    "Gudur",
    "Vinukonda",
    "Narasapuram",
    "Nuzvid",
    "Markapur",
    "Ponnur",
    "Kandukur",
    "Bobbili",
    "Rayadurg",
    "Samalkot",
    "Jaggaiahpet",
    "Tuni",
    "Amalapuram",
    "Bheemunipatnam",
    "Venkatagiri",
    "Sattenapalle",
    "Pithapuram",
    "Palasa Kasibugga",
    "Parvathipuram",
    "Macherla",
    "Gooty",
    "Salur",
    "Mandapeta",
    "Jammalamadugu",
    "Peddapuram",
    "Punganur",
    "Nidadavole",
    "Repalle",
    "Ramachandrapuram",
    "Kovvur",
    "Tiruvuru",
    "Uravakonda",
    "Narsipatnam",
    "Yerraguntla",
    "Pedana",
    "Puttur",
    "Renigunta",
    "Rajam",
    "Srisailam Project (Right Flank Colony) Township",
  ],
  Punjab: [
    "Ludhiana",
    "Patiala",
    "Amritsar",
    "Jalandhar",
    "Bathinda",
    "Pathankot",
    "Hoshiarpur",
    "Batala",
    "Moga",
    "Malerkotla",
    "Khanna",
    "Mohali",
    "Barnala",
    "Firozpur",
    "Phagwara",
    "Kapurthala",
    "Zirakpur",
    "Kot Kapura",
    "Faridkot",
    "Muktsar",
    "Rajpura",
    "Sangrur",
    "Fazilka",
    "Gurdaspur",
    "Kharar",
    "Gobindgarh",
    "Mansa",
    "Malout",
    "Nabha",
    "Tarn Taran",
    "Jagraon",
    "Sunam",
    "Dhuri",
    "Firozpur Cantt.",
    "Sirhind Fatehgarh Sahib",
    "Rupnagar",
    "Jalandhar Cantt.",
    "Samana",
    "Nawanshahr",
    "Rampura Phul",
    "Nangal",
    "Nakodar",
    "Zira",
    "Patti",
    "Raikot",
    "Longowal",
    "Urmar Tanda",
    "Morinda, India",
    "Phillaur",
    "Pattran",
    "Qadian",
    "Sujanpur",
    "Mukerian",
    "Talwara",
  ],
  Chandigarh: ["Chandigarh"],
  Rajasthan: [
    "Jaipur",
    "Jodhpur",
    "Bikaner",
    "Udaipur",
    "Ajmer",
    "Bhilwara",
    "Alwar",
    "Bharatpur",
    "Pali",
    "Barmer",
    "Sikar",
    "Tonk",
    "Sadulpur",
    "Sawai Madhopur",
    "Nagaur",
    "Makrana",
    "Sujangarh",
    "Sardarshahar",
    "Ladnu",
    "Ratangarh",
    "Nokha",
    "Nimbahera",
    "Suratgarh",
    "Rajsamand",
    "Lachhmangarh",
    "Rajgarh (Churu)",
    "Nasirabad",
    "Nohar",
    "Phalodi",
    "Nathdwara",
    "Pilani",
    "Merta City",
    "Sojat",
    "Neem-Ka-Thana",
    "Sirohi",
    "Pratapgarh",
    "Rawatbhata",
    "Sangaria",
    "Lalsot",
    "Pilibanga",
    "Pipar City",
    "Taranagar",
    "Vijainagar, Ajmer",
    "Sumerpur",
    "Sagwara",
    "Ramganj Mandi",
    "Lakheri",
    "Udaipurwati",
    "Losal",
    "Sri Madhopur",
    "Ramngarh",
    "Rawatsar",
    "Rajakhera",
    "Shahpura",
    "Shahpura",
    "Raisinghnagar",
    "Malpura",
    "Nadbai",
    "Sanchore",
    "Nagar",
    "Rajgarh (Alwar)",
    "Sheoganj",
    "Sadri",
    "Todaraisingh",
    "Todabhim",
    "Reengus",
    "Rajaldesar",
    "Sadulshahar",
    "Sambhar",
    "Prantij",
    "Mount Abu",
    "Mangrol",
    "Phulera",
    "Mandawa",
    "Pindwara",
    "Mandalgarh",
    "Takhatgarh",
  ],
  Assam: [
    "Guwahati",
    "Silchar",
    "Dibrugarh",
    "Nagaon",
    "Tinsukia",
    "Jorhat",
    "Bongaigaon City",
    "Dhubri",
    "Diphu",
    "North Lakhimpur",
    "Tezpur",
    "Karimganj",
    "Sibsagar",
    "Goalpara",
    "Barpeta",
    "Lanka",
    "Lumding",
    "Mankachar",
    "Nalbari",
    "Rangia",
    "Margherita",
    "Mangaldoi",
    "Silapathar",
    "Mariani",
    "Marigaon",
  ],
  Odisha: [
    "Bhubaneswar",
    "Cuttack",
    "Raurkela",
    "Brahmapur",
    "Sambalpur",
    "Puri",
    "Baleshwar Town",
    "Baripada Town",
    "Bhadrak",
    "Balangir",
    "Jharsuguda",
    "Bargarh",
    "Paradip",
    "Bhawanipatna",
    "Dhenkanal",
    "Barbil",
    "Kendujhar",
    "Sunabeda",
    "Rayagada",
    "Jatani",
    "Byasanagar",
    "Kendrapara",
    "Rajagangapur",
    "Parlakhemundi",
    "Talcher",
    "Sundargarh",
    "Phulabani",
    "Pattamundai",
    "Titlagarh",
    "Nabarangapur",
    "Soro",
    "Malkangiri",
    "Rairangpur",
    "Tarbha",
  ],
  Chhattisgarh: [
    "Raipur",
    "Bhilai Nagar",
    "Korba",
    "Bilaspur",
    "Durg",
    "Rajnandgaon",
    "Jagdalpur",
    "Raigarh",
    "Ambikapur",
    "Mahasamund",
    "Dhamtari",
    "Chirmiri",
    "Bhatapara",
    "Dalli-Rajhara",
    "Naila Janjgir",
    "Tilda Newra",
    "Mungeli",
    "Manendragarh",
    "Sakti",
  ],
  "Jammu and Kashmir": [
    "Srinagar",
    "Jammu",
    "Baramula",
    "Anantnag",
    "Sopore",
    "KathUrban Agglomeration",
    "Rajauri",
    "Punch",
    "Udhampur",
  ],
  Karnataka: [
    "Bengaluru",
    "Hubli-Dharwad",
    "Belagavi",
    "Mangaluru",
    "Davanagere",
    "Ballari",
    "Mysore",
    "Tumkur",
    "Shivamogga",
    "Raayachuru",
    "Robertson Pet",
    "Kolar",
    "Mandya",
    "Udupi",
    "Chikkamagaluru",
    "Karwar",
    "Ranebennuru",
    "Ranibennur",
    "Ramanagaram",
    "Gokak",
    "Yadgir",
    "Rabkavi Banhatti",
    "Shahabad",
    "Sirsi",
    "Sindhnur",
    "Tiptur",
    "Arsikere",
    "Nanjangud",
    "Sagara",
    "Sira",
    "Puttur",
    "Athni",
    "Mulbagal",
    "Surapura",
    "Siruguppa",
    "Mudhol",
    "Sidlaghatta",
    "Shahpur",
    "Saundatti-Yellamma",
    "Wadi",
    "Manvi",
    "Nelamangala",
    "Lakshmeshwar",
    "Ramdurg",
    "Nargund",
    "Tarikere",
    "Malavalli",
    "Savanur",
    "Lingsugur",
    "Vijayapura",
    "Sankeshwara",
    "Madikeri",
    "Talikota",
    "Sedam",
    "Shikaripur",
    "Mahalingapura",
    "Mudalagi",
    "Muddebihal",
    "Pavagada",
    "Malur",
    "Sindhagi",
    "Sanduru",
    "Afzalpur",
    "Maddur",
    "Madhugiri",
    "Tekkalakote",
    "Terdal",
    "Mudabidri",
    "Magadi",
    "Navalgund",
    "Shiggaon",
    "Shrirangapattana",
    "Sindagi",
    "Sakaleshapura",
    "Srinivaspur",
    "Ron",
    "Mundargi",
    "Sadalagi",
    "Piriyapatna",
    "Adyar",
  ],
  Manipur: ["Imphal", "Thoubal", "Lilong", "Mayang Imphal"],
  Kerala: [
    "Thiruvananthapuram",
    "Kochi",
    "Kozhikode",
    "Kollam",
    "Thrissur",
    "Palakkad",
    "Alappuzha",
    "Malappuram",
    "Ponnani",
    "Vatakara",
    "Kanhangad",
    "Taliparamba",
    "Koyilandy",
    "Neyyattinkara",
    "Kayamkulam",
    "Nedumangad",
    "Kannur",
    "Tirur",
    "Kottayam",
    "Kasaragod",
    "Kunnamkulam",
    "Ottappalam",
    "Thiruvalla",
    "Thodupuzha",
    "Chalakudy",
    "Changanassery",
    "Punalur",
    "Nilambur",
    "Cherthala",
    "Perinthalmanna",
    "Mattannur",
    "Shoranur",
    "Varkala",
    "Paravoor",
    "Pathanamthitta",
    "Peringathur",
    "Attingal",
    "Kodungallur",
    "Pappinisseri",
    "Chittur-Thathamangalam",
    "Muvattupuzha",
    "Adoor",
    "Mavelikkara",
    "Mavoor",
    "Perumbavoor",
    "Vaikom",
    "Palai",
    "Panniyannur",
    "Guruvayoor",
    "Puthuppally",
    "Panamattom",
  ],
  Delhi: ["Delhi", "New Delhi"],
  "Dadra and Nagar Haveli": ["Silvassa"],
  Puducherry: ["Pondicherry", "Karaikal", "Yanam", "Mahe"],
  Uttarakhand: [
    "Dehradun",
    "Hardwar",
    "Haldwani-cum-Kathgodam",
    "Srinagar",
    "Kashipur",
    "Roorkee",
    "Rudrapur",
    "Rishikesh",
    "Ramnagar",
    "Pithoragarh",
    "Manglaur",
    "Nainital",
    "Mussoorie",
    "Tehri",
    "Pauri",
    "Nagla",
    "Sitarganj",
    "Bageshwar",
  ],
  "Uttar Pradesh": [
    "Lucknow",
    "Kanpur",
    "Firozabad",
    "Agra",
    "Meerut",
    "Varanasi",
    "Allahabad",
    "Amroha",
    "Moradabad",
    "Aligarh",
    "Saharanpur",
    "Noida",
    "Loni",
    "Jhansi",
    "Shahjahanpur",
    "Rampur",
    "Modinagar",
    "Hapur",
    "Etawah",
    "Sambhal",
    "Orai",
    "Bahraich",
    "Unnao",
    "Rae Bareli",
    "Lakhimpur",
    "Sitapur",
    "Lalitpur",
    "Pilibhit",
    "Chandausi",
    "Hardoi ",
    "Azamgarh",
    "Khair",
    "Sultanpur",
    "Tanda",
    "Nagina",
    "Shamli",
    "Najibabad",
    "Shikohabad",
    "Sikandrabad",
    "Shahabad, Hardoi",
    "Pilkhuwa",
    "Renukoot",
    "Vrindavan",
    "Ujhani",
    "Laharpur",
    "Tilhar",
    "Sahaswan",
    "Rath",
    "Sherkot",
    "Kalpi",
    "Tundla",
    "Sandila",
    "Nanpara",
    "Sardhana",
    "Nehtaur",
    "Seohara",
    "Padrauna",
    "Mathura",
    "Thakurdwara",
    "Nawabganj",
    "Siana",
    "Noorpur",
    "Sikandra Rao",
    "Puranpur",
    "Rudauli",
    "Thana Bhawan",
    "Palia Kalan",
    "Zaidpur",
    "Nautanwa",
    "Zamania",
    "Shikarpur, Bulandshahr",
    "Naugawan Sadat",
    "Fatehpur Sikri",
    "Shahabad, Rampur",
    "Robertsganj",
    "Utraula",
    "Sadabad",
    "Rasra",
    "Lar",
    "Lal Gopalganj Nindaura",
    "Sirsaganj",
    "Pihani",
    "Shamsabad, Agra",
    "Rudrapur",
    "Soron",
    "SUrban Agglomerationr",
    "Samdhan",
    "Sahjanwa",
    "Rampur Maniharan",
    "Sumerpur",
    "Shahganj",
    "Tulsipur",
    "Tirwaganj",
    "PurqUrban Agglomerationzi",
    "Shamsabad, Farrukhabad",
    "Warhapur",
    "Powayan",
    "Sandi",
    "Achhnera",
    "Naraura",
    "Nakur",
    "Sahaspur",
    "Safipur",
    "Reoti",
    "Sikanderpur",
    "Saidpur",
    "Sirsi",
    "Purwa",
    "Parasi",
    "Lalganj",
    "Phulpur",
    "Shishgarh",
    "Sahawar",
    "Samthar",
    "Pukhrayan",
    "Obra",
    "Niwai",
    "Mirzapur",
  ],
  Bihar: [
    "Patna",
    "Gaya",
    "Bhagalpur",
    "Muzaffarpur",
    "Darbhanga",
    "Arrah",
    "Begusarai",
    "Chhapra",
    "Katihar",
    "Munger",
    "Purnia",
    "Saharsa",
    "Sasaram",
    "Hajipur",
    "Dehri-on-Sone",
    "Bettiah",
    "Motihari",
    "Bagaha",
    "Siwan",
    "Kishanganj",
    "Jamalpur",
    "Buxar",
    "Jehanabad",
    "Aurangabad",
    "Lakhisarai",
    "Nawada",
    "Jamui",
    "Sitamarhi",
    "Araria",
    "Gopalganj",
    "Madhubani",
    "Masaurhi",
    "Samastipur",
    "Mokameh",
    "Supaul",
    "Dumraon",
    "Arwal",
    "Forbesganj",
    "BhabUrban Agglomeration",
    "Narkatiaganj",
    "Naugachhia",
    "Madhepura",
    "Sheikhpura",
    "Sultanganj",
    "Raxaul Bazar",
    "Ramnagar",
    "Mahnar Bazar",
    "Warisaliganj",
    "Revelganj",
    "Rajgir",
    "Sonepur",
    "Sherghati",
    "Sugauli",
    "Makhdumpur",
    "Maner",
    "Rosera",
    "Nokha",
    "Piro",
    "Rafiganj",
    "Marhaura",
    "Mirganj",
    "Lalganj",
    "Murliganj",
    "Motipur",
    "Manihari",
    "Sheohar",
    "Maharajganj",
    "Silao",
    "Barh",
    "Asarganj",
  ],
  Gujarat: [
    "Ahmedabad",
    "Surat",
    "Vadodara",
    "Rajkot",
    "Bhavnagar",
    "Jamnagar",
    "Nadiad",
    "Porbandar",
    "Anand",
    "Morvi",
    "Mahesana",
    "Bharuch",
    "Vapi",
    "Navsari",
    "Veraval",
    "Bhuj",
    "Godhra",
    "Palanpur",
    "Valsad",
    "Patan",
    "Deesa",
    "Amreli",
    "Anjar",
    "Dhoraji",
    "Khambhat",
    "Mahuva",
    "Keshod",
    "Wadhwan",
    "Ankleshwar",
    "Savarkundla",
    "Kadi",
    "Visnagar",
    "Upleta",
    "Una",
    "Sidhpur",
    "Unjha",
    "Mangrol",
    "Viramgam",
    "Modasa",
    "Palitana",
    "Petlad",
    "Kapadvanj",
    "Sihor",
    "Wankaner",
    "Limbdi",
    "Mandvi",
    "Thangadh",
    "Vyara",
    "Padra",
    "Lunawada",
    "Rajpipla",
    "Vapi",
    "Umreth",
    "Sanand",
    "Rajula",
    "Radhanpur",
    "Mahemdabad",
    "Ranavav",
    "Tharad",
    "Mansa",
    "Umbergaon",
    "Talaja",
    "Vadnagar",
    "Manavadar",
    "Salaya",
    "Vijapur",
    "Pardi",
    "Rapar",
    "Songadh",
    "Lathi",
    "Adalaj",
    "Chhapra",
    "Gandhinagar",
  ],
  Telangana: [
    "Hyderabad",
    "Warangal",
    "Nizamabad",
    "Karimnagar",
    "Ramagundam",
    "Khammam",
    "Mahbubnagar",
    "Mancherial",
    "Adilabad",
    "Suryapet",
    "Jagtial",
    "Miryalaguda",
    "Nirmal",
    "Kamareddy",
    "Kothagudem",
    "Bodhan",
    "Palwancha",
    "Mandamarri",
    "Koratla",
    "Sircilla",
    "Tandur",
    "Siddipet",
    "Wanaparthy",
    "Kagaznagar",
    "Gadwal",
    "Sangareddy",
    "Bellampalle",
    "Bhongir",
    "Vikarabad",
    "Jangaon",
    "Bhadrachalam",
    "Bhainsa",
    "Farooqnagar",
    "Medak",
    "Narayanpet",
    "Sadasivpet",
    "Yellandu",
    "Manuguru",
    "Kyathampalle",
    "Nagarkurnool",
  ],
  Meghalaya: ["Shillong", "Tura", "Nongstoin"],
  "Himachal Praddesh": ["Manali"],
  "Arunachal Pradesh": ["Naharlagun", "Pasighat"],
  Maharashtra: [
    "Mumbai",
    "Pune",
    "Nagpur",
    "Thane",
    "Nashik",
    "Kalyan-Dombivali",
    "Vasai-Virar",
    "Solapur",
    "Mira-Bhayandar",
    "Bhiwandi",
    "Amravati",
    "Nanded-Waghala",
    "Sangli",
    "Malegaon",
    "Akola",
    "Latur",
    "Dhule",
    "Ahmednagar",
    "Ichalkaranji",
    "Parbhani",
    "Panvel",
    "Yavatmal",
    "Achalpur",
    "Osmanabad",
    "Nandurbar",
    "Satara",
    "Wardha",
    "Udgir",
    "Aurangabad",
    "Amalner",
    "Akot",
    "Pandharpur",
    "Shrirampur",
    "Parli",
    "Washim",
    "Ambejogai",
    "Manmad",
    "Ratnagiri",
    "Uran Islampur",
    "Pusad",
    "Sangamner",
    "Shirpur-Warwade",
    "Malkapur",
    "Wani",
    "Lonavla",
    "Talegaon Dabhade",
    "Anjangaon",
    "Umred",
    "Palghar",
    "Shegaon",
    "Ozar",
    "Phaltan",
    "Yevla",
    "Shahade",
    "Vita",
    "Umarkhed",
    "Warora",
    "Pachora",
    "Tumsar",
    "Manjlegaon",
    "Sillod",
    "Arvi",
    "Nandura",
    "Vaijapur",
    "Wadgaon Road",
    "Sailu",
    "Murtijapur",
    "Tasgaon",
    "Mehkar",
    "Yawal",
    "Pulgaon",
    "Nilanga",
    "Wai",
    "Umarga",
    "Paithan",
    "Rahuri",
    "Nawapur",
    "Tuljapur",
    "Morshi",
    "Purna",
    "Satana",
    "Pathri",
    "Sinnar",
    "Uchgaon",
    "Uran",
    "Pen",
    "Karjat",
    "Manwath",
    "Partur",
    "Sangole",
    "Mangrulpir",
    "Risod",
    "Shirur",
    "Savner",
    "Sasvad",
    "Pandharkaoda",
    "Talode",
    "Shrigonda",
    "Shirdi",
    "Raver",
    "Mukhed",
    "Rajura",
    "Vadgaon Kasba",
    "Tirora",
    "Mahad",
    "Lonar",
    "Sawantwadi",
    "Pathardi",
    "Pauni",
    "Ramtek",
    "Mul",
    "Soyagaon",
    "Mangalvedhe",
    "Narkhed",
    "Shendurjana",
    "Patur",
    "Mhaswad",
    "Loha",
    "Nandgaon",
    "Warud",
  ],
  Goa: ["Marmagao", "Panaji", "Margao", "Mapusa"],
  "West Bengal": [
    "Kolkata",
    "Siliguri",
    "Asansol",
    "Raghunathganj",
    "Kharagpur",
    "Naihati",
    "English Bazar",
    "Baharampur",
    "Hugli-Chinsurah",
    "Raiganj",
    "Jalpaiguri",
    "Santipur",
    "Balurghat",
    "Medinipur",
    "Habra",
    "Ranaghat",
    "Bankura",
    "Nabadwip",
    "Darjiling",
    "Purulia",
    "Arambagh",
    "Tamluk",
    "AlipurdUrban Agglomerationr",
    "Suri",
    "Jhargram",
    "Gangarampur",
    "Rampurhat",
    "Kalimpong",
    "Sainthia",
    "Taki",
    "Murshidabad",
    "Memari",
    "Paschim Punropara",
    "Tarakeswar",
    "Sonamukhi",
    "PandUrban Agglomeration",
    "Mainaguri",
    "Malda",
    "Panchla",
    "Raghunathpur",
    "Mathabhanga",
    "Monoharpur",
    "Srirampore",
    "Adra",
  ],
};
*/

export function CategoryFormPage({ mode }: CategoryFormPageProps) {
  const navigate = useNavigate();
  const params = useParams<{ id: string }>();
  const categoryId = params.id;
  const initialValues: CategoryFormValues =
    mode === "edit" ? editChildCategoryMock.values : {
      name: "",
      description: "",
      kind: "parent",
      parentCategoryId: "",
      allowPollCreation: true,
      status: "active",
      regionScope: "ALL",
      country: DEFAULT_COUNTRY,
      state: "",
      city: "",
      claimable: "YES",
      requestAllowed: "YES",
      adminCurated: "PARTIAL",
      psiParameters: [],
    };

  const [values, setValues] = useState<CategoryFormValues>(initialValues);

  const [overrides, setOverrides] = useState<OverrideFlags>(
    mode === "edit"
      ? editChildCategoryMock.overrides
      : {
          allowPollCreation: false,
          status: false,
          claimable: false,
          requestAllowed: false,
          adminCurated: false,
        }
  );

  const [inherited] = useState<InheritedStates | undefined>(
    mode === "edit" && editChildCategoryMock.inherited
      ? (editChildCategoryMock.inherited as InheritedStates)
      : undefined
  );

  const [impactOpen, setImpactOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState<number>(1);
  const [parentOptions, setParentOptions] = useState<CategoryNode[]>([]);

  const update = <K extends keyof CategoryFormValues>(key: K, value: CategoryFormValues[K]) => {
    setValues((prev) => ({ ...prev, [key]: value }));
  };

  // Region helpers backed by REGION_DATA
  const resolvedCountry = values.country || DEFAULT_COUNTRY;
  const allCountries = Object.values(REGION_DATA);
  const countryOptions = allCountries.map((country) => ({
    isoCode: country.value,
    name: country.label,
  }));

  const currentCountry =
    allCountries.find((country) => country.value === resolvedCountry) ??
    allCountries.find((country) => country.value === DEFAULT_COUNTRY) ??
    allCountries[0];

  const statesForCountry = currentCountry?.states ?? [];
  const selectedState = statesForCountry.find((state) => state.value === values.state) ?? null;
  const citiesForState = selectedState?.cities ?? [];

  const handleCountryChange = (isoCode: string) => {
    update("country", isoCode);
    update("state", "");
    update("city", "");
  };

  const handleStateChange = (isoCode: string) => {
    if (isoCode === ALL_VALUE) {
      update("state", "");
    } else {
      update("state", isoCode);
    }
    update("city", "");
  };

  const toggleOverride = (field: keyof OverrideFlags) => {
    setOverrides((prev) => ({ ...prev, [field]: !prev[field] }));
  };

  const isParent = values.kind === "parent";
  const isChild = values.kind === "child";

  const setRegionScope = (scope: RegionScope) => {
    setValues((prev) => {
      if (scope === "ALL") {
        return { ...prev, regionScope: scope, country: "", state: "", city: "" };
      }
      // When switching to regional scope, ensure country is set
      return { 
        ...prev, 
        regionScope: scope, 
        country: DEFAULT_COUNTRY,
        state: "", 
        city: "" 
      };
    });
  };

  const psiParameters: PsiParameter[] = values.psiParameters ?? [];

  const claimRequirements: ClaimRequirementField[] = values.claimRequirements ?? [];

  const addPsiParameter = () => {
    const id = `psi_${Date.now()}_${psiParameters.length}`;
    const next: PsiParameter[] = [
      ...psiParameters,
      {
        id,
        label: "",
        description: "",
        weight: 1,
      },
    ];
    update("psiParameters", next as any);
  };

  const updatePsiParameter = (id: string, patch: Partial<PsiParameter>) => {
    const next = psiParameters.map((param) =>
      param.id === id ? { ...param, ...patch } : param
    );
    update("psiParameters", next as any);
  };

  const removePsiParameter = (id: string) => {
    const next = psiParameters.filter((param) => param.id !== id);
    update("psiParameters", next as any);
  };

  const addClaimRequirement = (type: "url" | "document") => {
    const id = `req_${Date.now()}_${claimRequirements.length}`;
    const index = claimRequirements.length + 1;
    const keyBase = type === "url" ? "url" : "document";
    const next: ClaimRequirementField[] = [
      ...claimRequirements,
      {
        id,
        key: `${keyBase}_${index}`,
        label: type === "url" ? "Social / website URL" : "Document",
        type,
        required: true,
      },
    ];
    update("claimRequirements", next as any);
  };

  const updateClaimRequirement = (
    id: string,
    patch: Partial<ClaimRequirementField>,
  ) => {
    const next = claimRequirements.map((field) =>
      field.id === id ? { ...field, ...patch } : field,
    );
    update("claimRequirements", next as any);
  };

  const removeClaimRequirement = (id: string) => {
    const next = claimRequirements.filter((field) => field.id !== id);
    update("claimRequirements", next as any);
  };

  useEffect(() => {
    if (!isChild) return;

    let isMounted = true;
    (async () => {
      try {
        const parents = await fetchParentCategories();
        if (isMounted) {
          setParentOptions(parents);
        }
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error("Failed to load parent categories", err);
      }
    })();

    return () => {
      isMounted = false;
    };
  }, [isChild]);

  const pageTitle = mode === "create" ? "Create Category" : "Edit Category";
  const totalSteps = 4;

  return (
    <form
      className="space-y-6"
      onSubmit={(event) => {
        event.preventDefault();
        if (values.kind === "child" && !values.parentCategoryId) {
          setError("Please select a parent category for the child category.");
          return;
        }
        (async () => {
          try {
            setSaving(true);
            setError(null);
            if (mode === "create") {
              await createCategory(values, overrides);
            } else if (mode === "edit" && categoryId) {
              await updateCategory(categoryId, values, overrides);
            }
            navigate("/admin/categories");
          } catch (err) {
            console.error(err);
            setError("Failed to save category.");
          } finally {
            setSaving(false);
          }
        })();
      }}
    >
      <div className="space-y-1">
        <h2 className="text-base font-semibold tracking-tight text-foreground">
          {pageTitle}
        </h2>
        <p className="text-xs text-muted-foreground">
          {mode === "create"
            ? "Define a new category in the taxonomy hierarchy."
            : "Modify the category configuration and inheritance behavior."}
        </p>
      </div>

      {step === 1 && (
        <>
          <div className="rounded-lg border bg-card p-6 shadow-sm">
            <h3 className="mb-4 text-base font-semibold tracking-tight text-foreground">
              Basic Information
            </h3>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="category-name">Category Name</Label>
                <Input
                  id="category-name"
                  value={values.name}
                  onChange={(e) => update("name", e.target.value)}
                  placeholder="Enter category name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="category-description">Description</Label>
                <Textarea
                  id="category-description"
                  value={values.description}
                  onChange={(e) => update("description", e.target.value)}
                  placeholder="Optional description for internal use"
                  rows={3}
                />
              </div>
            </div>
          </div>

          <div className="rounded-lg border bg-card p-6 shadow-sm space-y-4">
            <CategoryTypeSelector
              value={values.kind}
              onChange={(kind) => update("kind", kind)}
            />
            {isChild && (
              <ParentCategorySelect
                value={values.parentCategoryId}
                options={parentOptions}
                onChange={(id) => update("parentCategoryId", id)}
              />
            )}
          </div>
        </>
      )}

      {step === 2 && (
        <>
          <div className="rounded-lg border bg-card p-6 shadow-sm space-y-4">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h3 className="text-base font-semibold tracking-tight text-foreground">
                  Region &amp; Visibility
                </h3>
                <p className="text-xs text-muted-foreground">
                  Choose where polls under this category can appear.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                {(["ALL", "COUNTRY", "STATE", "CITY"] as RegionScope[]).map((scope) => {
                  const active = values.regionScope === scope;
                  const labels: Record<RegionScope, string> = {
                    ALL: "All regions",
                    COUNTRY: "Country",
                    STATE: "State",
                    CITY: "City",
                  };
                  return (
                    <button
                      key={scope}
                      type="button"
                      onClick={() => setRegionScope(scope)}
                      className={`rounded-md border px-3 py-1.5 text-xs font-medium transition-colors ${
                        active
                          ? "border-foreground bg-foreground text-background"
                          : "border-transparent bg-muted text-muted-foreground hover:bg-muted/80"
                      }`}
                    >
                      {labels[scope]}
                    </button>
                  );
                })}
              </div>
            </div>

            {values.regionScope !== "ALL" && (
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="region-country">Country</Label>
                  <Select value={resolvedCountry} onValueChange={handleCountryChange}>
                    <SelectTrigger id="region-country">
                      <SelectValue placeholder="Select a country" />
                    </SelectTrigger>
                    <SelectContent>
                      {countryOptions.map((country) => (
                        <SelectItem key={country.isoCode} value={country.isoCode}>
                          {country.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {values.regionScope !== "COUNTRY" && (
                  <div className="space-y-2">
                    <Label htmlFor="region-state">State / Province</Label>
                    <Select
                      value={values.state || ALL_VALUE}
                      onValueChange={handleStateChange}
                      disabled={!statesForCountry.length}
                    >
                      <SelectTrigger id="region-state">
                        <SelectValue
                          placeholder={
                            statesForCountry.length
                              ? "Select a state / province"
                              : "Select a country first"
                          }
                        />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={ALL_VALUE}>
                          All states in {
                            countryOptions.find((c) => c.isoCode === resolvedCountry)?.name ??
                            "this country"
                          }
                        </SelectItem>
                        {statesForCountry.map((state) => (
                          <SelectItem key={state.value} value={state.value}>
                            {state.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {values.regionScope === "CITY" && (
                  <div className="space-y-2 sm:col-span-2">
                    <Label htmlFor="region-city">City</Label>
                    <Select
                      value={values.city || ALL_VALUE}
                      onValueChange={(city) => {
                        if (city === ALL_VALUE) {
                          update("city", "");
                        } else {
                          update("city", city);
                        }
                      }}
                      disabled={!citiesForState.length}
                    >
                      <SelectTrigger id="region-city">
                        <SelectValue
                          placeholder={
                            citiesForState.length ? "Select a city" : "Select a state first"
                          }
                        />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={ALL_VALUE}>
                          All cities in {
                            statesForCountry.find((s) => s.value === values.state)?.label ||
                              countryOptions.find((c) => c.isoCode === resolvedCountry)?.name ||
                              "this region"
                          }
                        </SelectItem>
                        {citiesForState.map((city) => (
                          <SelectItem key={city.value} value={city.value}>
                            {city.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Parent controls */}
          {isParent && (
            <div className="rounded-lg border bg-card p-6 shadow-sm space-y-4">
              <h3 className="text-base font-semibold tracking-tight text-foreground">
                Parent Defaults (Applied to children unless overridden)
              </h3>
              <div className="flex items-center justify-between gap-4">
                <div className="space-y-0.5">
                  <Label htmlFor="allow-poll-creation" className="text-sm font-medium">
                    Allow Poll Creation
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    When enabled, polls can be created under this category.
                  </p>
                </div>
                <Switch
                  id="allow-poll-creation"
                  checked={values.allowPollCreation}
                  onCheckedChange={(checked) => update("allowPollCreation", checked)}
                />
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium">Status</Label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => update("status", "active")}
                    className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                      values.status === "active"
                        ? "bg-emerald-100 text-emerald-700 border border-emerald-200"
                        : "bg-muted text-muted-foreground border border-transparent"
                    }`}
                  >
                    Active
                  </button>
                  <button
                    type="button"
                    onClick={() => update("status", "disabled")}
                    className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                      values.status === "disabled"
                        ? "bg-slate-100 text-slate-700 border border-slate-200"
                        : "bg-muted text-muted-foreground border border-transparent"
                    }`}
                  >
                    Disabled
                  </button>
                </div>
              </div>

              <div className="mt-2 space-y-3 border-t pt-4">
                <p className="text-xs text-muted-foreground">
                  Policy controls configured here are applied to child categories by default.
                </p>

                {/* Claimable default */}
                <div className="space-y-1">
                  <Label className="text-xs font-medium text-foreground">Claimable default</Label>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => update("claimable", "YES")}
                      className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                        values.claimable === "YES"
                          ? "bg-emerald-100 text-emerald-700 border border-emerald-200"
                          : "bg-muted text-muted-foreground border border-transparent"
                      }`}
                    >
                      YES
                    </button>
                    <button
                      type="button"
                      onClick={() => update("claimable", "NO")}
                      className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                        values.claimable === "NO"
                          ? "bg-slate-100 text-slate-700 border border-slate-200"
                          : "bg-muted text-muted-foreground border border-transparent"
                      }`}
                    >
                      NO
                    </button>
                  </div>
                </div>

                {/* RequestAllowed default */}
                <div className="space-y-1">
                  <Label className="text-xs font-medium text-foreground">Request allowed default</Label>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => update("requestAllowed", "YES")}
                      className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                        values.requestAllowed === "YES"
                          ? "bg-emerald-100 text-emerald-700 border border-emerald-200"
                          : "bg-muted text-muted-foreground border border-transparent"
                      }`}
                    >
                      YES
                    </button>
                    <button
                      type="button"
                      onClick={() => update("requestAllowed", "NO")}
                      className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                        values.requestAllowed === "NO"
                          ? "bg-slate-100 text-slate-700 border border-slate-200"
                          : "bg-muted text-muted-foreground border border-transparent"
                      }`}
                    >
                      NO
                    </button>
                  </div>
                </div>

                {/* AdminCurated default */}
                <div className="space-y-1">
                  <Label className="text-xs font-medium text-foreground">Admin curated default</Label>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => update("adminCurated", "YES")}
                      className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                        values.adminCurated === "YES"
                          ? "bg-emerald-100 text-emerald-700 border border-emerald-200"
                          : "bg-muted text-muted-foreground border border-transparent"
                      }`}
                    >
                      YES
                    </button>
                    <button
                      type="button"
                      onClick={() => update("adminCurated", "NO")}
                      className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                        values.adminCurated === "NO"
                          ? "bg-slate-100 text-slate-700 border border-slate-200"
                          : "bg-muted text-muted-foreground border border-transparent"
                      }`}
                    >
                      NO
                    </button>
                    <button
                      type="button"
                      onClick={() => update("adminCurated", "PARTIAL")}
                      className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                        values.adminCurated === "PARTIAL"
                          ? "bg-amber-100 text-amber-800 border border-amber-200"
                          : "bg-muted text-muted-foreground border border-transparent"
                      }`}
                    >
                      PARTIAL
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {step === 3 && (
        <div className="rounded-lg border bg-card p-6 shadow-sm space-y-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h3 className="text-base font-semibold tracking-tight text-foreground">
                PSI Parameters for Public Profiles
              </h3>
              <p className="text-xs text-muted-foreground">
                Define the parameters and weightage your PSI score will use for profiles
                created under this category.
              </p>
            </div>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={addPsiParameter}
            >
              + Add parameter
            </Button>
          </div>

          {psiParameters.length === 0 ? (
            <p className="text-xs text-muted-foreground">
              No PSI parameters defined yet. You can always add them later; profiles in this
              category will then start using the updated PSI configuration.
            </p>
          ) : (
            <div className="space-y-3">
              {psiParameters.map((param, index) => (
                <div
                  key={param.id}
                  className="space-y-2 rounded-md border bg-muted/40 p-3"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="space-y-0.5">
                      <p className="text-xs font-medium text-foreground">
                        Parameter {index + 1}
                      </p>
                      <p className="text-[11px] text-muted-foreground">
                        Give this PSI parameter a clear name and optional description.
                      </p>
                    </div>
                    <button
                      type="button"
                      className="text-[11px] text-muted-foreground hover:text-destructive"
                      onClick={() => removePsiParameter(param.id)}
                    >
                      Remove
                    </button>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-medium" htmlFor={`psi-label-${param.id}`}>
                      Name
                    </Label>
                    <Input
                      id={`psi-label-${param.id}`}
                      value={param.label}
                      onChange={(e) =>
                        updatePsiParameter(param.id, { label: e.target.value })
                      }
                      placeholder="e.g. Profile completeness, Activity level"
                    />
                  </div>
                  <div className="grid gap-3 sm:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
                    <div className="space-y-2">
                      <Label
                        className="text-xs font-medium"
                        htmlFor={`psi-description-${param.id}`}
                      >
                        Description (optional)
                      </Label>
                      <Textarea
                        id={`psi-description-${param.id}`}
                        value={param.description ?? ""}
                        onChange={(e) =>
                          updatePsiParameter(param.id, { description: e.target.value })
                        }
                        rows={2}
                        placeholder="Explain how this parameter contributes to the PSI score."
                      />
                    </div>
                    <div className="space-y-2">
                      <Label
                        className="text-xs font-medium"
                        htmlFor={`psi-weight-${param.id}`}
                      >
                        Weight
                      </Label>
                      <Input
                        id={`psi-weight-${param.id}`}
                        type="number"
                        min={0}
                        step={0.1}
                        value={Number.isFinite(param.weight) ? param.weight : 0}
                        onChange={(e) =>
                          updatePsiParameter(param.id, {
                            weight: Number.isNaN(Number(e.target.value))
                              ? 0
                              : Number(e.target.value),
                          })
                        }
                        placeholder="e.g. 1 or 0.5"
                      />
                      <p className="text-[11px] text-muted-foreground">
                        Higher weight means this parameter impacts the PSI score more.
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Step 4: Claim verification requirements */}
      {step === 4 && (
        <div className="rounded-lg border bg-card p-6 shadow-sm space-y-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h3 className="text-base font-semibold tracking-tight text-foreground">
                Claim Verification Requirements
              </h3>
              <p className="text-xs text-muted-foreground">
                Define which documents or social media / website URLs must be submitted
                when someone claims a profile under this category.
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => addClaimRequirement("url")}
              >
                + Add URL field
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => addClaimRequirement("document")}
              >
                + Add document field
              </Button>
            </div>
          </div>

          {claimRequirements.length === 0 ? (
            <p className="text-xs text-muted-foreground">
              No claim verification fields defined yet. Users will still be able to claim
              profiles using only their verified identity.
            </p>
          ) : (
            <div className="space-y-3">
              {claimRequirements.map((field, index) => (
                <div
                  key={field.id}
                  className="space-y-3 rounded-md border bg-muted/40 p-3"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="space-y-0.5">
                      <p className="text-xs font-medium text-foreground">
                        Field {index + 1}
                      </p>
                      <p className="text-[11px] text-muted-foreground">
                        Configure a document upload or URL field required for claim
                        verification.
                      </p>
                    </div>
                    <button
                      type="button"
                      className="text-[11px] text-muted-foreground hover:text-destructive"
                      onClick={() => removeClaimRequirement(field.id)}
                    >
                      Remove
                    </button>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-[minmax(0,2fr)_minmax(0,2fr)_minmax(0,1fr)]">
                    <div className="space-y-2">
                      <Label className="text-xs font-medium" htmlFor={`req-label-${field.id}`}>
                        Label
                      </Label>
                      <Input
                        id={`req-label-${field.id}`}
                        value={field.label}
                        onChange={(e) =>
                          updateClaimRequirement(field.id, { label: e.target.value })
                        }
                        placeholder={
                          field.type === "url"
                            ? "Official website / social profile URL"
                            : "Document name (e.g. ID proof, registration certificate)"
                        }
                      />
                    </div>

                    <div className="space-y-2">
                      <Label className="text-xs font-medium" htmlFor={`req-key-${field.id}`}>
                        Key (internal)
                      </Label>
                      <Input
                        id={`req-key-${field.id}`}
                        value={field.key}
                        onChange={(e) =>
                          updateClaimRequirement(field.id, { key: e.target.value })
                        }
                        placeholder={field.type === "url" ? "twitter_url" : "id_document"}
                      />
                      <p className="text-[11px] text-muted-foreground">
                        Used internally to map submitted values and documents.
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-xs font-medium">Type &amp; Required</Label>
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                          <span className="rounded border bg-background px-2 py-1 text-[11px] font-medium">
                            {field.type === "url" ? "URL" : "Document"}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-[11px] text-muted-foreground">Required</span>
                          <Switch
                            checked={field.required}
                            onCheckedChange={(checked) =>
                              updateClaimRequirement(field.id, { required: checked })
                            }
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="flex items-center justify-between pt-2">
        {mode === "edit" && isParent && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setImpactOpen(true)}
          >
            Preview impact of parent changes
          </Button>
        )}
        <div className="flex items-center justify-between border-t bg-card px-6 py-3">
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => navigate("/admin/categories")}
          >
            Cancel
          </Button>
          <div className="flex items-center gap-2">
            {step > 1 && (
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => setStep((prev) => Math.max(1, prev - 1))}
              >
                Back
              </Button>
            )}
            {step < totalSteps && (
              <Button
                type="button"
                size="sm"
                onClick={() => setStep((prev) => Math.min(totalSteps, prev + 1))}
              >
                Next
              </Button>
            )}
            {step === totalSteps && (
              <Button type="submit" size="sm" disabled={saving}>
                {mode === "create" ? "Save category" : "Save changes"}
              </Button>
            )}
          </div>
        </div>
      </div>

      {error && (
        <p className="text-xs text-destructive">{error}</p>
      )}

      <ImpactPreviewModal
        open={impactOpen}
        onOpenChange={setImpactOpen}
        data={impactPreviewMock}
      />
    </form>
  );
}
