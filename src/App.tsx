/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import { 
  db, 
  collection, 
  addDoc, 
  query, 
  where, 
  onSnapshot, 
  orderBy, 
  deleteDoc,
  doc,
  updateDoc
} from './firebase';
import { format } from 'date-fns';
import * as XLSX from 'xlsx';
import { 
  Plus, 
  Trash2, 
  Download, 
  LogOut, 
  UserPlus, 
  MessageSquare, 
  Users, 
  History,
  Search,
  ToggleRight,
  ChevronDown,
  Calendar,
  Clock,
  FileText,
  Settings,
  UserCog,
  Percent
} from 'lucide-react';
import { cn } from './lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import axios from 'axios';

// --- Types ---
interface Employee {
  id: string;
  name: string;
  department?: string;
  createdBy: string;
}

interface Conversation {
  id: string;
  employeeId: string;
  employeeName: string;
  employeeOwner: string;
  employeeOwnerName: string;
  date: string;
  subject: string;
  notes?: string;
  createdBy: string;
  createdByName: string;
}

interface LocalUser {
  uid: string;
  email: string;
  displayName: string;
}

interface RTA {
  id: string;
  uid: string;
  email: string;
  name: string;
}

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId: string | undefined;
    email: string | null | undefined;
    emailVerified: boolean | undefined;
    isAnonymous: boolean | undefined;
    tenantId: string | null | undefined;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: 'local-user',
      email: null,
      emailVerified: false,
      isAnonymous: false,
      tenantId: null,
      providerInfo: []
    },
    operationType,
    path
  }
  console.error('Firestore Error: ', JSON.stringify(errInfo));
}

const translations = {
  PT: {
    welcome: "Bem-vindo de volta",
    dashboardOverview: "Aqui está o resumo do seu painel para hoje.",
    forecast: "Previsão de 3 dias",
    loadingLocation: "Carregando localização...",
    today: "Hoje",
    home: "Início",
    logConversation: "Registrar Reunião",
    history: "Histórico",
    employees: "Agentes",
    logout: "Sair",
    loadingTracker: "Carregando...",
    appTitle: "RTA - Registro de Reuniões",
    appSubtitle: "Gerencie conversas com funcionários e acompanhe o histórico de reuniões com facilidade.",
    managerDashboard: "Painel do Gerente",
    quickStats: "Estatísticas Rápidas",
    totalLogs: "Total de Registros",
    notifiedAgents: "Agentes Notificados",
    top3Notified: "Top 3 Notificados",
    noDataYet: "Sem dados ainda",
    newMeetingLog: "Novo Registro de Reunião",
    newMeetingSubtitle: "Registre uma nova interação.",
    subject: "Assunto",
    overbreak: "Pausa Excedida",
    tardiness: "Atraso",
    others: "Outros",
    notesOptional: "Anotações (Opcional)",
    meetingsLogs: "Registros de Reuniões",
    meetingsLogsSubtitle: "Visualize e gerencie todas as conversas registradas.",
    filterBySubject: "Filtrar por Assunto",
    allSubjects: "Todos os Assuntos",
    employee: "Funcionário",
    dateTime: "Data e Hora",
    notes: "Anotações",
    actions: "Ações",
    fullNamesLine: "Nomes Completos (um por linha)",
    employeeList: "Lista de Agentes",
    employeeListSubtitle: (count: number) => `Você tem ${count} agentes sob seu gerenciamento.`,
    noDepartment: "Sem departamento",
    close: "Fechar",
    add: "Adicionar",
    search: "Buscar...",
    filterByEmployee: "Filtrar por Agente",
    exportExcel: "Exportar para Excel",
    noConversations: "Nenhuma conversa encontrada.",
    noEmployees: "Nenhum agente encontrado.",
    viewNotes: "Ver Anotações",
    delete: "Excluir",
    confirmDelete: "Tem certeza que deseja excluir?",
    all: "TODOS",
    sortAsc: "A-Z",
    sortDesc: "Z-A",
    loginButton: "Entrar com Google",
    date: "Data",
    time: "Hora",
    selectEmployee: "Selecione o Agente",
    customSubject: "Assunto Personalizado",
    save: "Salvar",
    cancel: "Cancelar",
    filterByRTA: "Filtrar por RTA",
    allRTAs: "Todos os RTAs",
    responsibleAgent: "RTA Responsável",
    createdByAgent: "Criado por",
    selectLanguage: "Selecione o Idioma",
    management: "Gerenciamento",
    rtaManagement: "Gerenciamento de RTAs",
    rtaManagementSubtitle: "Gerencie os RTAs e veja estatísticas de agentes.",
    addRTA: "Adicionar RTA",
    deleteRTA: "Excluir RTA",
    rtaName: "Nome do RTA",
    rtaEmail: "E-mail do RTA",
    agentsCount: "Qtd. Agentes",
    percentage: "Porcentagem",
    totalAgents: "Total de Agentes",
    noRTAs: "Nenhum RTA encontrado.",
    changeRTA: "Alterar RTA",
    selectRTA: "Selecione o RTA",
    confirmDeleteRTA: "Tem certeza que deseja excluir este RTA?"
  },
  EN: {
    welcome: "Welcome back",
    dashboardOverview: "Here's your dashboard overview for today.",
    forecast: "3-Day Forecast",
    loadingLocation: "Loading location...",
    today: "Today",
    home: "Home",
    logConversation: "Log Meeting",
    history: "History",
    employees: "Agents",
    logout: "Logout",
    loadingTracker: "Loading tracker...",
    appTitle: "RTA - Agent's meeting tracker",
    appSubtitle: "Manage employee conversations and track meeting history with ease.",
    managerDashboard: "Manager Dashboard",
    quickStats: "Quick Stats",
    totalLogs: "Total Logs",
    notifiedAgents: "Notified Agents",
    top3Notified: "Top 3 Notified",
    noDataYet: "No data yet",
    newMeetingLog: "New Meeting Log",
    newMeetingSubtitle: "Record a new interaction.",
    subject: "Subject",
    overbreak: "Overbreak",
    tardiness: "Tardiness",
    others: "Others",
    notesOptional: "Notes (Optional)",
    meetingsLogs: "Meetings Log's",
    meetingsLogsSubtitle: "View and manage all recorded conversations.",
    filterBySubject: "Filter by Subject",
    allSubjects: "All Subjects",
    employee: "Employee",
    dateTime: "Date & Time",
    notes: "Notes",
    actions: "Actions",
    fullNamesLine: "Full Names (one per line)",
    employeeList: "Employee List",
    employeeListSubtitle: (count: number) => `You have ${count} employees under your management.`,
    noDepartment: "No department",
    close: "Close",
    add: "Add",
    search: "Search...",
    filterByEmployee: "Filter by Employee",
    exportExcel: "Export to Excel",
    noConversations: "No conversations found.",
    noEmployees: "No employees found.",
    viewNotes: "View Notes",
    delete: "Delete",
    confirmDelete: "Are you sure you want to delete?",
    all: "ALL",
    sortAsc: "A-Z",
    sortDesc: "Z-A",
    loginButton: "Sign in with Google",
    date: "Date",
    time: "Time",
    selectEmployee: "Select Employee",
    customSubject: "Custom Subject",
    save: "Save",
    cancel: "Cancel",
    filterByRTA: "Filter by RTA",
    allRTAs: "All RTAs",
    responsibleAgent: "Responsible RTA",
    createdByAgent: "Created by",
    selectLanguage: "Select Language",
    management: "Management",
    rtaManagement: "RTA Management",
    rtaManagementSubtitle: "Manage RTAs and view agent statistics.",
    addRTA: "Add RTA",
    deleteRTA: "Delete RTA",
    rtaName: "RTA Name",
    rtaEmail: "RTA Email",
    agentsCount: "Agents Count",
    percentage: "Percentage",
    totalAgents: "Total Agents",
    noRTAs: "No RTAs found.",
    changeRTA: "Change RTA",
    selectRTA: "Select RTA",
    confirmDeleteRTA: "Are you sure you want to delete this RTA?"
  },
  ES: {
    welcome: "Bienvenido de nuevo",
    dashboardOverview: "Aquí está el resumen de su panel para hoy.",
    forecast: "Pronóstico de 3 días",
    loadingLocation: "Cargando ubicación...",
    today: "Hoy",
    home: "Inicio",
    logConversation: "Registrar Reunión",
    history: "Historial",
    employees: "Agentes",
    logout: "Cerrar sesión",
    loadingTracker: "Cargando...",
    appTitle: "RTA - Registro de Reuniones",
    appSubtitle: "Administre conversaciones de empleados y rastree el historial de reuniones con facilidad.",
    managerDashboard: "Panel del Gerente",
    quickStats: "Estadísticas Rápidas",
    totalLogs: "Total de Registros",
    notifiedAgents: "Agentes Notificados",
    top3Notified: "Top 3 Notificados",
    noDataYet: "Sin datos aún",
    newMeetingLog: "Nuevo Registro de Reunión",
    newMeetingSubtitle: "Registre una nueva interacción.",
    subject: "Asunto",
    overbreak: "Pausa Excedida",
    tardiness: "Atraso",
    others: "Otros",
    notesOptional: "Notas (Opcional)",
    meetingsLogs: "Registros de Reuniones",
    meetingsLogsSubtitle: "Ver y administrar todas las conversaciones registradas.",
    filterBySubject: "Filtrar por Asunto",
    allSubjects: "Todos los Asuntos",
    employee: "Empleado",
    dateTime: "Fecha y Hora",
    notes: "Notas",
    actions: "Acciones",
    fullNamesLine: "Nombres Completos (uno por línea)",
    employeeList: "Lista de Agentes",
    employeeListSubtitle: (count: number) => `Tiene ${count} agentes bajo su gestión.`,
    noDepartment: "Sin departamento",
    close: "Cerrar",
    add: "Añadir",
    search: "Buscar...",
    filterByEmployee: "Filtrar por Agente",
    exportExcel: "Exportar a Excel",
    noConversations: "No se encontraron conversaciones.",
    noEmployees: "No se encontraron agentes.",
    viewNotes: "Ver Notas",
    delete: "Eliminar",
    confirmDelete: "¿Está seguro de que desea eliminar?",
    all: "TODOS",
    sortAsc: "A-Z",
    sortDesc: "Z-A",
    loginButton: "Iniciar sesión con Google",
    date: "Fecha",
    time: "Hora",
    selectEmployee: "Seleccione Agente",
    customSubject: "Asunto Personalizado",
    save: "Guardar",
    cancel: "Cancelar",
    filterByRTA: "Filtrar por RTA",
    allRTAs: "Todos los RTAs",
    responsibleAgent: "RTA Responsable",
    createdByAgent: "Creado por",
    selectLanguage: "Seleccionar Idioma",
    management: "Gestión",
    rtaManagement: "Gestión de RTAs",
    rtaManagementSubtitle: "Administre los RTAs y vea estadísticas de agentes.",
    addRTA: "Añadir RTA",
    deleteRTA: "Eliminar RTA",
    rtaName: "Nombre del RTA",
    rtaEmail: "Correo del RTA",
    agentsCount: "Cant. Agentes",
    percentage: "Porcentaje",
    totalAgents: "Total de Agentes",
    noRTAs: "No se encontraron RTAs.",
    changeRTA: "Cambiar RTA",
    selectRTA: "Seleccione el RTA",
    confirmDeleteRTA: "¿Está seguro de que desea eliminar este RTA?"
  },
  AR: {
    welcome: "مرحباً بعودتك",
    dashboardOverview: "إليك نظرة عامة على لوحة القيادة الخاصة بك اليوم.",
    forecast: "توقعات لمدة 3 أيام",
    loadingLocation: "جاري تحميل الموقع...",
    today: "اليوم",
    home: "الرئيسية",
    logConversation: "تسجيل اجتماع",
    history: "السجل",
    employees: "الوكلاء",
    logout: "تسجيل الخروج",
    loadingTracker: "جاري التحميل...",
    appTitle: "RTA - متتبع اجتماعات الوكلاء",
    appSubtitle: "إدارة محادثات الموظفين وتتبع سجل الاجتماعات بسهولة.",
    managerDashboard: "لوحة تحكم المدير",
    quickStats: "إحصائيات سريعة",
    totalLogs: "إجمالي السجلات",
    notifiedAgents: "الوكلاء الذين تم إخطارهم",
    top3Notified: "أعلى 3 تم إخطارهم",
    noDataYet: "لا توجد بيانات حتى الآن",
    newMeetingLog: "سجل اجتماع جديد",
    newMeetingSubtitle: "تسجيل تفاعل جديد.",
    subject: "الموضوع",
    overbreak: "تجاوز الاستراحة",
    tardiness: "التأخير",
    others: "أخرى",
    notesOptional: "ملاحظات (اختياري)",
    meetingsLogs: "سجلات الاجتماعات",
    meetingsLogsSubtitle: "عرض وإدارة جميع المحادثات المسجلة.",
    filterBySubject: "تصفية حسب الموضوع",
    allSubjects: "جميع المواضيع",
    employee: "الموظف",
    dateTime: "التاريخ والوقت",
    notes: "ملاحظات",
    actions: "إجراءات",
    fullNamesLine: "الأسماء الكاملة (اسم واحد في كل سطر)",
    employeeList: "قائمة الوكلاء",
    employeeListSubtitle: (count: number) => `لديك ${count} وكلاء تحت إدارتك.`,
    noDepartment: "بدون قسم",
    close: "إغلاق",
    add: "إضافة",
    search: "البحث...",
    filterByEmployee: "تصفية حسب الوكيل",
    exportExcel: "تصدير إلى Excel",
    noConversations: "لم يتم العثور على محادثات.",
    noEmployees: "لم يتم العثور على وكلاء.",
    viewNotes: "عرض الملاحظات",
    delete: "حذف",
    confirmDelete: "هل أنت متأكد أنك تريد الحذف؟",
    all: "الكل",
    sortAsc: "أ-ي",
    sortDesc: "ي-أ",
    loginButton: "تسجيل الدخول باستخدام Google",
    date: "التاريخ",
    time: "الوقت",
    selectEmployee: "اختر الوكيل",
    customSubject: "موضوع مخصص",
    save: "حفظ",
    cancel: "إلغاء",
    filterByRTA: "تصفية حسب RTA",
    allRTAs: "جميع RTAs",
    responsibleAgent: "RTA المسؤول",
    createdByAgent: "أنشئ بواسطة",
    selectLanguage: "اختر اللغة",
    management: "الإدارة",
    rtaManagement: "إدارة RTAs",
    rtaManagementSubtitle: "إدارة RTAs وعرض إحصائيات الوكلاء.",
    addRTA: "إضافة RTA",
    deleteRTA: "حذف RTA",
    rtaName: "اسم RTA",
    rtaEmail: "بريد RTA",
    agentsCount: "عدد الوكلاء",
    percentage: "النسبة المئوية",
    totalAgents: "إجمالي الوكلاء",
    noRTAs: "لم يتم العثور على RTAs.",
    changeRTA: "تغيير RTA",
    selectRTA: "اختر RTA",
    confirmDeleteRTA: "هل أنت متأكد أنك تريد حذف هذا RTA؟"
  }
};

