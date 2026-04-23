const fs = require('fs');
const path = require('path');

// Update alerts.service.ts
const alertsServicePath = path.join(__dirname, 'frontend/src/services/alerts.service.ts');
let alertsContent = fs.readFileSync(alertsServicePath, 'utf8');
if (!alertsContent.includes('getById:')) {
  alertsContent = alertsContent.replace(
    'getActive: () => api.get<TradeAlert[]>("/alerts?status=ACTIVE"),',
    'getActive: () => api.get<TradeAlert[]>("/alerts?status=ACTIVE"),\n  getById: (id: number) => api.get<TradeAlert>(`/alerts/${id}`),'
  );
  fs.writeFileSync(alertsServicePath, alertsContent);
  console.log('✓ Updated alerts.service.ts');
}

// Update App.tsx
const appPath = path.join(__dirname, 'frontend/src/App.tsx');
let appContent = fs.readFileSync(appPath, 'utf8');
if (!appContent.includes('AlertDetailPage')) {
  appContent = appContent.replace(
    'import { AlertsPage } from "./pages/AlertsPage";',
    'import { AlertsPage } from "./pages/AlertsPage";\nimport { AlertDetailPage } from "./pages/AlertDetailPage";'
  );
  appContent = appContent.replace(
    '<Route path="alerts" element={<AlertsPage />} />',
    '<Route path="alerts" element={<AlertsPage />} />\n          <Route path="alerts/:id" element={<AlertDetailPage />} />'
  );
  fs.writeFileSync(appPath, appContent);
  console.log('✓ Updated App.tsx');
}

// Update AlertsPage.tsx
const alertsPagePath = path.join(__dirname, 'frontend/src/pages/AlertsPage.tsx');
let alertsPageContent = fs.readFileSync(alertsPagePath, 'utf8');
if (!alertsPageContent.includes('useNavigate')) {
  alertsPageContent = alertsPageContent.replace(
    'import { Fragment, useCallback, useMemo, useState } from "react";',
    'import { Fragment, useCallback, useMemo, useState } from "react";\nimport { useNavigate } from "react-router-dom";'
  );
  alertsPageContent = alertsPageContent.replace(
    'export function AlertsPage() {',
    'export function AlertsPage() {\n  const navigate = useNavigate();'
  );
  alertsPageContent = alertsPageContent.replace(
    '<td><strong>{row.pair_symbol}</strong></td>',
    '<td><button style={{background: "none", border: "none", cursor: "pointer", color: "var(--text)", fontWeight: "700", textDecoration: "underline"}} onClick={() => navigate(`/alerts/${row.id}`)}><strong>{row.pair_symbol}</strong></button></td>'
  );
  fs.writeFileSync(alertsPagePath, alertsPageContent);
  console.log('✓ Updated AlertsPage.tsx');
}

console.log('\nAll files updated successfully!');
