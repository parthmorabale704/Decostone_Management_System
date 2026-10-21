import React, { lazy, Suspense, useState, useEffect, useCallback } from 'react';
import { useAuth } from './context/AuthContext';
import { api } from './services/api';
import { useStockSync } from './hooks/useStockSync';
import { Navbar } from './components/Navbar';
import { Sidebar } from './components/Sidebar';
import { TransactionModal } from './components/TransactionModal';
import { MaterialDetailModal } from './components/MaterialDetailModal';

// Load each page only when it is opened, keeping the initial app bundle smaller.
const Login = lazy(() => import('./pages/Login').then(module => ({ default: module.Login })));
const Dashboard = lazy(() => import('./pages/Dashboard').then(module => ({ default: module.Dashboard })));
const Godowns = lazy(() => import('./pages/Godowns').then(module => ({ default: module.Godowns })));
const Categories = lazy(() => import('./pages/Categories').then(module => ({ default: module.Categories })));
const Materials = lazy(() => import('./pages/Materials').then(module => ({ default: module.Materials })));
const StockIn = lazy(() => import('./pages/StockIn').then(module => ({ default: module.StockIn })));
const StockOut = lazy(() => import('./pages/StockOut').then(module => ({ default: module.StockOut })));
const Transfers = lazy(() => import('./pages/Transfers').then(module => ({ default: module.Transfers })));
const Adjustments = lazy(() => import('./pages/Adjustments').then(module => ({ default: module.Adjustments })));
const StockHistory = lazy(() => import('./pages/StockHistory').then(module => ({ default: module.StockHistory })));
const LowStock = lazy(() => import('./pages/LowStock').then(module => ({ default: module.LowStock })));
const Reports = lazy(() => import('./pages/Reports').then(module => ({ default: module.Reports })));
const Users = lazy(() => import('./pages/Users').then(module => ({ default: module.Users })));
const AuditLogs = lazy(() => import('./pages/AuditLogs').then(module => ({ default: module.AuditLogs })));
const Settings = lazy(() => import('./pages/Settings').then(module => ({ default: module.Settings })));
const Operations = lazy(() => import('./pages/Operations').then(module => ({ default: module.Operations })));

