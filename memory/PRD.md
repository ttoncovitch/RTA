# PRD - RTA (Registro de Reuniões de Agentes)

## Problema Original
- Remover a tradução em árabe do app
- Fazer funcionar a função "Adicionar RTA" na conta principal "thiago.toncovitch@concentrix.com" no gerenciamento

## Arquitetura
- **Frontend**: React + TypeScript + Vite
- **Backend/Database**: Firebase Firestore
- **Estilização**: Tailwind CSS
- **Animações**: Motion (Framer Motion)

## Personas de Usuário
1. **Admin (Gerente)**: Acesso completo - gestão de usuários, registro de reuniões, visualização de histórico
2. **User (RTA)**: Acesso limitado - registro de reuniões, visualização de histórico próprio

## Requisitos Core (Estáticos)
- Sistema de autenticação local com Firebase
- Registro de reuniões com agentes
- Histórico de reuniões
- Gestão de agentes/funcionários
- Gestão de usuários (admin)
- Suporte multilíngue (PT, ES, EN)
- Exportação para Excel

## O que foi Implementado

### 2026-04-02
1. **Remoção da Tradução Árabe**
   - Removido objeto de tradução `AR` do `translations`
   - Removido 'AR' dos seletores de idioma (login e header)
   - Removido direcionamento RTL (dir="rtl")
   - Atualizado tipo de estado de idioma: `'PT' | 'ES' | 'EN'`

2. **Correção da Função Adicionar RTA**
   - Adicionada validação de campos obrigatórios (nome, email, senha)
   - Adicionado feedback de sucesso/erro via alert
   - Campos são limpos após adição bem-sucedida

## Backlog Priorizado

### P0 (Crítico)
- N/A

### P1 (Alta Prioridade)
- Melhorar UX do modal de adicionar usuário (botão submit ocasionalmente requer force click)

### P2 (Média Prioridade)
- Implementar confirmação visual (toast/snackbar) em vez de alert
- Adicionar busca/filtro na lista de usuários

### P3 (Baixa Prioridade)
- Adicionar mais idiomas se necessário
- Dashboard analytics mais detalhado

## Próximas Tarefas
1. Testar adição de usuário em ambiente de produção com Firebase
2. Monitorar se há mais problemas com a funcionalidade de gestão
