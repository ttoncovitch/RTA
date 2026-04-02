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
  getDocs,
  updateDoc,
  getDocsFromServer,
  limit
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
  CheckCircle,
  XCircle,
  BarChart3,
  RefreshCw
} from 'lucide-react';
import { cn } from './lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import axios from 'axios';

// --- Types ---
interface Employee {
  id: string;
  name: string;
  email?: string;
  lob?: string;
  department?: string;
  createdBy: string;
  creatorName?: string;
}

interface Conversation {
  id: string;
  employeeId: string;
  employeeName: string;
  employeeLob?: string;
  date: string;
  subject: string;
  notes?: string;
  createdBy: string;
  creatorName?: string;
  employeeCreatorName?: string;
}

interface LocalUser {
  uid: string;
  email: string;
  displayName: string;
  role?: 'admin' | 'user';
  isVerified?: boolean;
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
    selectEmployee: "-- Selecionar Usuário --",
    editProfile: "Editar Perfil",
    management: "Gestão",
    userManagement: "Gestão de Usuários",
    verifyUsers: "Verificar Usuários",
    confirmAdd: "Digite 'add' para confirmar a adição",
    confirmDeleteAction: "Digite 'delete' para confirmar a exclusão",
    changePassword: "Alterar Senha",
    newName: "Novo Nome",
    newPassword: "Nova Senha",
    userVerified: "Usuário Verificado",
    pendingVerification: "Pendente",
    addSuccess: "Usuário adicionado com sucesso",
    deleteSuccess: "Usuário excluído com sucesso",
    invalidConfirmation: "Confirmação inválida",
    language: "Idioma",
    rta: "RTA Responsável",
    createdBy: "Criado Por",
    save: "Registrar",
    cancel: "Cancelar",
    statistics: "Estatísticas",
    lob: "LOB",
    email: "Email",
    agentName: "Nome do Agente"
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
    selectEmployee: "-- Select User --",
    editProfile: "Edit Profile",
    management: "Management",
    userManagement: "User Management",
    verifyUsers: "Verify Users",
    confirmAdd: "Type 'add' to confirm addition",
    confirmDeleteAction: "Type 'delete' to confirm deletion",
    changePassword: "Change Password",
    newName: "New Name",
    newPassword: "New Password",
    userVerified: "User Verified",
    pendingVerification: "Pending",
    addSuccess: "User added successfully",
    deleteSuccess: "User deleted successfully",
    invalidConfirmation: "Invalid confirmation",
    language: "Language",
    rta: "Responsible RTA",
    createdBy: "Created By",
    save: "Submit",
    cancel: "Cancel",
    statistics: "Statistics",
    lob: "LOB",
    email: "Email",
    agentName: "Agent Name"
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
    rta: "RTA Responsable",
    createdBy: "Creado Por",
    statistics: "Estadísticas",
    lob: "LOB",
    email: "Email",
    agentName: "Nombre del Agente"
  }
};

// --- Components ---