export function App() {
  const { user, token, loading } = useAuth();

  // Navigation State
  const [activePage, setActivePage] = useState('dashboard');
  const [selectedCategoryId, setSelectedCategoryId] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const closeSidebar = useCallback(() => setSidebarOpen(false), []);

  // Global Data
  const [godowns, setGodowns] = useState([]);
  const [materials, setMaterials] = useState([]);

  // Modals
  const [transactionModalOpen, setTransactionModalOpen] = useState(false);
  const [transactionType, setTransactionType] = useState('STOCK_IN');
  const [transactionMaterialId, setTransactionMaterialId] = useState(null);
  const [transactionGodownId, setTransactionGodownId] = useState(null);

  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [selectedDetailMaterialId, setSelectedDetailMaterialId] = useState(null);

  const loadGlobalData = async () => {
    if (!token) return;
    try {
      const [gRes, mRes] = await Promise.all([
        api.getGodowns(),
        api.getMaterials({ limit: 300 })
      ]);
      if (gRes.success) setGodowns(gRes.godowns || []);
      if (mRes.success) setMaterials(mRes.materials || []);
    } catch (err) {
      console.error('Failed to load global data:', err);
    }
  };

  useEffect(() => {
    if (token) {
      loadGlobalData();
    }
  }, [token]);

  useStockSync(() => {
    loadGlobalData();
  });

  const handleOpenTransactionModal = (type = 'STOCK_IN', materialId = null, godownId = null) => {
    setTransactionType(type);
    setTransactionMaterialId(materialId);
    setTransactionGodownId(godownId);
    setTransactionModalOpen(true);
  };

  const handleOpenMaterialDetail = (id) => {
    setSelectedDetailMaterialId(id);
    setDetailModalOpen(true);
  };

  const handleSelectCategory = (catId) => {
    setSelectedCategoryId(catId);
    setActivePage('materials');
  };

  const handleSelectPage = (page) => {
    setActivePage(page);
    if (page !== 'materials') setSelectedCategoryId(null);
    setSidebarOpen(false);
  };

  if (loading) {
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'var(--bg-main)',
          color: 'var(--text-muted)'
        }}
      >
        Loading DecoStone MMS...
      </div>
    );
  }

  if (!token || !user) {
    return <Suspense fallback={<div style={{ padding: 48, textAlign: 'center', color: 'var(--text-muted)' }}>Loading...</div>}><Login /></Suspense>;
  }

  // Parse godown page routing (e.g. 'godown-1')
  let currentGodownId = null;
  if (activePage.startsWith('godown-')) {
    currentGodownId = activePage.split('-')[1];
  }

  return (
    <div className="app-container">
      {/* Role-filtered Sidebar */}
      <Sidebar
        activePage={activePage}
        isOpen={sidebarOpen}
        onClose={closeSidebar}
        onSelectPage={handleSelectPage}
        godowns={godowns}
      />

      {/* Main Layout Area */}
      <div className="main-content">
        <Navbar
          onMenuClick={() => setSidebarOpen(true)}
          onOpenTransactionModal={handleOpenTransactionModal}
          onSelectPage={handleSelectPage}
        />

        <main style={{ flex: 1 }}>
          <Suspense fallback={<div style={{ padding: 48, textAlign: 'center', color: 'var(--text-muted)' }}>Loading page...</div>}>
          {activePage === 'dashboard' && (
            <Dashboard
              onOpenTransactionModal={handleOpenTransactionModal}
              onSelectMaterial={handleOpenMaterialDetail}
              onSelectPage={setActivePage}
            />
          )}

          {(activePage === 'godowns' || currentGodownId) && (
            <Godowns
              godownId={currentGodownId}
              onOpenTransactionModal={handleOpenTransactionModal}
              onSelectMaterial={handleOpenMaterialDetail}
            />
          )}

          {activePage === 'categories' && (
            <Categories onSelectCategory={handleSelectCategory} />
          )}

          {activePage === 'materials' && (
            <Materials
              selectedCategoryId={selectedCategoryId}
              onOpenTransactionModal={handleOpenTransactionModal}
              onSelectMaterial={handleOpenMaterialDetail}
            />
          )}

          {activePage === 'stock-in' && (
            <StockIn
              onOpenTransactionModal={handleOpenTransactionModal}
              onSelectMaterial={handleOpenMaterialDetail}
            />
          )}

          {activePage === 'stock-out' && (
            <StockOut
              onOpenTransactionModal={handleOpenTransactionModal}
              onSelectMaterial={handleOpenMaterialDetail}
            />
          )}

          {activePage === 'transfers' && (
            <Transfers
              onOpenTransactionModal={handleOpenTransactionModal}
              onSelectMaterial={handleOpenMaterialDetail}
            />
          )}

          {activePage === 'adjustments' && (
            <Adjustments
              onOpenTransactionModal={handleOpenTransactionModal}
              onSelectMaterial={handleOpenMaterialDetail}
            />
          )}

          {activePage === 'stock-history' && (
            <StockHistory onSelectMaterial={handleOpenMaterialDetail} />
          )}

          {activePage === 'low-stock' && (
            <LowStock
              onOpenTransactionModal={handleOpenTransactionModal}
              onSelectMaterial={handleOpenMaterialDetail}
            />
          )}

          {activePage === 'reports' && <Reports />}

          {activePage === 'users' && <Users />}

          {activePage === 'audit-logs' && <AuditLogs />}

          {activePage === 'settings' && <Settings />}
          {activePage === 'operations' && <Operations />}
          </Suspense>
        </main>
      </div>

      {/* Global Quick Action Modal */}
      <TransactionModal
        isOpen={transactionModalOpen}
        onClose={() => setTransactionModalOpen(false)}
        initialType={transactionType}
        initialMaterialId={transactionMaterialId}
        initialGodownId={transactionGodownId}
        godowns={godowns}
        materials={materials}
        onSuccess={() => {
          loadGlobalData();
        }}
      />

      {/* Global Material Inspection Sheet Modal */}
      <MaterialDetailModal
        isOpen={detailModalOpen}
        materialId={selectedDetailMaterialId}
        onClose={() => setDetailModalOpen(false)}
        onQuickAction={(type, matId, gdnId) => {
          handleOpenTransactionModal(type, matId, gdnId);
        }}
      />
    </div>
  );
}

export default App;
