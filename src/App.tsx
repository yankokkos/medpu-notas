import { useState } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { LoginPage } from './components/LoginPage';
import { Layout } from './components/Layout';
import { Dashboard } from './components/Dashboard';
import { AccountsPage } from './components/AccountsPage';
import { CompaniesPage } from './components/CompaniesPage';
import { PeoplePage } from './components/PeoplePage';
import { TakersPage } from './components/TakersPage';
import { ModelsPage } from './components/ModelsPage';
import { NotasPage } from './components/NotasPage';
import { NFSeWizard } from './components/NFSeWizard';
import { ReportsPage } from './components/ReportsPage';
import { EmployeesPage } from './components/EmployeesPage';
import { SettingsPage } from './components/SettingsPage';
import { Toaster } from './components/Toaster';

function AppContent() {
  const { user, isLoading } = useAuth();
  const [currentPage, setCurrentPage] = useState('dashboard');
  const [isNFSeWizardOpen, setIsNFSeWizardOpen] = useState(false);

  const handleNavigate = (page: string) => {
    setCurrentPage(page);
  };

  const handleEmitNFSe = () => {
    setIsNFSeWizardOpen(true);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user) {
    return <LoginPage />;
  }

  const renderPage = () => {
    switch (currentPage) {
      case 'dashboard':
        return <Dashboard onNavigate={handleNavigate} onEmitNFSe={handleEmitNFSe} />;
      
      case 'contas':
        return <AccountsPage />;
      
      case 'empresas':
        return <CompaniesPage />;
      
      case 'pessoas':
        return <PeoplePage />;
      
      case 'tomadores':
        return <TakersPage />;
      
      case 'notas-fiscais':
        return <NotasPage onEmitNFSe={handleEmitNFSe} />;
      
      case 'modelos':
        return <ModelsPage />;
      
      case 'relatorios':
        return <ReportsPage />;
      
      case 'funcionarios':
        return <EmployeesPage />;
      
      case 'configuracoes':
        return <SettingsPage />;
      
      default:
        return <Dashboard onNavigate={handleNavigate} onEmitNFSe={handleEmitNFSe} />;
    }
  };

  return (
    <>
      <Layout 
        currentPage={currentPage} 
        onNavigate={handleNavigate}
        onEmitNFSe={handleEmitNFSe}
      >
        {renderPage()}
      </Layout>
      
      <NFSeWizard 
        isOpen={isNFSeWizardOpen} 
        onClose={() => setIsNFSeWizardOpen(false)} 
      />
    </>
  );
}



export default function App() {
  return (
    <AuthProvider>
      <AppContent />
      <Toaster />
    </AuthProvider>
  );
}