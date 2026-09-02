import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../api';

const FinancialYearContext = createContext();

/**
 * Calculates Indian Financial Year (April 1 to March 31) from date string or project object
 * E.g. '2025-05-15' -> '2025-2026'
 *      '2025-02-10' -> '2024-2025'
 *      '2022-08-20' -> '2022-2023'
 */
export function getProjectFinancialYear(item) {
  if (!item) return null;
  
  // If a date string was passed directly
  let dateVal = typeof item === 'string' ? item : (item.start_date || item.Start_Date || item.startDate || item.created_at);

  if (dateVal) {
    const d = new Date(dateVal);
    if (!isNaN(d.getTime())) {
      const month = d.getMonth(); // 0 = Jan, 3 = Apr
      const year = d.getFullYear();
      const fyStart = month >= 3 ? year : year - 1;
      return `${fyStart}-${fyStart + 1}`;
    }
  }

  // Fallback to project_id regex e.g. MPL-2024-XXXX or MPL-2026-XXXX
  if (item.project_id || item.Project_ID) {
    const id = item.project_id || item.Project_ID;
    const match = id.match(/MPL-(\d{4})-/i);
    if (match) {
      const yearNum = parseInt(match[1], 10);
      return `${yearNum}-${yearNum + 1}`;
    }
  }

  // Fallback to expected_completion date
  if (item.expected_completion || item.Expected_Completion) {
    const d = new Date(item.expected_completion || item.Expected_Completion);
    if (!isNaN(d.getTime())) {
      const month = d.getMonth();
      const year = d.getFullYear();
      const fyStart = month >= 3 ? year : year - 1;
      return `${fyStart}-${fyStart + 1}`;
    }
  }

  return '2025-2026';
}

export function FinancialYearProvider({ children }) {
  const [financialYear, setFinancialYearState] = useState(() => {
    return localStorage.getItem('selected_fy') || '2025-2026';
  });

  const [availableYears, setAvailableYears] = useState([
    '2025-2026',
    '2024-2025',
    'All Financial Years'
  ]);

  // Dynamically inspect all projects and extract any additional or unique project years
  const registerProjectYears = (projectsList) => {
    if (!projectsList || !Array.isArray(projectsList) || projectsList.length === 0) return;

    setAvailableYears(prevYears => {
      const yearSet = new Set(['2025-2026', '2024-2025']);

      // Add any years already present
      prevYears.forEach(y => {
        if (y !== 'All Financial Years') yearSet.add(y);
      });

      // Extract years from all provided projects
      projectsList.forEach(p => {
        const fy = getProjectFinancialYear(p);
        if (fy) {
          yearSet.add(fy);
        }
      });

      // Sort descending (e.g. '2026-2027', '2025-2026', '2024-2025', '2023-2024')
      const sortedYears = Array.from(yearSet).sort((a, b) => {
        const aStart = parseInt(a.split('-')[0], 10) || 0;
        const bStart = parseInt(b.split('-')[0], 10) || 0;
        return bStart - aStart;
      });

      // Always include 'All Financial Years' at the end
      return [...sortedYears, 'All Financial Years'];
    });
  };

  // Initial load: fetch projects and dynamically populate available financial years
  useEffect(() => {
    api.getProjects().then(data => {
      if (Array.isArray(data)) {
        registerProjectYears(data);
      }
    }).catch(err => {
      console.warn("Could not auto-register project financial years:", err);
    });
  }, []);

  const setFinancialYear = (fy) => {
    setFinancialYearState(fy);
    localStorage.setItem('selected_fy', fy);
  };

  const filterProjectsByFY = (projects, targetFY = financialYear) => {
    if (!projects || !Array.isArray(projects)) return [];
    if (!targetFY || targetFY === 'All Financial Years' || targetFY === 'All Years') {
      return projects;
    }
    return projects.filter(p => {
      return getProjectFinancialYear(p) === targetFY;
    });
  };

  return (
    <FinancialYearContext.Provider value={{
      financialYear,
      setFinancialYear,
      availableYears,
      registerProjectYears,
      filterProjectsByFY,
      getProjectFinancialYear
    }}>
      {children}
    </FinancialYearContext.Provider>
  );
}

export function useFinancialYear() {
  const context = useContext(FinancialYearContext);
  if (!context) {
    throw new Error('useFinancialYear must be used within a FinancialYearProvider');
  }
  return context;
}