// --- Components ---

const HomeTab = ({ user, conversations, language }: { user: LocalUser, conversations: Conversation[], language: 'PT' | 'ES' | 'EN' | 'AR' }) => {
  const [weather, setWeather] = useState<any>(null);
  const [time, setTime] = useState(new Date());
  const [locationName, setLocationName] = useState<string>('');

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const fetchWeather = async (lat: number, lon: number, name: string) => {
      try {
        const res = await axios.get(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&daily=weathercode,temperature_2m_max,temperature_2m_min&timezone=auto`);
        setWeather(res.data);
        setLocationName(name);
      } catch (error) {
        console.error("Failed to fetch weather", error);
      }
    };

    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const lat = position.coords.latitude;
          const lon = position.coords.longitude;
          try {
            const geoRes = await axios.get(`https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lon}&localityLanguage=pt`);
            const city = geoRes.data.city || geoRes.data.locality || "Sua Localidade";
            const country = geoRes.data.countryCode || "";
            const locationString = country ? `${city} - ${country}` : city;
            fetchWeather(lat, lon, locationString);
          } catch (e) {
            fetchWeather(lat, lon, "Sua Localidade");
          }
        },
        (error) => {
          console.warn("Geolocation denied or failed, using default.");
          fetchWeather(51.5085, -0.1257, "London - GB");
        }
      );
    } else {
      fetchWeather(51.5085, -0.1257, "London - GB");
    }
  }, []);

  const getWeatherIcon = (code: number) => {
    // Simple mapping of WMO weather codes
    if (code <= 3) return '☀️'; // Clear/Partly cloudy
    if (code <= 49) return '🌫️'; // Fog
    if (code <= 69) return '🌧️'; // Rain
    if (code <= 79) return '❄️'; // Snow
    if (code <= 99) return '⛈️'; // Thunderstorm
    return '☁️';
  };

  return (
    <motion.div 
      key="home"
      initial={{ opacity: 0, x: 10 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -10 }}
      className="grid grid-cols-1 md:grid-cols-2 gap-6"
    >
      {/* Welcome & Time Card */}
      <div className="bg-white rounded-2xl border border-zinc-200 p-8 shadow-sm flex flex-col justify-center items-center text-center">
        <h2 className="text-2xl font-bold text-zinc-900 mb-2">{translations[language].welcome}, {user.displayName?.split(' ')[0]}!</h2>
        <p className="text-zinc-500 mb-8">{translations[language].dashboardOverview}</p>
        
        <div className="text-6xl font-bold text-primary tracking-tighter mb-2">
          {format(time, 'HH:mm')}
        </div>
        <div className="text-lg font-medium text-zinc-600 uppercase tracking-widest">
          {format(time, 'EEEE, MMMM do')}
        </div>
      </div>

      {/* Weather Forecast Card */}
      <div className="bg-white rounded-2xl border border-zinc-200 p-8 shadow-sm">
        <h3 className="text-lg font-bold text-zinc-900 mb-6 flex items-center gap-2">
          <span className="text-2xl">🌤️</span> {locationName || translations[language].loadingLocation}
        </h3>
        
        {weather ? (
          <div className="flex flex-col gap-4">
            {weather.daily.time.slice(0, 3).map((dateStr: string, index: number) => (
              <div key={dateStr} className="flex items-center justify-between p-4 bg-zinc-50 rounded-xl">
                <div className="flex items-center gap-4">
                  <span className="text-3xl">{getWeatherIcon(weather.daily.weathercode[index])}</span>
                  <div>
                    <p className="font-bold text-zinc-900">{index === 0 ? translations[language].today : format(new Date(dateStr), 'EEEE')}</p>
                    <p className="text-xs text-zinc-500">{format(new Date(dateStr), 'MMM d')}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-bold text-zinc-900">{Math.round(weather.daily.temperature_2m_max[index])}°C</p>
                  <p className="text-xs text-zinc-500">{Math.round(weather.daily.temperature_2m_min[index])}°C</p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="h-full flex items-center justify-center text-zinc-400 italic">
            Loading weather data...
          </div>
        )}
      </div>

      {/* Recent Activity Summary */}
      <div className="md:col-span-2 bg-white rounded-2xl border border-zinc-200 p-8 shadow-sm">
        <h3 className="text-lg font-bold text-zinc-900 mb-6 flex items-center gap-2">
          <History className="w-5 h-5 text-primary" /> Recent Meetings
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {conversations.slice(0, 3).map(conv => (
            <div key={conv.id} className="p-4 border border-zinc-100 rounded-xl hover:border-primary/20 transition-colors">
              <div className="flex justify-between items-start mb-2">
                <span className="font-bold text-zinc-900 truncate">{conv.employeeName}</span>
                <span className="text-xs font-medium px-2 py-1 bg-zinc-100 rounded-md text-zinc-600">{conv.subject}</span>
              </div>
              <p className="text-xs text-zinc-500 flex items-center gap-1">
                <Clock className="w-3 h-3" /> {format(new Date(conv.date), 'MMM d, HH:mm')}
              </p>
            </div>
          ))}
          {conversations.length === 0 && (
            <div className="col-span-full text-center py-8 text-zinc-400 italic">
              No recent meetings logged.
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
};

const Button = ({ 
  children, 
  onClick, 
  variant = 'primary', 
  className,
  type = 'button'
}: { 
  children: React.ReactNode; 
  onClick?: () => void; 
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  className?: string;
  type?: 'button' | 'submit';
}) => {
  const variants = {
    primary: 'bg-primary text-white hover:bg-primary/90',
    secondary: 'bg-accent text-white hover:bg-accent/90',
    danger: 'bg-red-50 text-red-600 hover:bg-red-100 border border-red-100',
    ghost: 'bg-transparent text-zinc-600 hover:bg-zinc-100'
  };

  return (
    <button 
      type={type}
      onClick={onClick} 
      className={cn(
        'px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed',
        variants[variant],
        className
      )}
    >
      {children}
    </button>
  );
};

const Input = ({ 
  label, 
  value, 
  onChange, 
  placeholder, 
  type = 'text',
  required = false
}: { 
  label?: string; 
  value: string; 
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void; 
  placeholder?: string;
  type?: string;
  required?: boolean;
}) => (
  <div className="flex flex-col gap-1.5 w-full">
    {label && <label className="text-xs font-medium text-zinc-500 uppercase tracking-wider">{label}</label>}
    <input 
      type={type}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      required={required}
      className="px-3 py-2 bg-white border border-zinc-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900/10 focus:border-zinc-900 transition-all"
    />
  </div>
);

const Select = ({ 
  label, 
  value, 
  onChange, 
  options,
  placeholder = "Select an option"
}: { 
  label?: string; 
  value: string; 
  onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void; 
  options: { id: string; name: string }[];
  placeholder?: string;
}) => (
  <div className="flex flex-col gap-1.5 w-full">
    {label && <label className="text-xs font-medium text-zinc-500 uppercase tracking-wider">{label}</label>}
    <select 
      value={value}
      onChange={onChange}
      className="px-3 py-2 bg-white border border-zinc-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900/10 focus:border-zinc-900 transition-all appearance-none cursor-pointer"
    >
      <option value="">{placeholder}</option>
      {options.map(opt => (
        <option key={opt.id} value={opt.id}>{opt.name}</option>
      ))}
    </select>
  </div>
);

export default function App() {
  const [user, setUser] = useState<LocalUser | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [loading, setLoading] = useState(true);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  
  // Form States
  const [newEmployeeNames, setNewEmployeeNames] = useState('');
  const [newEmployeeDept, setNewEmployeeDept] = useState('');
  const [selectedEmployeeId, setSelectedEmployeeId] = useState('');
  const [convDate, setConvDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [convTime, setConvTime] = useState(format(new Date(), 'HH:mm'));
  const [convSubject, setConvSubject] = useState('Overbreak');
  const [customSubject, setCustomSubject] = useState('');
  const [convNotes, setConvNotes] = useState('');
  
  const [filterEmployee, setFilterEmployee] = useState('');
  const [filterDate, setFilterDate] = useState('');
  const [filterSubject, setFilterSubject] = useState('');
  const [activeTab, setActiveTab] = useState<'home' | 'log' | 'history' | 'employees' | 'management'>('home');
  const [language, setLanguage] = useState<'PT' | 'ES' | 'EN' | 'AR'>('PT');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [showHistoryPopup, setShowHistoryPopup] = useState<string | null>(null);
  const [showNotesPopup, setShowNotesPopup] = useState<string | null>(null);
  const [employeeToDelete, setEmployeeToDelete] = useState<string | null>(null);
  const [conversationToDelete, setConversationToDelete] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isAddEmployeesExpanded, setIsAddEmployeesExpanded] = useState(false);
  const [filterByUser, setFilterByUser] = useState('');
  const [filterByRTA, setFilterByRTA] = useState('');
  const [allEmployees, setAllEmployees] = useState<Employee[]>([]);
  
  // RTA Management States
  const [rtaList, setRtaList] = useState<RTA[]>([]);
  const [newRTAName, setNewRTAName] = useState('');
  const [newRTAEmail, setNewRTAEmail] = useState('');
  const [rtaToDelete, setRtaToDelete] = useState<string | null>(null);
  const [employeeToChangeRTA, setEmployeeToChangeRTA] = useState<string | null>(null);
  const [selectedNewRTA, setSelectedNewRTA] = useState('');

  // Mapeamento de RTAs - busca dinamicamente da lista de RTAs
  const getUserDisplayName = (uid: string) => {
    // Primeiro, busca na lista de RTAs do Firebase
    const rta = rtaList.find(r => r.uid === uid || r.email === uid);
    if (rta) return rta.name;
    
    // Fallback para nomes conhecidos
    const fallbackMap: { [key: string]: string } = {
      'thiago.toncovitch@concentrix.com': 'Thiago Toncovitch',
      'houcine.cherrak@concentrix.com': 'Houcine Cherrak'
    };
    return fallbackMap[uid] || uid;
  };

  // Lista de usuários únicos que têm agentes
  const uniqueUsers = useMemo(() => {
    const users = new Set(allEmployees.map(emp => emp.createdBy));
    return Array.from(users).map(uid => ({
      id: uid,
      name: getUserDisplayName(uid)
    }));
  }, [allEmployees]);

  const groupedEmployees = useMemo(() => {
    // Primeiro filtra por usuário se selecionado
    let filteredByUser = filterByUser 
      ? allEmployees.filter(emp => emp.createdBy === filterByUser)
      : employees;
    
    const filtered = filteredByUser.filter(emp => emp.name.toLowerCase().includes(searchQuery.toLowerCase()));
    const sorted = [...filtered].sort((a, b) => {
      if (sortOrder === 'asc') return a.name.localeCompare(b.name);
      return b.name.localeCompare(a.name);
    });

    const groups: { [key: string]: Employee[] } = {};
    sorted.forEach(emp => {
      const letter = emp.name.charAt(0).toUpperCase();
      if (!groups[letter]) groups[letter] = [];
      groups[letter].push(emp);
    });
    return groups;
  }, [employees, allEmployees, sortOrder, searchQuery, filterByUser]);

  const [selectedLetters, setSelectedLetters] = useState<string[]>(['ALL']);

  const notifiedEmployeesCount = useMemo(() => {
    const notifiedIds = new Set(conversations.map(c => c.employeeId));
    return notifiedIds.size;
  }, [conversations]);

  const top3NotifiedEmployees = useMemo(() => {
    const counts: { [key: string]: number } = {};
    conversations.forEach(c => {
      counts[c.employeeId] = (counts[c.employeeId] || 0) + 1;
    });
    
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([id, count]) => {
        const emp = employees.find(e => e.id === id);
        return { name: emp?.name || 'Unknown', count };
      });
  }, [conversations, employees]);

  const toggleLetter = (letter: string) => {
    setSelectedLetters(prev => {
      const withoutAll = prev.filter(l => l !== 'ALL');
      return withoutAll.includes(letter) 
        ? withoutAll.filter(l => l !== letter) 
        : [...withoutAll, letter];
    });
  };

  useEffect(() => {
    const stored = localStorage.getItem('localUser');
    if (stored) {
      setUser(JSON.parse(stored));
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (!user) return;

    const isAdmin = user.email === 'thiago.toncovitch@concentrix.com';

    // Busca lista de RTAs
    const qRTAs = query(collection(db, 'rtas'), orderBy('name'));
    const unsubRTAs = onSnapshot(qRTAs, (snapshot) => {
      setRtaList(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as RTA)));
    });

    // Sempre busca todos os employees para o formulário de registro
    const qAllEmployees = query(collection(db, 'employees'), orderBy('name'));
    const unsubAllEmployees = onSnapshot(qAllEmployees, (snapshot) => {
      setAllEmployees(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Employee)));
    });

    // Employees filtrados pela aba de agentes (por usuário)
    const qEmployees = isAdmin 
      ? query(collection(db, 'employees'), orderBy('name'))
      : query(collection(db, 'employees'), where('createdBy', '==', user.uid), orderBy('name'));
      
    const unsubEmployees = onSnapshot(qEmployees, (snapshot) => {
      setEmployees(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Employee)));
    });

    const qConversations = isAdmin
      ? query(collection(db, 'conversations'), orderBy('date', 'desc'))
      : query(collection(db, 'conversations'), where('createdBy', '==', user.uid), orderBy('date', 'desc'));
      
    const unsubConversations = onSnapshot(qConversations, (snapshot) => {
      setConversations(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Conversation)));
    });

    return () => {
      unsubRTAs();
      unsubAllEmployees();
      unsubEmployees();
      unsubConversations();
    };
  }, [user]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    
    if (email === 'thiago.toncovitch@concentrix.com' && password === '1234') {
      const mockUser = { uid: email, email, displayName: 'Thiago Toncovitch' };
      localStorage.setItem('localUser', JSON.stringify(mockUser));
      setUser(mockUser);
    } else if (email === 'houcine.cherrak@concentrix.com' && password === '1234') {
      const mockUser = { uid: email, email, displayName: 'Houcine Cherrak' };
      localStorage.setItem('localUser', JSON.stringify(mockUser));
      setUser(mockUser);
    } else {
      setLoginError(translations[language].noConversations || 'Invalid email or password');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('localUser');
    setUser(null);
  };

  const addEmployees = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !newEmployeeNames.trim()) return;

    const names = newEmployeeNames.split('\n').map(n => n.trim()).filter(n => n !== '');

    try {
      for (const name of names) {
        await addDoc(collection(db, 'employees'), {
          name,
          department: newEmployeeDept,
          createdBy: user.uid,
          createdAt: new Date().toISOString()
        });
      }
      setNewEmployeeNames('');
      setNewEmployeeDept('');
    } catch (err) {
      console.error("Failed to add employees", err);
    }
  };

  const confirmDeleteEmployee = async () => {
    if (!employeeToDelete) return;
    try {
      await deleteDoc(doc(db, 'employees', employeeToDelete));
    } catch (err) {
      console.error("Delete failed", err);
    }
    setEmployeeToDelete(null);
  };

  const addConversation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !selectedEmployeeId) return;

    // Busca do funcionário em allEmployees (todos os funcionários de todos os usuários)
    const employee = allEmployees.find(emp => emp.id === selectedEmployeeId);
    if (!employee) return;

    const finalSubject = convSubject === 'Others' ? customSubject : convSubject;
    if (!finalSubject.trim()) return;

    try {
      await addDoc(collection(db, 'conversations'), {
        employeeId: selectedEmployeeId,
        employeeName: employee.name,
        employeeOwner: employee.createdBy,
        employeeOwnerName: getUserDisplayName(employee.createdBy),
        date: `${convDate}T${convTime}:00`,
        subject: finalSubject,
        notes: convNotes,
        createdBy: user.uid,
        createdByName: user.displayName
      });
      setConvSubject('Overbreak');
      setCustomSubject('');
      setConvNotes('');
      setActiveTab('history');
    } catch (err) {
      console.error("Failed to log conversation", err);
    }
  };

  const confirmDeleteConversation = async () => {
    if (!conversationToDelete) return;
    try {
      const docRef = doc(db, 'conversations', conversationToDelete);
      await deleteDoc(docRef);
    } catch (err) {
      console.error("Error in deleteConversation:", err);
      handleFirestoreError(err, OperationType.DELETE, 'conversations/' + conversationToDelete);
    }
    setConversationToDelete(null);
  };

  const exportToExcel = () => {
    const dataToExport = conversations.map(c => ({
      'Employee': c.employeeName,
      'Date': format(new Date(c.date), 'yyyy-MM-dd'),
      'Time': format(new Date(c.date), 'HH:mm'),
      'Subject': c.subject,
      'Notes': c.notes || ''
    }));

    const ws = XLSX.utils.json_to_sheet(dataToExport);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Overbreak Logs");
    XLSX.writeFile(wb, `Overbreak_Logs_${format(new Date(), 'yyyy-MM-dd')}.xlsx`);
  };

  const filteredConversations = useMemo(() => {
    return conversations.filter(c => 
      (filterEmployee === '' || c.employeeId === filterEmployee) &&
      (filterDate === '' || format(new Date(c.date), 'yyyy-MM-dd') === filterDate) &&
      (filterSubject === '' || c.subject === filterSubject) &&
      (filterByRTA === '' || c.createdBy === filterByRTA || c.employeeOwner === filterByRTA)
    );
  }, [conversations, filterEmployee, filterDate, filterSubject, filterByRTA]);

  // Estatísticas de agentes por RTA
  const rtaStats = useMemo(() => {
    const stats: { [key: string]: number } = {};
    allEmployees.forEach(emp => {
      stats[emp.createdBy] = (stats[emp.createdBy] || 0) + 1;
    });
    return stats;
  }, [allEmployees]);

  // Funções de gerenciamento de RTAs
  const addRTA = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRTAName.trim() || !newRTAEmail.trim()) return;

    try {
      await addDoc(collection(db, 'rtas'), {
        uid: newRTAEmail,
        email: newRTAEmail,
        name: newRTAName
      });
      setNewRTAName('');
      setNewRTAEmail('');
    } catch (err) {
      console.error("Failed to add RTA", err);
    }
  };

  const confirmDeleteRTA = async () => {
    if (!rtaToDelete) return;
    try {
      const docRef = doc(db, 'rtas', rtaToDelete);
      await deleteDoc(docRef);
    } catch (err) {
      console.error("Error deleting RTA:", err);
    }
    setRtaToDelete(null);
  };

  const changeEmployeeRTA = async () => {
    if (!employeeToChangeRTA || !selectedNewRTA) return;
    try {
      const docRef = doc(db, 'employees', employeeToChangeRTA);
      await updateDoc(docRef, {
        createdBy: selectedNewRTA
      });
    } catch (err) {
      console.error("Error changing RTA:", err);
    }
    setEmployeeToChangeRTA(null);
    setSelectedNewRTA('');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-zinc-200 border-t-zinc-900 rounded-full animate-spin" />
          <p className="text-zinc-500 font-medium animate-pulse">{translations[language].loadingTracker}</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div dir={language === 'AR' ? 'rtl' : 'ltr'} className="min-h-screen bg-zinc-50 flex items-center justify-center p-6">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-md w-full bg-white p-8 rounded-2xl shadow-xl shadow-zinc-200/50 border border-zinc-100 text-center"
        >
          <div className="w-16 h-16 bg-primary rounded-2xl flex items-center justify-center mx-auto mb-6">
            <History className="text-white w-8 h-8" />
          </div>
          <h1 className="text-2xl font-bold text-zinc-900 mb-2">{translations[language].appTitle}</h1>
          <p className="text-zinc-500 mb-6">{translations[language].appSubtitle}</p>
          
          {/* Seletor de Idioma */}
          <div className="mb-6">
            <p className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-2">{translations[language].selectLanguage}</p>
            <div className="flex justify-center gap-2">
              {([
                { code: 'PT', label: 'Português', flag: '🇧🇷' },
                { code: 'EN', label: 'English', flag: '🇺🇸' },
                { code: 'ES', label: 'Español', flag: '🇪🇸' },
                { code: 'AR', label: 'العربية', flag: '🇸🇦' }
              ] as const).map(({ code, label, flag }) => (
                <button
                  key={code}
                  type="button"
                  onClick={() => setLanguage(code)}
                  className={cn(
                    "flex flex-col items-center gap-1 px-3 py-2 rounded-xl transition-all",
                    language === code 
                      ? "bg-primary text-white shadow-lg shadow-primary/20" 
                      : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200"
                  )}
                >
                  <span className="text-xl">{flag}</span>
                  <span className="text-xs font-medium">{code}</span>
                </button>
              ))}
            </div>
          </div>
          
          <form onSubmit={handleLogin} className="flex flex-col gap-4 text-left">
            <div>
              <label className="block text-sm font-medium text-zinc-700 mb-1">Email</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full p-2 border border-zinc-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary outline-none"
                placeholder="email@concentrix.com"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-700 mb-1">Password</label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full p-2 border border-zinc-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary outline-none"
                placeholder="••••"
              />
            </div>
            {loginError && <p className="text-red-500 text-sm text-center">{loginError}</p>}
            <Button type="submit" className="w-full justify-center py-3 text-base mt-2">
              Login
            </Button>
          </form>
        </motion.div>
      </div>
    );
  }

  return (
    <div dir={language === 'AR' ? 'rtl' : 'ltr'} className="min-h-screen bg-zinc-50 flex flex-col">
      {/* Header */}
      <header className="bg-white border-bottom border-zinc-200 px-6 py-4 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center">
              <ToggleRight className="text-white w-6 h-6" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-zinc-900 leading-tight">{translations[language].appTitle}</h1>
              <p className="text-xs text-zinc-500 font-medium uppercase tracking-wider">{translations[language].managerDashboard}</p>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="hidden sm:flex flex-col items-end">
              <p className="text-sm font-medium text-zinc-900">{user.displayName}</p>
              <p className="text-xs text-zinc-500">{user.email}</p>
              <div className="flex gap-1 mt-1">
                {(['PT', 'ES', 'EN', 'AR'] as const).map(lang => (
                  <button 
                    key={lang} 
                    onClick={() => setLanguage(lang)}
                    className={`text-[10px] font-bold uppercase ${language === lang ? 'text-primary' : 'text-zinc-400 hover:text-zinc-600'}`}
                  >
                    {lang}
                  </button>
                ))}
              </div>
            </div>
            <Button onClick={handleLogout} variant="ghost" className="p-2">
              <LogOut className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </header>

      <main className="flex-1 p-6">
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Sidebar Navigation */}
          <div className="lg:col-span-3 flex flex-col gap-2">
            <button 
              onClick={() => setActiveTab('home')}
              className={cn(
                "flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all",
                activeTab === 'home' ? "bg-primary text-white shadow-lg shadow-primary/20" : "text-zinc-600 hover:bg-white hover:text-zinc-900"
              )}
            >
              <Calendar className="w-4 h-4" />
              {translations[language].home}
            </button>
            <button 
              onClick={() => setActiveTab('log')}
              className={cn(
                "flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all",
                activeTab === 'log' ? "bg-primary text-white shadow-lg shadow-primary/20" : "text-zinc-600 hover:bg-white hover:text-zinc-900"
              )}
            >
              <MessageSquare className="w-4 h-4" />
              {translations[language].logConversation}
            </button>
            <button 
              onClick={() => setActiveTab('history')}
              className={cn(
                "flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all",
                activeTab === 'history' ? "bg-primary text-white shadow-lg shadow-primary/20" : "text-zinc-600 hover:bg-white hover:text-zinc-900"
              )}
            >
              <History className="w-4 h-4" />
              {translations[language].meetingsLogs}
            </button>
            <button 
              onClick={() => setActiveTab('employees')}
              className={cn(
                "flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all",
                activeTab === 'employees' ? "bg-primary text-white shadow-lg shadow-primary/20" : "text-zinc-600 hover:bg-white hover:text-zinc-900"
              )}
            >
              <Users className="w-4 h-4" />
              {translations[language].employees}
            </button>
            
            {/* Botão de Gerenciamento - apenas para admin */}
            {user.email === 'thiago.toncovitch@concentrix.com' && (
              <button 
                onClick={() => setActiveTab('management')}
                className={cn(
                  "flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all",
                  activeTab === 'management' ? "bg-primary text-white shadow-lg shadow-primary/20" : "text-zinc-600 hover:bg-white hover:text-zinc-900"
                )}
              >
                <Settings className="w-4 h-4" />
                {translations[language].management}
              </button>
            )}

            <div className="mt-8 pt-8 border-t border-zinc-200">
              <div className="bg-primary/5 p-4 rounded-2xl border border-primary/5">
                <h3 className="text-xs font-bold text-zinc-900 uppercase tracking-widest mb-4">{translations[language].quickStats}</h3>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-zinc-500">{translations[language].totalLogs}</span>
                    <span className="text-sm font-bold text-zinc-900">{conversations.length}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-zinc-500">{translations[language].notifiedAgents}</span>
                    <span className="text-sm font-bold text-zinc-900">{notifiedEmployeesCount}</span>
                  </div>
                  <div className="pt-2 border-t border-primary/10">
                    <span className="text-xs font-bold text-zinc-900 uppercase tracking-widest mb-2 block">{translations[language].top3Notified}</span>
                    <div className="space-y-1">
                      {top3NotifiedEmployees.map((emp, i) => (
                        <div key={i} className="flex justify-between items-center text-xs">
                          <span className="text-zinc-600 truncate max-w-[120px]">{emp.name}</span>
                          <span className="font-bold text-zinc-900">{emp.count}</span>
                        </div>
                      ))}
                      {top3NotifiedEmployees.length === 0 && (
                        <span className="text-xs text-zinc-400 italic">{translations[language].noDataYet}</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Main Content Area */}
          <div className="lg:col-span-9">
            <AnimatePresence mode="wait">
              {activeTab === 'home' && (
                <HomeTab user={user} conversations={conversations} language={language} />
              )}

              {activeTab === 'log' && (
                <motion.div 
                  key="log"
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  className="bg-white rounded-2xl border border-zinc-200 p-8 shadow-sm"
                >
                  <div className="flex items-center gap-3 mb-8">
                    <div className="w-10 h-10 bg-zinc-100 rounded-full flex items-center justify-center">
                      <MessageSquare className="text-zinc-900 w-5 h-5" />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-zinc-900">{translations[language].newMeetingLog}</h2>
                      <p className="text-sm text-zinc-500">{translations[language].newMeetingSubtitle}</p>
                    </div>
                  </div>

                  <form onSubmit={addConversation} className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="flex flex-col gap-1.5 w-full">
                      <label className="text-xs font-medium text-zinc-500 uppercase tracking-wider">{translations[language].employee}</label>
                      <select 
                        value={selectedEmployeeId}
                        onChange={(e) => setSelectedEmployeeId(e.target.value)}
                        className="px-3 py-2 bg-white border border-zinc-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900/10 focus:border-zinc-900 transition-all cursor-pointer"
                      >
                        <option value="">{translations[language].selectEmployee}</option>
                        {allEmployees.map(emp => (
                          <option key={emp.id} value={emp.id}>
                            {emp.name} ({getUserDisplayName(emp.createdBy)})
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="flex flex-col gap-1.5 w-full">
                      <label className="text-xs font-medium text-zinc-500 uppercase tracking-wider">{translations[language].subject}</label>
                      <select 
                        value={convSubject}
                        onChange={(e) => setConvSubject(e.target.value)}
                        className="px-3 py-2 bg-white border border-zinc-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900/10 focus:border-zinc-900 transition-all cursor-pointer"
                      >
                        <option value="Overbreak">{translations[language].overbreak}</option>
                        <option value="Tardiness">{translations[language].tardiness}</option>
                        <option value="Others">{translations[language].others}</option>
                      </select>
                    </div>
                    {convSubject === 'Others' && (
                      <Input 
                        label={translations[language].customSubject}
                        value={customSubject}
                        onChange={(e) => setCustomSubject(e.target.value)}
                        placeholder="..."
                        required
                      />
                    )}
                    <Input 
                      label={translations[language].date}
                      type="date"
                      value={convDate}
                      onChange={(e) => setConvDate(e.target.value)}
                      required
                    />
                    <Input 
                      label={translations[language].time}
                      type="time"
                      value={convTime}
                      onChange={(e) => setConvTime(e.target.value)}
                      required
                    />
                    <div className="md:col-span-2 flex flex-col gap-1.5">
                      <label className="text-xs font-medium text-zinc-500 uppercase tracking-wider">{translations[language].notesOptional}</label>
                      <textarea 
                        value={convNotes}
                        onChange={(e) => setConvNotes(e.target.value)}
                        placeholder="..."
                        rows={4}
                        className="px-3 py-2 bg-white border border-zinc-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900/10 focus:border-zinc-900 transition-all resize-none"
                      />
                    </div>
                    <div className="md:col-span-2 pt-4 border-t border-zinc-100 flex justify-end">
                      <Button type="submit" className="px-8 py-3">
                        {translations[language].save}
                      </Button>
                    </div>
                  </form>
                </motion.div>
              )}

              {activeTab === 'history' && (
                <motion.div 
                  key="history"
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  className="bg-white rounded-2xl border border-zinc-200 shadow-sm overflow-hidden"
                >
                  <div className="p-8 border-b border-zinc-100 flex flex-col gap-4">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div>
                        <h2 className="text-xl font-bold text-zinc-900">{translations[language].meetingsLogs}</h2>
                        <p className="text-sm text-zinc-500">{translations[language].meetingsLogsSubtitle}</p>
                      </div>
                      <Button onClick={exportToExcel} variant="secondary">
                        <Download className="w-4 h-4" />
                        {translations[language].exportExcel}
                      </Button>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                      <div className="flex flex-col gap-1.5 w-full">
                        <label className="text-xs font-medium text-zinc-500 uppercase tracking-wider">{translations[language].filterByEmployee}</label>
                        <select 
                          value={filterEmployee}
                          onChange={(e) => setFilterEmployee(e.target.value)}
                          className="px-3 py-2 bg-white border border-zinc-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900/10 focus:border-zinc-900 transition-all cursor-pointer"
                        >
                          <option value="">{translations[language].all}</option>
                          {allEmployees.map(emp => (
                            <option key={emp.id} value={emp.id}>
                              {emp.name} ({getUserDisplayName(emp.createdBy)})
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="flex flex-col gap-1.5 w-full">
                        <label className="text-xs font-medium text-zinc-500 uppercase tracking-wider">{translations[language].filterByRTA}</label>
                        <select 
                          value={filterByRTA}
                          onChange={(e) => setFilterByRTA(e.target.value)}
                          className="px-3 py-2 bg-white border border-zinc-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900/10 focus:border-zinc-900 transition-all cursor-pointer"
                        >
                          <option value="">{translations[language].allRTAs}</option>
                          {uniqueUsers.map(u => (
                            <option key={u.id} value={u.id}>{u.name}</option>
                          ))}
                        </select>
                      </div>
                      <Input 
                        label={translations[language].date}
                        type="date"
                        value={filterDate}
                        onChange={(e) => setFilterDate(e.target.value)}
                      />
                      <div className="flex flex-col gap-1.5 w-full">
                        <label className="text-xs font-medium text-zinc-500 uppercase tracking-wider">{translations[language].filterBySubject}</label>
                        <select 
                          value={filterSubject}
                          onChange={(e) => setFilterSubject(e.target.value)}
                          className="px-3 py-2 bg-white border border-zinc-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900/10 focus:border-zinc-900 transition-all cursor-pointer"
                        >
                          <option value="">{translations[language].allSubjects}</option>
                          <option value="Overbreak">{translations[language].overbreak}</option>
                          <option value="Tardiness">{translations[language].tardiness}</option>
                          <option value="Others">{translations[language].others}</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-zinc-50/50">
                          <th className="px-6 py-4 text-xs font-bold text-zinc-500 uppercase tracking-widest border-b border-zinc-100">{translations[language].employee}</th>
                          <th className="px-6 py-4 text-xs font-bold text-zinc-500 uppercase tracking-widest border-b border-zinc-100">{translations[language].dateTime}</th>
                          <th className="px-6 py-4 text-xs font-bold text-zinc-500 uppercase tracking-widest border-b border-zinc-100">{translations[language].subject}</th>
                          <th className="px-6 py-4 text-xs font-bold text-zinc-500 uppercase tracking-widest border-b border-zinc-100">{translations[language].notes}</th>
                          <th className="px-6 py-4 text-xs font-bold text-zinc-500 uppercase tracking-widest border-b border-zinc-100 text-right">{translations[language].actions}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredConversations.length === 0 ? (
                          <tr>
                            <td colSpan={5} className="px-6 py-12 text-center text-zinc-400 italic">
                              {translations[language].noConversations}
                            </td>
                          </tr>
                        ) : (
                          filteredConversations.map((conv) => (
                            <tr key={conv.id} className="group hover:bg-zinc-50 transition-colors">
                              <td className="px-6 py-4 border-b border-zinc-100">
                                <div className="flex flex-col">
                                  <span className="text-sm font-bold text-zinc-900">{conv.employeeName}</span>
                                  <span className="text-xs text-zinc-500">
                                    {translations[language].responsibleAgent}: {conv.employeeOwnerName || getUserDisplayName(conv.employeeOwner || conv.createdBy)}
                                  </span>
                                </div>
                              </td>
                              <td className="px-6 py-4 border-b border-zinc-100">
                                <div className="flex flex-col">
                                  <span className="text-sm text-zinc-900 font-medium">{format(new Date(conv.date), 'MMM d, yyyy')}</span>
                                  <span className="text-xs text-zinc-500">{format(new Date(conv.date), 'HH:mm')}</span>
                                </div>
                              </td>
                              <td className="px-6 py-4 border-b border-zinc-100">
                                <span className="text-sm text-zinc-700">{conv.subject}</span>
                              </td>
                              <td className="px-6 py-4 border-b border-zinc-100">
                                <div className="flex items-center gap-2">
                                  <p className="text-sm text-zinc-500 max-w-xs truncate" title={conv.notes}>
                                    {conv.notes || '-'}
                                  </p>
                                  {conv.notes && (
                                    <button 
                                      onClick={() => setShowNotesPopup(conv.id)}
                                      className="text-xs text-primary font-bold hover:underline"
                                    >
                                      {translations[language].viewNotes}
                                    </button>
                                  )}
                                </div>
                              </td>
                              <td className="px-6 py-4 border-b border-zinc-100">
                                <div className="flex items-center justify-end gap-2">
                                  <span className="text-xs text-zinc-400">
                                    {translations[language].createdByAgent}: {conv.createdByName || getUserDisplayName(conv.createdBy)}
                                  </span>
                                  <button 
                                    onClick={() => setConversationToDelete(conv.id)}
                                    className="p-2 text-zinc-400 hover:text-red-600 transition-colors"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </motion.div>
              )}

              {activeTab === 'employees' && (
                <motion.div 
                  key="employees"
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  className="grid grid-cols-1 md:grid-cols-12 gap-8"
                >
                  <div className="md:col-span-4 flex flex-col gap-6">
                    <div className="bg-white rounded-2xl border border-zinc-200 p-6 shadow-sm">
                      <button 
                        onClick={() => setIsAddEmployeesExpanded(!isAddEmployeesExpanded)}
                        className="w-full flex items-center justify-between text-lg font-bold text-zinc-900 mb-6"
                      >
                        <span className="flex items-center gap-2">
                          <UserPlus className="w-5 h-5" />
                          {translations[language].add} {translations[language].employees}
                        </span>
                        <span>{isAddEmployeesExpanded ? '-' : '+'}</span>
                      </button>
                      {isAddEmployeesExpanded && (
                        <form onSubmit={addEmployees} className="flex flex-col gap-4">
                          <div className="flex flex-col gap-1.5 w-full">
                            <label className="text-xs font-medium text-zinc-500 uppercase tracking-wider">{translations[language].fullNamesLine}</label>
                            <textarea 
                              value={newEmployeeNames}
                              onChange={(e) => setNewEmployeeNames(e.target.value)}
                              placeholder="e.g.&#10;John Smith&#10;Jane Doe"
                              rows={6}
                              required
                              className="px-3 py-2 bg-white border border-zinc-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900/10 focus:border-zinc-900 transition-all resize-none"
                            />
                          </div>
                          <Input 
                            label="Department"
                            value={newEmployeeDept}
                            onChange={(e) => setNewEmployeeDept(e.target.value)}
                            placeholder="e.g., Sales"
                          />
                          <Button type="submit" className="w-full justify-center mt-2">
                            {translations[language].add}
                          </Button>
                        </form>
                      )}
                    </div>

                    <div className="bg-white rounded-2xl border border-zinc-200 p-6 shadow-sm">
                      <h2 className="text-lg font-bold text-zinc-900 mb-4">{translations[language].notifiedAgents}</h2>
                      <div className="space-y-2">
                        {employees.filter(emp => conversations.filter(c => c.employeeId === emp.id).length > 0).map(emp => {
                          const logCount = conversations.filter(c => c.employeeId === emp.id).length;
                          return (
                            <div key={emp.id} className="flex items-center justify-between p-2 bg-zinc-50 rounded-lg">
                              <span className="text-sm font-medium">{emp.name}</span>
                              {logCount >= 3 ? (
                                <div className="w-3 h-3 bg-red-500 rounded-full" title="3+ logs" />
                              ) : (
                                <div className="w-3 h-3 bg-yellow-500 rounded-full" title="1-2 logs" />
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  <div className="md:col-span-8 bg-white rounded-2xl border border-zinc-200 shadow-sm overflow-hidden">
                    <div className="p-6 border-b border-zinc-100 flex flex-col gap-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <h2 className="text-lg font-bold text-zinc-900">{translations[language].employeeList}</h2>
                          <p className="text-sm text-zinc-500">{translations[language].employeeListSubtitle(Object.values(groupedEmployees).flat().length)}</p>
                        </div>
                        <button 
                          onClick={() => setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')}
                          className="text-sm font-medium text-zinc-500 hover:text-primary transition-colors"
                        >
                          Sort: {sortOrder === 'asc' ? translations[language].sortAsc : translations[language].sortDesc}
                        </button>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Input
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          placeholder={translations[language].search}
                        />
                        <div className="flex flex-col gap-1.5 w-full">
                          <label className="text-xs font-medium text-zinc-500 uppercase tracking-wider">{translations[language].filterByRTA}</label>
                          <select 
                            value={filterByUser}
                            onChange={(e) => setFilterByUser(e.target.value)}
                            className="px-3 py-2 bg-white border border-zinc-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900/10 focus:border-zinc-900 transition-all cursor-pointer"
                          >
                            <option value="">{translations[language].allRTAs}</option>
                            {uniqueUsers.map(u => (
                              <option key={u.id} value={u.id}>{u.name}</option>
                            ))}
                          </select>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <button
                          onClick={() => setSelectedLetters([])}
                          className={`px-3 py-1 rounded-lg text-sm font-bold uppercase transition-colors ${selectedLetters.length === 0 ? 'bg-primary text-white' : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'}`}
                        >
                          None
                        </button>
                        <button
                          onClick={() => setSelectedLetters(['ALL'])}
                          className={`px-3 py-1 rounded-lg text-sm font-bold uppercase transition-colors ${selectedLetters.includes('ALL') ? 'bg-primary text-white' : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'}`}
                        >
                          {translations[language].all}
                        </button>
                        {Object.keys(groupedEmployees).sort().map(letter => (
                          <button
                            key={letter}
                            onClick={() => toggleLetter(letter)}
                            className={`px-3 py-1 rounded-lg text-sm font-bold uppercase transition-colors ${selectedLetters.includes(letter) ? 'bg-primary text-white' : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'}`}
                          >
                            {letter}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="divide-y divide-zinc-100">
                      {Object.keys(groupedEmployees).sort().filter(letter => selectedLetters.includes('ALL') || selectedLetters.includes(letter)).map(letter => (
                        <div key={letter}>
                          <div className="bg-zinc-50 px-4 py-2 text-xs font-bold text-zinc-500 uppercase sticky top-0 z-10 border-y border-zinc-100">
                            {letter}
                          </div>
                          <div className="divide-y divide-zinc-100">
                            {groupedEmployees[letter].map(emp => (
                              <div key={emp.id} className="p-4 flex items-center justify-between hover:bg-zinc-50 transition-colors">
                                <div className="flex items-center gap-4">
                                  <div className="w-10 h-10 bg-zinc-100 rounded-full flex items-center justify-center text-zinc-900 font-bold">
                                    {emp.name.charAt(0)}
                                  </div>
                                  <div>
                                    <div className="text-sm font-bold text-zinc-900 flex items-center gap-2">
                                      {emp.name}
                                      <span className="text-xs font-normal text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                                        {getUserDisplayName(emp.createdBy)}
                                      </span>
                                      {conversations.filter(c => c.employeeId === emp.id).length >= 3 ? (
                                        <div className="w-2 h-2 bg-red-500 rounded-full" title="3+ logs" />
                                      ) : conversations.filter(c => c.employeeId === emp.id).length > 0 ? (
                                        <div className="w-2 h-2 bg-yellow-500 rounded-full" title="1-2 logs" />
                                      ) : null}
                                    </div>
                                    <p className="text-xs text-zinc-500">{emp.department || translations[language].noDepartment}</p>
                                  </div>
                                </div>
                                <div className="flex items-center gap-2">
                                  <button 
                                    onClick={() => setShowHistoryPopup(emp.id)}
                                    className="p-2 text-zinc-400 hover:text-primary transition-colors"
                                  >
                                    <History className="w-4 h-4" />
                                  </button>
                                  <button 
                                    onClick={() => setEmployeeToDelete(emp.id)}
                                    className="p-2 text-zinc-400 hover:text-red-500 transition-colors"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                      {Object.keys(groupedEmployees).sort().filter(letter => selectedLetters.includes('ALL') || selectedLetters.includes(letter)).length === 0 && (
                        <div className="p-12 text-center text-zinc-400 italic">
                          {translations[language].noEmployees}
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              )}

              {/* Management Tab - Only for Admin */}
              {activeTab === 'management' && user.email === 'thiago.toncovitch@concentrix.com' && (
                <motion.div 
                  key="management"
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  className="space-y-6"
                >
                  {/* RTA Stats Card */}
                  <div className="bg-white rounded-2xl border border-zinc-200 p-8 shadow-sm">
                    <div className="flex items-center gap-3 mb-6">
                      <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center">
                        <Percent className="text-primary w-6 h-6" />
                      </div>
                      <div>
                        <h2 className="text-xl font-bold text-zinc-900">{translations[language].rtaManagement}</h2>
                        <p className="text-sm text-zinc-500">{translations[language].rtaManagementSubtitle}</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                      <div className="bg-zinc-50 rounded-xl p-4">
                        <p className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-1">{translations[language].totalAgents}</p>
                        <p className="text-3xl font-bold text-zinc-900">{allEmployees.length}</p>
                      </div>
                      <div className="bg-zinc-50 rounded-xl p-4">
                        <p className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-1">RTAs</p>
                        <p className="text-3xl font-bold text-zinc-900">{rtaList.length || uniqueUsers.length}</p>
                      </div>
                      <div className="bg-zinc-50 rounded-xl p-4">
                        <p className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-1">{translations[language].totalLogs}</p>
                        <p className="text-3xl font-bold text-zinc-900">{conversations.length}</p>
                      </div>
                    </div>

                    {/* Stats by RTA */}
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="bg-zinc-50/50">
                            <th className="px-6 py-4 text-xs font-bold text-zinc-500 uppercase tracking-widest border-b border-zinc-100">RTA</th>
                            <th className="px-6 py-4 text-xs font-bold text-zinc-500 uppercase tracking-widest border-b border-zinc-100">{translations[language].agentsCount}</th>
                            <th className="px-6 py-4 text-xs font-bold text-zinc-500 uppercase tracking-widest border-b border-zinc-100">{translations[language].percentage}</th>
                            <th className="px-6 py-4 text-xs font-bold text-zinc-500 uppercase tracking-widest border-b border-zinc-100 text-right">{translations[language].actions}</th>
                          </tr>
                        </thead>
                        <tbody>
                          {uniqueUsers.map((u) => {
                            const count = rtaStats[u.id] || 0;
                            const percentage = allEmployees.length > 0 ? ((count / allEmployees.length) * 100).toFixed(1) : '0';
                            return (
                              <tr key={u.id} className="group hover:bg-zinc-50 transition-colors">
                                <td className="px-6 py-4 border-b border-zinc-100">
                                  <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                                      <UserCog className="w-4 h-4 text-primary" />
                                    </div>
                                    <span className="text-sm font-bold text-zinc-900">{u.name}</span>
                                  </div>
                                </td>
                                <td className="px-6 py-4 border-b border-zinc-100">
                                  <span className="text-sm font-medium text-zinc-700">{count}</span>
                                </td>
                                <td className="px-6 py-4 border-b border-zinc-100">
                                  <div className="flex items-center gap-2">
                                    <div className="w-24 h-2 bg-zinc-100 rounded-full overflow-hidden">
                                      <div 
                                        className="h-full bg-primary rounded-full transition-all"
                                        style={{ width: `${percentage}%` }}
                                      />
                                    </div>
                                    <span className="text-sm font-medium text-zinc-700">{percentage}%</span>
                                  </div>
                                </td>
                                <td className="px-6 py-4 border-b border-zinc-100 text-right">
                                  {rtaList.find(r => r.uid === u.id) && (
                                    <button 
                                      onClick={() => setRtaToDelete(rtaList.find(r => r.uid === u.id)?.id || null)}
                                      className="p-2 text-zinc-400 hover:text-red-600 transition-colors"
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </button>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                          {uniqueUsers.length === 0 && (
                            <tr>
                              <td colSpan={4} className="px-6 py-12 text-center text-zinc-400 italic">
                                {translations[language].noRTAs}
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Add RTA Form */}
                  <div className="bg-white rounded-2xl border border-zinc-200 p-8 shadow-sm">
                    <div className="flex items-center gap-3 mb-6">
                      <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                        <UserPlus className="text-green-600 w-6 h-6" />
                      </div>
                      <div>
                        <h2 className="text-xl font-bold text-zinc-900">{translations[language].addRTA}</h2>
                        <p className="text-sm text-zinc-500">Adicione um novo RTA ao sistema.</p>
                      </div>
                    </div>

                    <form onSubmit={addRTA} className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <Input
                        label={translations[language].rtaName}
                        value={newRTAName}
                        onChange={(e) => setNewRTAName(e.target.value)}
                        placeholder="Ex: João Silva"
                      />
                      <Input
                        label={translations[language].rtaEmail}
                        type="email"
                        value={newRTAEmail}
                        onChange={(e) => setNewRTAEmail(e.target.value)}
                        placeholder="Ex: joao.silva@concentrix.com"
                      />
                      <div className="flex items-end">
                        <Button type="submit" className="w-full">
                          <Plus className="w-4 h-4" />
                          {translations[language].addRTA}
                        </Button>
                      </div>
                    </form>
                  </div>

                  {/* Change Agent's RTA */}
                  <div className="bg-white rounded-2xl border border-zinc-200 p-8 shadow-sm">
                    <div className="flex items-center gap-3 mb-6">
                      <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                        <UserCog className="text-blue-600 w-6 h-6" />
                      </div>
                      <div>
                        <h2 className="text-xl font-bold text-zinc-900">{translations[language].changeRTA}</h2>
                        <p className="text-sm text-zinc-500">Altere o RTA responsável por um agente.</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="flex flex-col gap-1.5 w-full">
                        <label className="text-xs font-medium text-zinc-500 uppercase tracking-wider">{translations[language].employee}</label>
                        <select 
                          value={employeeToChangeRTA || ''}
                          onChange={(e) => setEmployeeToChangeRTA(e.target.value)}
                          className="px-3 py-2 bg-white border border-zinc-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900/10 focus:border-zinc-900 transition-all cursor-pointer"
                        >
                          <option value="">{translations[language].selectEmployee}</option>
                          {allEmployees.map(emp => (
                            <option key={emp.id} value={emp.id}>
                              {emp.name} ({getUserDisplayName(emp.createdBy)})
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="flex flex-col gap-1.5 w-full">
                        <label className="text-xs font-medium text-zinc-500 uppercase tracking-wider">{translations[language].selectRTA}</label>
                        <select 
                          value={selectedNewRTA}
                          onChange={(e) => setSelectedNewRTA(e.target.value)}
                          className="px-3 py-2 bg-white border border-zinc-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900/10 focus:border-zinc-900 transition-all cursor-pointer"
                        >
                          <option value="">{translations[language].selectRTA}</option>
                          {uniqueUsers.map(u => (
                            <option key={u.id} value={u.id}>{u.name}</option>
                          ))}
                        </select>
                      </div>
                      <div className="flex items-end">
                        <Button 
                          onClick={changeEmployeeRTA}
                          disabled={!employeeToChangeRTA || !selectedNewRTA}
                          className="w-full"
                        >
                          {translations[language].save}
                        </Button>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </main>

      <footer className="bg-white border-t border-zinc-200 p-6 mt-auto">
        <div className="max-w-7xl mx-auto text-center">
          <p className="text-xs text-zinc-400 font-medium uppercase tracking-widest">
            {translations[language].appTitle} &copy; {new Date().getFullYear()}
          </p>
        </div>
      </footer>
      {showHistoryPopup && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[80vh] overflow-y-auto p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold">{translations[language].history}</h2>
              <button onClick={() => setShowHistoryPopup(null)} className="text-zinc-500 hover:text-zinc-900">{translations[language].close}</button>
            </div>
            <div className="space-y-4">
              {conversations.filter(c => c.employeeId === showHistoryPopup).map(c => (
                <div key={c.id} className="p-4 bg-zinc-50 rounded-xl">
                  <p className="font-bold">{c.subject}</p>
                  <p className="text-sm text-zinc-500">{format(new Date(c.date), 'MMM d, yyyy HH:mm')}</p>
                  <p className="text-sm mt-2">{c.notes}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {showNotesPopup && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold">{translations[language].notes}</h2>
              <button onClick={() => setShowNotesPopup(null)} className="text-zinc-500 hover:text-zinc-900">{translations[language].close}</button>
            </div>
            <p className="text-zinc-700 whitespace-pre-wrap">{conversations.find(c => c.id === showNotesPopup)?.notes}</p>
          </div>
        </div>
      )}
      {/* Delete Employee Confirmation Modal */}
      <AnimatePresence>
        {employeeToDelete && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-xl"
            >
              <h3 className="text-lg font-bold text-zinc-900 mb-2">{translations[language].confirmDelete}</h3>
              <p className="text-sm text-zinc-500 mb-6">This will not delete their conversation history.</p>
              <div className="flex justify-end gap-3">
                <Button variant="ghost" onClick={() => setEmployeeToDelete(null)}>
                  {translations[language].cancel}
                </Button>
                <Button className="bg-red-600 hover:bg-red-700 text-white" onClick={confirmDeleteEmployee}>
                  {translations[language].delete}
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Delete Conversation Confirmation Modal */}
      <AnimatePresence>
        {conversationToDelete && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-xl"
            >
              <h3 className="text-lg font-bold text-zinc-900 mb-2">{translations[language].confirmDelete}</h3>
              <p className="text-sm text-zinc-500 mb-6">This action cannot be undone.</p>
              <div className="flex justify-end gap-3">
                <Button variant="ghost" onClick={() => setConversationToDelete(null)}>
                  {translations[language].cancel}
                </Button>
                <Button className="bg-red-600 hover:bg-red-700 text-white" onClick={confirmDeleteConversation}>
                  {translations[language].delete}
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Delete RTA Confirmation Modal */}
      <AnimatePresence>
        {rtaToDelete && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-xl"
            >
              <h3 className="text-lg font-bold text-zinc-900 mb-2">{translations[language].confirmDeleteRTA}</h3>
              <p className="text-sm text-zinc-500 mb-6">Os agentes associados a este RTA permanecerão no sistema.</p>
              <div className="flex justify-end gap-3">
                <Button variant="ghost" onClick={() => setRtaToDelete(null)}>
                  {translations[language].cancel}
                </Button>
                <Button className="bg-red-600 hover:bg-red-700 text-white" onClick={confirmDeleteRTA}>
                  {translations[language].delete}
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