const HomeTab = ({ user, conversations, language }: { user: LocalUser, conversations: Conversation[], language: 'PT' | 'ES' | 'EN' }) => {
  const [weather, setWeather] = useState<any>(null);
  const [time, setTime] = useState(new Date());
  const [locationName, setLocationName] = useState<string>('');

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const fetchWeather = async () => {
      try {
        // Sempre usar Porto - PT
        const lat = 41.1579;
        const lon = -8.6291;
        const weatherApiUrl = import.meta.env.VITE_WEATHER_API_URL || 'https://api.open-meteo.com/v1/forecast';
        const res = await axios.get(`${weatherApiUrl}?latitude=${lat}&longitude=${lon}&daily=weathercode,temperature_2m_max,temperature_2m_min&timezone=auto`);
        setWeather(res.data);
        setLocationName("Porto - PT");
      } catch (error) {
        console.error("Failed to fetch weather", error);
      }
    };

    fetchWeather();
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
  type = 'button',
  disabled = false
}: { 
  children: React.ReactNode; 
  onClick?: () => void; 
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  className?: string;
  type?: 'button' | 'submit';
  disabled?: boolean;
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
      disabled={disabled}
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

// Toast Component
const Toast = ({ message, type, onClose }: { message: string; type: 'success' | 'error'; onClose: () => void }) => {
  useEffect(() => {
    const timer = setTimeout(onClose, 3000);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 50, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 20, scale: 0.9 }}
      className={cn(
        "fixed bottom-6 right-6 z-50 flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg border",
        type === 'success' ? "bg-green-50 border-green-200 text-green-800" : "bg-red-50 border-red-200 text-red-800"
      )}
    >
      {type === 'success' ? <CheckCircle className="w-5 h-5" /> : <XCircle className="w-5 h-5" />}
      <span className="font-medium text-sm">{message}</span>
      <button onClick={onClose} className="ml-2 hover:opacity-70">×</button>
    </motion.div>
  );
};

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
  const [activeTab, setActiveTab] = useState<'home' | 'log' | 'history' | 'statistics' | 'employees' | 'management'>('home');
  const [language, setLanguage] = useState<'PT' | 'ES' | 'EN'>('PT');
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  
  // Profile Edit States
  const [showEditProfile, setShowEditProfile] = useState(false);
  const [editName, setEditName] = useState('');
  const [editPassword, setEditPassword] = useState('');

  // User Management States
  const [allUsers, setAllUsers] = useState<LocalUser[]>([]);
  const [userToVerify, setUserToVerify] = useState<LocalUser | null>(null);
  const [userToDelete, setUserToDelete] = useState<LocalUser | null>(null);
  const [confirmText, setConfirmText] = useState('');
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserName, setNewUserName] = useState('');
  const [newUserPassword, setNewUserPassword] = useState('');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [showHistoryPopup, setShowHistoryPopup] = useState<string | null>(null);
  const [showNotesPopup, setShowNotesPopup] = useState<string | null>(null);
  const [employeeToDelete, setEmployeeToDelete] = useState<string | null>(null);
  const [conversationToDelete, setConversationToDelete] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isAddEmployeesExpanded, setIsAddEmployeesExpanded] = useState(false);

  // Single Agent Add States
  const [newAgentName, setNewAgentName] = useState('');
  const [newAgentEmail, setNewAgentEmail] = useState('');
  const [newAgentLob, setNewAgentLob] = useState('');

  // Toast States
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Change RTA States
  const [selectedAgentForRTA, setSelectedAgentForRTA] = useState('');
  const [selectedNewRTA, setSelectedNewRTA] = useState('');

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type });
  };

  const groupedEmployees = useMemo(() => {
    const filtered = employees.filter(emp => emp.name.toLowerCase().includes(searchQuery.toLowerCase()));
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
  }, [employees, sortOrder, searchQuery]);

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

  // Management Statistics - RTAs and their agents
  const rtaStatistics = useMemo(() => {
    // Get unique RTAs (users who created employees)
    const rtaMap = new Map<string, { name: string; agentCount: number }>();
    
    employees.forEach(emp => {
      const rtaName = emp.creatorName || 'Desconhecido';
      const rtaId = emp.createdBy;
      
      if (rtaMap.has(rtaId)) {
        rtaMap.get(rtaId)!.agentCount++;
      } else {
        rtaMap.set(rtaId, { name: rtaName, agentCount: 1 });
      }
    });

    const totalAgents = employees.length;
    const rtaList = Array.from(rtaMap.entries()).map(([id, data]) => ({
      id,
      name: data.name,
      agentCount: data.agentCount,
      percentage: totalAgents > 0 ? ((data.agentCount / totalAgents) * 100).toFixed(1) : '0'
    })).sort((a, b) => b.agentCount - a.agentCount);

    return {
      totalAgents,
      totalRTAs: rtaMap.size,
      totalRecords: conversations.length,
      rtaList
    };
  }, [employees, conversations]);

  // Get list of RTAs for dropdown (remove duplicates by name)
  const rtaOptions = useMemo(() => {
    const rtaByName = new Map<string, { id: string; name: string }>();
    
    // First add from employees
    employees.forEach(emp => {
      if (emp.createdBy && emp.creatorName) {
        const normalizedName = emp.creatorName.trim().toLowerCase();
        if (!rtaByName.has(normalizedName)) {
          rtaByName.set(normalizedName, { id: emp.createdBy, name: emp.creatorName });
        }
      }
    });
    
    // Then add verified users (won't override existing)
    allUsers.forEach(u => {
      if (u.isVerified) {
        const normalizedName = u.displayName.trim().toLowerCase();
        if (!rtaByName.has(normalizedName)) {
          rtaByName.set(normalizedName, { id: u.uid, name: u.displayName });
        }
      }
    });
    
    return Array.from(rtaByName.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [employees, allUsers]);

  // Statistics calculations
  const statisticsData = useMemo(() => {
    // Agents with most notifications
    const agentNotifications = new Map<string, { name: string; count: number; lob: string }>();
    conversations.forEach(conv => {
      const key = conv.employeeId;
      const existing = agentNotifications.get(key);
      const employee = employees.find(e => e.id === conv.employeeId);
      if (existing) {
        existing.count++;
      } else {
        agentNotifications.set(key, { 
          name: conv.employeeName, 
          count: 1, 
          lob: conv.employeeLob || employee?.lob || employee?.department || '-'
        });
      }
    });
    const topAgents = Array.from(agentNotifications.values())
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // Most frequent notifications (subjects)
    const subjectCounts = new Map<string, number>();
    conversations.forEach(conv => {
      subjectCounts.set(conv.subject, (subjectCounts.get(conv.subject) || 0) + 1);
    });
    const topSubjects = Array.from(subjectCounts.entries())
      .map(([subject, count]) => ({ subject, count }))
      .sort((a, b) => b.count - a.count);

    // LOBs with most notifications
    const lobCounts = new Map<string, number>();
    conversations.forEach(conv => {
      const employee = employees.find(e => e.id === conv.employeeId);
      const lob = conv.employeeLob || employee?.lob || employee?.department || 'N/A';
      lobCounts.set(lob, (lobCounts.get(lob) || 0) + 1);
    });
    const topLobs = Array.from(lobCounts.entries())
      .map(([lob, count]) => ({ lob, count }))
      .sort((a, b) => b.count - a.count);

    // Notifications by day of week
    const dayOfWeekCounts = [0, 0, 0, 0, 0, 0, 0]; // Sun, Mon, Tue, Wed, Thu, Fri, Sat
    const dayNames = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
    conversations.forEach(conv => {
      const day = new Date(conv.date).getDay();
      dayOfWeekCounts[day]++;
    });
    const dayStats = dayNames.map((name, index) => ({ day: name, count: dayOfWeekCounts[index] }));

    const maxAgentCount = Math.max(...topAgents.map(a => a.count), 1);
    const maxSubjectCount = Math.max(...topSubjects.map(s => s.count), 1);
    const maxLobCount = Math.max(...topLobs.map(l => l.count), 1);
    const maxDayCount = Math.max(...dayOfWeekCounts, 1);

    return {
      topAgents,
      topSubjects,
      topLobs,
      dayStats,
      maxAgentCount,
      maxSubjectCount,
      maxLobCount,
      maxDayCount
    };
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
    const testConnection = async () => {
      try {
        await getDocsFromServer(query(collection(db, 'employees'), limit(1)));
        console.log("Firestore connection successful");
      } catch (error) {
        if(error instanceof Error && error.message.includes('the client is offline')) {
          console.error("Please check your Firebase configuration. The client is offline.");
        } else {
          console.error("Firestore connection error:", error);
        }
      }
    };
    testConnection();
  }, []);

  useEffect(() => {
    const stored = localStorage.getItem('localUser');
    if (stored) {
      setUser(JSON.parse(stored));
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (!user) return;
    const isAdmin = user.email === import.meta.env.VITE_ADMIN_EMAIL;

    if (isAdmin) {
      const qUsers = query(collection(db, 'users'), orderBy('displayName'));
      const unsubUsers = onSnapshot(qUsers, (snapshot) => {
        setAllUsers(snapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() } as LocalUser)));
      });
      return () => unsubUsers();
    }
  }, [user]);

  useEffect(() => {
    if (!user) return;

    const isAdmin = user.email === import.meta.env.VITE_ADMIN_EMAIL;

    const qEmployees = query(collection(db, 'employees'), orderBy('name'));
      
    const unsubEmployees = onSnapshot(qEmployees, (snapshot) => {
      setEmployees(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Employee)));
    });

    const qConversations = query(collection(db, 'conversations'), orderBy('date', 'desc'));
      
    const unsubConversations = onSnapshot(qConversations, (snapshot) => {
      setConversations(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Conversation)));
    });

    return () => {
      unsubEmployees();
      unsubConversations();
    };
  }, [user]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    setIsLoggingIn(true);
    
    // Simulate a professional transition delay
    await new Promise(resolve => setTimeout(resolve, 1500));

    const adminEmail = import.meta.env.VITE_ADMIN_EMAIL;
    const adminPassword = import.meta.env.VITE_ADMIN_PASSWORD;
    const adminName = import.meta.env.VITE_ADMIN_NAME;
    const userEmail = import.meta.env.VITE_USER_EMAIL;
    const userPassword = import.meta.env.VITE_USER_PASSWORD;
    const userName = import.meta.env.VITE_USER_NAME;

    if (adminEmail && email === adminEmail && adminPassword && password === adminPassword) {
      const mockUser: LocalUser = { uid: email, email, displayName: adminName || 'Admin', role: 'admin', isVerified: true };
      localStorage.setItem('localUser', JSON.stringify(mockUser));
      setUser(mockUser);
    } else if (userEmail && email === userEmail && userPassword && password === userPassword) {
      const mockUser: LocalUser = { uid: email, email, displayName: userName || 'User', role: 'user', isVerified: true };
      localStorage.setItem('localUser', JSON.stringify(mockUser));
      setUser(mockUser);
    } else {
      // Check Firestore for users
      try {
        const q = query(collection(db, 'users'), where('email', '==', email), where('password', '==', password));
        const snapshot = await getDocs(q);
        if (!snapshot.empty) {
          const userData = snapshot.docs[0].data() as any;
          if (userData.isVerified) {
            const loggedUser: LocalUser = { uid: snapshot.docs[0].id, email: userData.email, displayName: userData.displayName, role: userData.role, isVerified: userData.isVerified };
            localStorage.setItem('localUser', JSON.stringify(loggedUser));
            setUser(loggedUser);
          } else {
            setLoginError(translations[language].pendingVerification);
          }
        } else {
          setLoginError(translations[language].invalidConfirmation || 'Invalid email or password');
        }
      } catch (err) {
        setLoginError('Login failed');
      }
    }
    setIsLoggingIn(false);
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    try {
      const updatedUser = { ...user, displayName: editName || user.displayName };
      // In a real app we would update Firestore or Auth. Here we update state and localStorage.
      if (user.uid.includes('@')) {
        // Hardcoded users
        localStorage.setItem('localUser', JSON.stringify(updatedUser));
        setUser(updatedUser);
      } else {
        // Firestore users
        await updateDoc(doc(db, 'users', user.uid), {
          displayName: editName || user.displayName,
          password: editPassword || undefined
        });
        localStorage.setItem('localUser', JSON.stringify(updatedUser));
        setUser(updatedUser);
      }
      setShowEditProfile(false);
      setEditName('');
      setEditPassword('');
    } catch (err) {
      console.error("Profile update failed", err);
    }
  };

  const handleAddUser = async () => {
    if (confirmText !== 'add') {
      showToast(translations[language].invalidConfirmation, 'error');
      return;
    }
    if (!newUserEmail.trim() || !newUserName.trim() || !newUserPassword.trim()) {
      showToast('Por favor, preencha todos os campos obrigatórios.', 'error');
      return;
    }
    try {
      await addDoc(collection(db, 'users'), {
        email: newUserEmail.trim(),
        displayName: newUserName.trim(),
        password: newUserPassword,
        role: 'user',
        isVerified: true,
        createdAt: new Date().toISOString()
      });
      setNewUserEmail('');
      setNewUserName('');
      setNewUserPassword('');
      setConfirmText('');
      setUserToVerify(null);
      showToast(translations[language].addSuccess, 'success');
    } catch (err) {
      console.error("Add user failed", err);
      showToast('Erro ao adicionar usuário. Tente novamente.', 'error');
    }
  };

  const handleDeleteUser = async () => {
    if (confirmText !== 'delete') {
      showToast(translations[language].invalidConfirmation, 'error');
      return;
    }
    if (!userToDelete) return;
    try {
      await deleteDoc(doc(db, 'users', userToDelete.uid));
      setUserToDelete(null);
      setConfirmText('');
      showToast(translations[language].deleteSuccess, 'success');
    } catch (err) {
      console.error("Delete user failed", err);
      showToast('Erro ao excluir usuário.', 'error');
    }
  };

  const handleVerifyUser = async (uid: string) => {
    try {
      await updateDoc(doc(db, 'users', uid), { isVerified: true });
      showToast('Usuário verificado com sucesso!', 'success');
    } catch (err) {
      console.error("Verify user failed", err);
      showToast('Erro ao verificar usuário.', 'error');
    }
  };

  // Handle Change RTA for an agent
  const handleChangeRTA = async () => {
    if (!selectedAgentForRTA || !selectedNewRTA) {
      showToast('Selecione um agente e um novo RTA.', 'error');
      return;
    }

    try {
      const newRTAUser = allUsers.find(u => u.uid === selectedNewRTA) || 
                         rtaOptions.find(r => r.id === selectedNewRTA);
      
      if (!newRTAUser) {
        showToast('RTA não encontrado.', 'error');
        return;
      }

      await updateDoc(doc(db, 'employees', selectedAgentForRTA), {
        createdBy: selectedNewRTA,
        creatorName: 'name' in newRTAUser ? newRTAUser.name : newRTAUser.displayName
      });

      setSelectedAgentForRTA('');
      setSelectedNewRTA('');
      showToast('RTA do agente alterado com sucesso!', 'success');
    } catch (err) {
      console.error("Change RTA failed", err);
      showToast('Erro ao alterar RTA do agente.', 'error');
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
          lob: newEmployeeDept,
          createdBy: user.uid,
          creatorName: user.displayName,
          createdAt: new Date().toISOString()
        });
      }
      setNewEmployeeNames('');
      setNewEmployeeDept('');
      showToast('Agentes adicionados com sucesso!', 'success');
    } catch (err) {
      console.error("Failed to add employees", err);
      showToast('Erro ao adicionar agentes.', 'error');
    }
  };

  const addSingleAgent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !newAgentName.trim() || !newAgentEmail.trim() || !newAgentLob.trim()) {
      showToast('Preencha todos os campos obrigatórios.', 'error');
      return;
    }

    try {
      await addDoc(collection(db, 'employees'), {
        name: newAgentName.trim(),
        email: newAgentEmail.trim(),
        lob: newAgentLob.trim(),
        department: newAgentLob.trim(),
        createdBy: user.uid,
        creatorName: user.displayName,
        createdAt: new Date().toISOString()
      });
      setNewAgentName('');
      setNewAgentEmail('');
      setNewAgentLob('');
      showToast('Agente adicionado com sucesso!', 'success');
    } catch (err) {
      console.error("Failed to add agent", err);
      showToast('Erro ao adicionar agente.', 'error');
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

    const employee = employees.find(emp => emp.id === selectedEmployeeId);
    if (!employee) return;

    const finalSubject = convSubject === 'Others' ? customSubject : convSubject;
    if (!finalSubject.trim()) return;

    try {
      await addDoc(collection(db, 'conversations'), {
        employeeId: selectedEmployeeId,
        employeeName: employee.name,
        employeeLob: employee.lob || employee.department || '-',
        employeeCreatorName: employee.creatorName || 'Unknown',
        date: `${convDate}T${convTime}:00`,
        subject: finalSubject,
        notes: convNotes,
        createdBy: user.uid,
        creatorName: user.displayName
      });
      setConvSubject('Overbreak');
      setCustomSubject('');
      setConvNotes('');
      setActiveTab('history');
      showToast('Reunião registrada com sucesso!', 'success');
    } catch (err) {
      console.error("Failed to log conversation", err);
      showToast('Erro ao registrar reunião.', 'error');
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
      (filterSubject === '' || c.subject === filterSubject)
    );
  }, [conversations, filterEmployee, filterDate, filterSubject]);

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
      <div className="min-h-screen bg-zinc-50 flex items-center justify-center p-6">
        <AnimatePresence mode="wait">
          {isLoggingIn ? (
            <motion.div
              key="logging-in"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.1 }}
              className="flex flex-col items-center gap-4"
            >
              <div className="w-16 h-16 border-4 border-zinc-200 border-t-primary rounded-full animate-spin" />
              <p className="text-zinc-500 font-bold text-xl animate-pulse">{translations[language].welcome}...</p>
            </motion.div>
          ) : (
            <motion.div 
              key="login-form"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="max-w-md w-full bg-white p-8 rounded-2xl shadow-xl shadow-zinc-200/50 border border-zinc-100 text-center"
            >
              <div className="flex justify-center gap-2 mb-6">
                {(['PT', 'ES', 'EN'] as const).map(lang => (
                  <button 
                    key={lang} 
                    onClick={() => setLanguage(lang)}
                    className={`px-3 py-1 rounded-full text-xs font-bold uppercase transition-all ${language === lang ? 'bg-primary text-white' : 'bg-zinc-100 text-zinc-400 hover:bg-zinc-200'}`}
                  >
                    {lang}
                  </button>
                ))}
              </div>
              <div className="w-16 h-16 bg-primary rounded-2xl flex items-center justify-center mx-auto mb-6">
                <History className="text-white w-8 h-8" />
              </div>
              <h1 className="text-2xl font-bold text-zinc-900 mb-2">{translations[language].appTitle}</h1>
              <p className="text-zinc-500 mb-8">{translations[language].appSubtitle}</p>
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
          )}
        </AnimatePresence>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50 flex flex-col">
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
              <button 
                onClick={() => {
                  setEditName(user.displayName);
                  setShowEditProfile(true);
                }}
                className="text-[10px] font-bold text-primary hover:underline uppercase tracking-tighter"
              >
                {translations[language].editProfile}
              </button>
              <p className="text-xs text-zinc-500">{user.email}</p>
              <div className="flex gap-1 mt-1">
                {(['PT', 'ES', 'EN'] as const).map(lang => (
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
              onClick={() => setActiveTab('statistics')}
              className={cn(
                "flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all",
                activeTab === 'statistics' ? "bg-primary text-white shadow-lg shadow-primary/20" : "text-zinc-600 hover:bg-white hover:text-zinc-900"
              )}
            >
              <BarChart3 className="w-4 h-4" />
              {translations[language].statistics}
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

            {user.role === 'admin' && (
              <button 
                onClick={() => setActiveTab('management')}
                className={cn(
                  "flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all",
                  activeTab === 'management' ? "bg-primary text-white shadow-lg shadow-primary/20" : "text-zinc-600 hover:bg-white hover:text-zinc-900"
                )}
              >
                <Users className="w-4 h-4" />
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
                    <Select 
                      label={translations[language].employee}
                      value={selectedEmployeeId}
                      onChange={(e) => setSelectedEmployeeId(e.target.value)}
                      options={employees}
                      placeholder={translations[language].selectEmployee}
                    />
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
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <Select 
                        label={translations[language].filterByEmployee}
                        value={filterEmployee}
                        onChange={(e) => setFilterEmployee(e.target.value)}
                        options={employees}
                        placeholder={translations[language].all}
                      />
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
                          <th className="px-6 py-4 text-xs font-bold text-zinc-500 uppercase tracking-widest border-b border-zinc-100">{translations[language].lob}</th>
                          <th className="px-6 py-4 text-xs font-bold text-zinc-500 uppercase tracking-widest border-b border-zinc-100">{translations[language].rta}</th>
                          <th className="px-6 py-4 text-xs font-bold text-zinc-500 uppercase tracking-widest border-b border-zinc-100">{translations[language].dateTime}</th>
                          <th className="px-6 py-4 text-xs font-bold text-zinc-500 uppercase tracking-widest border-b border-zinc-100">{translations[language].subject}</th>
                          <th className="px-6 py-4 text-xs font-bold text-zinc-500 uppercase tracking-widest border-b border-zinc-100">{translations[language].notes}</th>
                          <th className="px-6 py-4 text-xs font-bold text-zinc-500 uppercase tracking-widest border-b border-zinc-100">{translations[language].createdBy}</th>
                          <th className="px-6 py-4 text-xs font-bold text-zinc-500 uppercase tracking-widest border-b border-zinc-100 text-right">{translations[language].actions}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredConversations.length === 0 ? (
                          <tr>
                            <td colSpan={8} className="px-6 py-12 text-center text-zinc-400 italic">
                              {translations[language].noConversations}
                            </td>
                          </tr>
                        ) : (
                          filteredConversations.map((conv) => (
                            <tr key={conv.id} className="group hover:bg-zinc-50 transition-colors">
                              <td className="px-6 py-4 border-b border-zinc-100">
                                <span className="text-sm font-bold text-zinc-900">{conv.employeeName}</span>
                              </td>
                              <td className="px-6 py-4 border-b border-zinc-100">
                                <span className="text-xs font-medium px-2 py-1 bg-blue-50 text-blue-700 rounded">{conv.employeeLob || '-'}</span>
                              </td>
                              <td className="px-6 py-4 border-b border-zinc-100">
                                <span className="text-sm text-zinc-600">{conv.employeeCreatorName || '-'}</span>
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
                                <span className="text-sm text-zinc-600 font-medium">{conv.creatorName || '-'}</span>
                              </td>
                              <td className="px-6 py-4 border-b border-zinc-100 text-right">
                                <button 
                                  onClick={() => setConversationToDelete(conv.id)}
                                  className="p-2 text-zinc-400 hover:text-red-600 transition-colors"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </motion.div>
              )}

              {activeTab === 'statistics' && (
                <motion.div 
                  key="statistics"
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  className="space-y-8"
                >
                  <div className="text-center mb-8">
                    <h2 className="text-2xl font-bold text-zinc-900">{translations[language].statistics}</h2>
                    <p className="text-sm text-zinc-500">Análise detalhada das notificações e desempenho</p>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* Agentes com mais notificações */}
                    <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm p-6">
                      <h3 className="text-lg font-bold text-zinc-900 mb-4 flex items-center gap-2">
                        <Users className="w-5 h-5 text-primary" />
                        Top Agentes Notificados
                      </h3>
                      <div className="space-y-3">
                        {statisticsData.topAgents.length === 0 ? (
                          <p className="text-sm text-zinc-400 italic">Sem dados ainda</p>
                        ) : (
                          statisticsData.topAgents.map((agent, index) => (
                            <div key={index} className="flex items-center gap-4">
                              <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center text-primary font-bold text-sm">
                                {index + 1}
                              </div>
                              <div className="flex-1">
                                <div className="flex items-center justify-between mb-1">
                                  <span className="text-sm font-medium text-zinc-900">{agent.name}</span>
                                  <span className="text-xs text-zinc-500">{agent.count} notif.</span>
                                </div>
                                <div className="w-full bg-zinc-100 rounded-full h-2 overflow-hidden">
                                  <div 
                                    className="bg-gradient-to-r from-primary to-blue-500 h-full rounded-full transition-all"
                                    style={{ width: `${(agent.count / statisticsData.maxAgentCount) * 100}%` }}
                                  />
                                </div>
                                <span className="text-xs text-zinc-400">{agent.lob}</span>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>

                    {/* Notificações mais frequentes */}
                    <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm p-6">
                      <h3 className="text-lg font-bold text-zinc-900 mb-4 flex items-center gap-2">
                        <FileText className="w-5 h-5 text-green-600" />
                        Tipos de Notificação
                      </h3>
                      <div className="space-y-4">
                        {statisticsData.topSubjects.length === 0 ? (
                          <p className="text-sm text-zinc-400 italic">Sem dados ainda</p>
                        ) : (
                          statisticsData.topSubjects.map((subject, index) => {
                            const colors = ['bg-blue-500', 'bg-green-500', 'bg-yellow-500', 'bg-red-500', 'bg-purple-500'];
                            return (
                              <div key={index}>
                                <div className="flex items-center justify-between mb-2">
                                  <span className="text-sm font-medium text-zinc-900">{subject.subject}</span>
                                  <span className="text-sm font-bold text-zinc-700">{subject.count}</span>
                                </div>
                                <div className="w-full bg-zinc-100 rounded-full h-3 overflow-hidden">
                                  <div 
                                    className={`${colors[index % colors.length]} h-full rounded-full transition-all`}
                                    style={{ width: `${(subject.count / statisticsData.maxSubjectCount) * 100}%` }}
                                  />
                                </div>
                              </div>
                            );
                          })
                        )}
                      </div>
                    </div>

                    {/* LOBs com mais notificações */}
                    <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm p-6">
                      <h3 className="text-lg font-bold text-zinc-900 mb-4 flex items-center gap-2">
                        <BarChart3 className="w-5 h-5 text-purple-600" />
                        Notificações por LOB
                      </h3>
                      <div className="space-y-4">
                        {statisticsData.topLobs.length === 0 ? (
                          <p className="text-sm text-zinc-400 italic">Sem dados ainda</p>
                        ) : (
                          statisticsData.topLobs.map((lob, index) => {
                            const colors = ['bg-purple-500', 'bg-indigo-500', 'bg-pink-500', 'bg-cyan-500', 'bg-teal-500'];
                            const percentage = ((lob.count / conversations.length) * 100).toFixed(1);
                            return (
                              <div key={index}>
                                <div className="flex items-center justify-between mb-2">
                                  <span className="text-sm font-medium text-zinc-900">{lob.lob}</span>
                                  <span className="text-xs text-zinc-500">{lob.count} ({percentage}%)</span>
                                </div>
                                <div className="w-full bg-zinc-100 rounded-full h-3 overflow-hidden">
                                  <div 
                                    className={`${colors[index % colors.length]} h-full rounded-full transition-all`}
                                    style={{ width: `${(lob.count / statisticsData.maxLobCount) * 100}%` }}
                                  />
                                </div>
                              </div>
                            );
                          })
                        )}
                      </div>
                    </div>

                    {/* Notificações por dia da semana */}
                    <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm p-6">
                      <h3 className="text-lg font-bold text-zinc-900 mb-4 flex items-center gap-2">
                        <Calendar className="w-5 h-5 text-orange-600" />
                        Notificações por Dia da Semana
                      </h3>
                      <div className="flex items-end justify-between gap-2 h-48 pt-4">
                        {statisticsData.dayStats.map((day, index) => {
                          const height = statisticsData.maxDayCount > 0 
                            ? (day.count / statisticsData.maxDayCount) * 100 
                            : 0;
                          const colors = ['bg-red-400', 'bg-blue-500', 'bg-green-500', 'bg-yellow-500', 'bg-purple-500', 'bg-pink-500', 'bg-gray-400'];
                          return (
                            <div key={index} className="flex-1 flex flex-col items-center gap-2">
                              <span className="text-xs font-bold text-zinc-600">{day.count}</span>
                              <div 
                                className={`w-full ${colors[index]} rounded-t-lg transition-all`}
                                style={{ height: `${Math.max(height, 5)}%` }}
                              />
                              <span className="text-xs text-zinc-500 font-medium">{day.day.slice(0, 3)}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
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
                        <form onSubmit={addSingleAgent} className="flex flex-col gap-4">
                          <Input 
                            label={translations[language].agentName}
                            value={newAgentName}
                            onChange={(e) => setNewAgentName(e.target.value)}
                            placeholder="Ex: João Silva"
                            required
                          />
                          <Input 
                            label={translations[language].email}
                            type="email"
                            value={newAgentEmail}
                            onChange={(e) => setNewAgentEmail(e.target.value)}
                            placeholder="Ex: joao.silva@empresa.com"
                            required
                          />
                          <Input 
                            label={translations[language].lob}
                            value={newAgentLob}
                            onChange={(e) => setNewAgentLob(e.target.value)}
                            placeholder="Ex: Vendas, Suporte, TI"
                            required
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
                          <p className="text-sm text-zinc-500">{translations[language].employeeListSubtitle(employees.length)}</p>
                        </div>
                        <button 
                          onClick={() => setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')}
                          className="text-sm font-medium text-zinc-500 hover:text-primary transition-colors"
                        >
                          Sort: {sortOrder === 'asc' ? translations[language].sortAsc : translations[language].sortDesc}
                        </button>
                      </div>
                      <Input
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder={translations[language].search}
                      />
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
              {activeTab === 'management' && user.role === 'admin' && (
                <motion.div 
                  key="management"
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  className="space-y-6"
                >
                  {/* Statistics Section */}
                  <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm p-8">
                    <div className="flex items-center gap-3 mb-6">
                      <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                        <BarChart3 className="text-primary w-5 h-5" />
                      </div>
                      <div>
                        <h2 className="text-xl font-bold text-zinc-900">Estatísticas</h2>
                        <p className="text-sm text-zinc-500">Visão geral do sistema</p>
                      </div>
                    </div>

                    {/* Stats Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                      <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-6 border border-blue-200">
                        <p className="text-xs font-bold text-blue-600 uppercase tracking-wider mb-1">Total de Agentes</p>
                        <p className="text-3xl font-bold text-blue-900">{rtaStatistics.totalAgents}</p>
                      </div>
                      <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-6 border border-green-200">
                        <p className="text-xs font-bold text-green-600 uppercase tracking-wider mb-1">Número de RTAs</p>
                        <p className="text-3xl font-bold text-green-900">{rtaStatistics.totalRTAs}</p>
                      </div>
                      <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-6 border border-purple-200">
                        <p className="text-xs font-bold text-purple-600 uppercase tracking-wider mb-1">Quantidade de Registros</p>
                        <p className="text-3xl font-bold text-purple-900">{rtaStatistics.totalRecords}</p>
                      </div>
                    </div>

                    {/* RTA List with Stats */}
                    <div className="border border-zinc-200 rounded-xl overflow-hidden">
                      <div className="bg-zinc-50 px-6 py-3 border-b border-zinc-200">
                        <h3 className="text-sm font-bold text-zinc-700 uppercase tracking-wider">RTAs e seus Agentes</h3>
                      </div>
                      <div className="divide-y divide-zinc-100">
                        {rtaStatistics.rtaList.length === 0 ? (
                          <div className="p-8 text-center text-zinc-400 italic">
                            Nenhum RTA encontrado.
                          </div>
                        ) : (
                          rtaStatistics.rtaList.map((rta, index) => (
                            <div key={rta.id} className="px-6 py-4 flex items-center justify-between hover:bg-zinc-50 transition-colors">
                              <div className="flex items-center gap-4">
                                <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center text-primary font-bold">
                                  {index + 1}
                                </div>
                                <div>
                                  <p className="text-sm font-bold text-zinc-900">{rta.name}</p>
                                  <p className="text-xs text-zinc-500">{rta.agentCount} agente{rta.agentCount !== 1 ? 's' : ''}</p>
                                </div>
                              </div>
                              <div className="flex items-center gap-4">
                                <div className="w-32 bg-zinc-200 rounded-full h-2 overflow-hidden">
                                  <div 
                                    className="bg-primary h-full rounded-full transition-all"
                                    style={{ width: `${rta.percentage}%` }}
                                  />
                                </div>
                                <span className="text-sm font-bold text-zinc-700 w-16 text-right">{rta.percentage}%</span>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Change RTA Section */}
                  <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm p-8">
                    <div className="flex items-center gap-3 mb-6">
                      <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center">
                        <RefreshCw className="text-orange-600 w-5 h-5" />
                      </div>
                      <div>
                        <h2 className="text-xl font-bold text-zinc-900">Alterar RTA</h2>
                        <p className="text-sm text-zinc-500">Modificar o RTA responsável por um agente</p>
                      </div>
                    </div>

                    <div className="flex flex-col md:flex-row gap-4 items-end">
                      <div className="flex-1">
                        <label className="text-xs font-medium text-zinc-500 uppercase tracking-wider block mb-1.5">Agente</label>
                        <select
                          value={selectedAgentForRTA}
                          onChange={(e) => setSelectedAgentForRTA(e.target.value)}
                          className="w-full px-3 py-2 bg-white border border-zinc-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900/10 focus:border-zinc-900 transition-all"
                        >
                          <option value="">-- Selecionar Agente --</option>
                          {employees.map(emp => (
                            <option key={emp.id} value={emp.id}>
                              {emp.name} (RTA atual: {emp.creatorName || 'N/A'})
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="flex-1">
                        <label className="text-xs font-medium text-zinc-500 uppercase tracking-wider block mb-1.5">Novo RTA</label>
                        <select
                          value={selectedNewRTA}
                          onChange={(e) => setSelectedNewRTA(e.target.value)}
                          className="w-full px-3 py-2 bg-white border border-zinc-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900/10 focus:border-zinc-900 transition-all"
                        >
                          <option value="">-- Selecionar Novo RTA --</option>
                          {rtaOptions.map(rta => (
                            <option key={rta.id} value={rta.id}>{rta.name}</option>
                          ))}
                        </select>
                      </div>
                      <Button 
                        onClick={handleChangeRTA}
                        disabled={!selectedAgentForRTA || !selectedNewRTA}
                        className="whitespace-nowrap"
                      >
                        Salvar Alterações
                      </Button>
                    </div>
                  </div>

                  {/* User Management Section */}
                  <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm overflow-hidden">
                    <div className="p-8 border-b border-zinc-100 flex flex-col gap-4">
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div>
                          <h2 className="text-xl font-bold text-zinc-900">{translations[language].userManagement}</h2>
                          <p className="text-sm text-zinc-500">{translations[language].verifyUsers}</p>
                        </div>
                        <Button onClick={() => setUserToVerify({ uid: '', email: '', displayName: '' })} variant="primary">
                          <Plus className="w-4 h-4" />
                          {translations[language].add}
                        </Button>
                      </div>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="bg-zinc-50/50">
                            <th className="px-6 py-4 text-xs font-bold text-zinc-500 uppercase tracking-widest border-b border-zinc-100">User</th>
                            <th className="px-6 py-4 text-xs font-bold text-zinc-500 uppercase tracking-widest border-b border-zinc-100">Email</th>
                            <th className="px-6 py-4 text-xs font-bold text-zinc-500 uppercase tracking-widest border-b border-zinc-100">Status</th>
                            <th className="px-6 py-4 text-xs font-bold text-zinc-500 uppercase tracking-widest border-b border-zinc-100 text-right">{translations[language].actions}</th>
                          </tr>
                        </thead>
                        <tbody>
                          {allUsers.length === 0 ? (
                            <tr>
                              <td colSpan={4} className="px-6 py-12 text-center text-zinc-400 italic">
                                No users found.
                              </td>
                            </tr>
                          ) : (
                            allUsers.map((u) => (
                              <tr key={u.uid} className="group hover:bg-zinc-50 transition-colors">
                                <td className="px-6 py-4 border-b border-zinc-100">
                                  <span className="text-sm font-bold text-zinc-900">{u.displayName}</span>
                                </td>
                                <td className="px-6 py-4 border-b border-zinc-100">
                                  <span className="text-sm text-zinc-500">{u.email}</span>
                                </td>
                                <td className="px-6 py-4 border-b border-zinc-100">
                                  <span className={cn(
                                    "text-xs font-bold px-2 py-1 rounded-md",
                                    u.isVerified ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700"
                                  )}>
                                    {u.isVerified ? translations[language].userVerified : translations[language].pendingVerification}
                                  </span>
                                </td>
                                <td className="px-6 py-4 border-b border-zinc-100 text-right">
                                  <div className="flex justify-end gap-2">
                                    {!u.isVerified && (
                                      <button 
                                        onClick={() => handleVerifyUser(u.uid)}
                                        className="text-xs text-primary font-bold hover:underline"
                                      >
                                        Verify
                                      </button>
                                    )}
                                    <button 
                                      onClick={() => setUserToDelete(u)}
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
      {/* Edit Profile Modal */}
      <AnimatePresence>
        {showEditProfile && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl p-8 max-w-md w-full shadow-xl"
            >
              <h3 className="text-xl font-bold text-zinc-900 mb-6">{translations[language].editProfile}</h3>
              <form onSubmit={handleUpdateProfile} className="flex flex-col gap-4">
                <Input 
                  label={translations[language].newName}
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  placeholder={user.displayName}
                />
                <Input 
                  label={translations[language].newPassword}
                  type="password"
                  value={editPassword}
                  onChange={(e) => setEditPassword(e.target.value)}
                  placeholder="••••"
                />
                <div className="flex justify-end gap-3 mt-4">
                  <Button variant="ghost" onClick={() => setShowEditProfile(false)}>
                    {translations[language].cancel}
                  </Button>
                  <Button type="submit">
                    {translations[language].save}
                  </Button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Add User Modal */}
      <AnimatePresence>
        {userToVerify && (
          <div 
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => {
              setUserToVerify(null);
              setConfirmText('');
              setNewUserName('');
              setNewUserEmail('');
              setNewUserPassword('');
            }}
          >
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl p-8 max-w-md w-full shadow-xl relative"
              onClick={(e) => e.stopPropagation()}
            >
              <button 
                onClick={() => {
                  setUserToVerify(null);
                  setConfirmText('');
                  setNewUserName('');
                  setNewUserEmail('');
                  setNewUserPassword('');
                }}
                className="absolute top-4 right-4 text-zinc-400 hover:text-zinc-600 transition-colors"
              >
                <XCircle className="w-6 h-6" />
              </button>
              <h3 className="text-xl font-bold text-zinc-900 mb-6">{translations[language].add} User</h3>
              <div className="flex flex-col gap-4">
                <Input 
                  label="Name"
                  value={newUserName}
                  onChange={(e) => setNewUserName(e.target.value)}
                />
                <Input 
                  label="Email"
                  value={newUserEmail}
                  onChange={(e) => setNewUserEmail(e.target.value)}
                />
                <Input 
                  label="Password"
                  type="password"
                  value={newUserPassword}
                  onChange={(e) => setNewUserPassword(e.target.value)}
                />
                <div className="mt-4 p-4 bg-zinc-50 rounded-xl border border-zinc-100">
                  <p className="text-xs font-bold text-zinc-500 uppercase mb-2">{translations[language].confirmAdd}</p>
                  <Input 
                    value={confirmText}
                    onChange={(e) => setConfirmText(e.target.value)}
                    placeholder="add"
                  />
                </div>
                <div className="flex justify-end gap-3 mt-4">
                  <Button variant="ghost" onClick={() => {
                    setUserToVerify(null);
                    setConfirmText('');
                    setNewUserName('');
                    setNewUserEmail('');
                    setNewUserPassword('');
                  }}>
                    {translations[language].cancel}
                  </Button>
                  <Button onClick={handleAddUser} disabled={confirmText !== 'add'}>
                    {translations[language].add}
                  </Button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Delete User Modal */}
      <AnimatePresence>
        {userToDelete && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl p-8 max-w-md w-full shadow-xl"
            >
              <h3 className="text-xl font-bold text-red-600 mb-2">{translations[language].delete} User</h3>
              <p className="text-sm text-zinc-500 mb-6">Are you sure you want to delete <strong>{userToDelete.displayName}</strong>?</p>
              
              <div className="p-4 bg-red-50 rounded-xl border border-red-100 mb-6">
                <p className="text-xs font-bold text-red-600 uppercase mb-2">{translations[language].confirmDeleteAction}</p>
                <Input 
                  value={confirmText}
                  onChange={(e) => setConfirmText(e.target.value)}
                  placeholder="delete"
                />
              </div>

              <div className="flex justify-end gap-3">
                <Button variant="ghost" onClick={() => {
                  setUserToDelete(null);
                  setConfirmText('');
                }}>
                  {translations[language].cancel}
                </Button>
                <Button className="bg-red-600 hover:bg-red-700 text-white" onClick={handleDeleteUser} disabled={confirmText !== 'delete'}>
                  {translations[language].delete}
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
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

      {/* Toast Notifications */}
      <AnimatePresence>
        {toast && (
          <Toast 
            message={toast.message} 
            type={toast.type} 
            onClose={() => setToast(null)} 
          />
        )}
      </AnimatePresence>

    </div>
  );
}
