import { useState, useEffect, useCallback } from 'react';
import { Dimensions, Platform } from 'react-native';
import { WindowLayout, WindowPane } from '../types';
import { FEATURES, DEFAULTS } from '../constants';
import { UserSettingsDAO } from '../database/userSettingsDAO';

export const useWindowLayout = () => {
  const [layout, setLayout] = useState<WindowLayout>(DEFAULTS.windowLayout);
  const [dimensions, setDimensions] = useState(Dimensions.get('window'));
  const [selectedNoteIds, setSelectedNoteIds] = useState<string[]>([]);

  useEffect(() => {
    // Load saved layout from storage
    const loadLayout = async () => {
      try {
        const savedLayout = await UserSettingsDAO.getWindowLayout();
        if (savedLayout) {
          setLayout(JSON.parse(savedLayout));
        }
      } catch (error) {
        console.error('Failed to load window layout:', error);
      }
    };

    loadLayout();
  }, []);

  useEffect(() => {
    const subscription = Dimensions.addEventListener('change', ({ window }) => {
      setDimensions(window);
      adjustLayoutForScreenSize(window);
    });

    return () => subscription?.remove();
  }, []);

  const adjustLayoutForScreenSize = useCallback((window: { width: number; height: number }) => {
    if (!FEATURES.splitView || Platform.OS !== 'windows') {
      return;
    }

    let maxPanes = 4;
    
    if (window.width < 1200) {
      maxPanes = 1;
    } else if (window.width < 1600) {
      maxPanes = 2;
    } else if (window.width < 2000) {
      maxPanes = 3;
    }

    setLayout(prevLayout => {
      if (prevLayout.panes.length <= maxPanes) {
        return prevLayout;
      }

      // Reduce number of panes
      const newPanes = prevLayout.panes.slice(0, maxPanes);
      const evenWidth = 100 / newPanes.length;
      
      const adjustedPanes = newPanes.map(pane => ({
        ...pane,
        width: evenWidth,
      }));

      const newLayoutType = 
        maxPanes === 1 ? 'single' :
        maxPanes === 2 ? 'split-2' :
        maxPanes === 3 ? 'split-3' :
        'split-4';

      return {
        type: newLayoutType,
        panes: adjustedPanes,
      };
    });
  }, []);

  const saveLayout = useCallback(async (newLayout: WindowLayout) => {
    try {
      await UserSettingsDAO.setWindowLayout(JSON.stringify(newLayout));
    } catch (error) {
      console.error('Failed to save window layout:', error);
    }
  }, []);

  const updateLayout = useCallback((newLayout: WindowLayout) => {
    setLayout(newLayout);
    saveLayout(newLayout);
  }, [saveLayout]);

  const openNoteInPane = useCallback((noteId: string, paneId?: string) => {
    setLayout(prevLayout => {
      const newPanes = [...prevLayout.panes];
      
      if (paneId) {
        // Open in specific pane
        const paneIndex = newPanes.findIndex(p => p.id === paneId);
        if (paneIndex !== -1) {
          newPanes[paneIndex] = {
            ...newPanes[paneIndex],
            noteId,
            isActive: true,
          };
          
          // Deactivate other panes
          newPanes.forEach((pane, index) => {
            if (index !== paneIndex) {
              pane.isActive = false;
            }
          });
        }
      } else {
        // Open in active pane or first pane
        const activePaneIndex = newPanes.findIndex(p => p.isActive);
        const targetIndex = activePaneIndex !== -1 ? activePaneIndex : 0;
        
        newPanes[targetIndex] = {
          ...newPanes[targetIndex],
          noteId,
          isActive: true,
        };
      }
      
      const newLayout = {
        ...prevLayout,
        panes: newPanes,
      };
      
      saveLayout(newLayout);
      return newLayout;
    });

    // Update selected note IDs
    setSelectedNoteIds(prev => {
      const newIds = [...prev];
      if (!newIds.includes(noteId)) {
        newIds.push(noteId);
      }
      return newIds;
    });
  }, [saveLayout]);

  const closeNoteInPane = useCallback((paneId: string) => {
    setLayout(prevLayout => {
      const newPanes = prevLayout.panes.map(pane => 
        pane.id === paneId 
          ? { ...pane, noteId: null }
          : pane
      );
      
      const newLayout = {
        ...prevLayout,
        panes: newPanes,
      };
      
      saveLayout(newLayout);
      return newLayout;
    });
  }, [saveLayout]);

  const addPane = useCallback(() => {
    if (!FEATURES.splitView || layout.panes.length >= FEATURES.maxWindowPanes) {
      return;
    }

    setLayout(prevLayout => {
      const newPaneWidth = 100 / (prevLayout.panes.length + 1);
      const adjustedPanes = prevLayout.panes.map(pane => ({
        ...pane,
        width: (pane.width * prevLayout.panes.length) / (prevLayout.panes.length + 1),
        isActive: false,
      }));

      const newPane: WindowPane = {
        id: `pane-${Date.now()}`,
        noteId: null,
        width: newPaneWidth,
        isActive: true,
      };

      const newPanes = [...adjustedPanes, newPane];
      const newLayoutType = 
        newPanes.length === 2 ? 'split-2' :
        newPanes.length === 3 ? 'split-3' :
        'split-4';

      const newLayout = {
        type: newLayoutType,
        panes: newPanes,
      };

      saveLayout(newLayout);
      return newLayout;
    });
  }, [layout.panes.length, saveLayout]);

  const removePane = useCallback((paneId: string) => {
    if (layout.panes.length <= 1) {
      return;
    }

    setLayout(prevLayout => {
      const paneIndex = prevLayout.panes.findIndex(p => p.id === paneId);
      if (paneIndex === -1) return prevLayout;

      const removedPane = prevLayout.panes[paneIndex];
      const newPanes = prevLayout.panes.filter(p => p.id !== paneId);

      // Redistribute the removed pane's width
      const redistributeWidth = removedPane.width / newPanes.length;
      const adjustedPanes = newPanes.map(pane => ({
        ...pane,
        width: pane.width + redistributeWidth,
      }));

      const newLayoutType = 
        adjustedPanes.length === 1 ? 'single' :
        adjustedPanes.length === 2 ? 'split-2' :
        adjustedPanes.length === 3 ? 'split-3' :
        'split-4';

      const newLayout = {
        type: newLayoutType,
        panes: adjustedPanes,
      };

      saveLayout(newLayout);
      return newLayout;
    });
  }, [layout.panes.length, saveLayout]);

  const setActivePane = useCallback((paneId: string) => {
    setLayout(prevLayout => {
      const newPanes = prevLayout.panes.map(pane => ({
        ...pane,
        isActive: pane.id === paneId,
      }));

      const newLayout = {
        ...prevLayout,
        panes: newPanes,
      };

      saveLayout(newLayout);
      return newLayout;
    });
  }, [saveLayout]);

  const resetLayout = useCallback(() => {
    const defaultLayout = DEFAULTS.windowLayout;
    setLayout(defaultLayout);
    saveLayout(defaultLayout);
    setSelectedNoteIds([]);
  }, [saveLayout]);

  const getActivePane = useCallback(() => {
    return layout.panes.find(pane => pane.isActive) || layout.panes[0];
  }, [layout.panes]);

  const canSplit = FEATURES.splitView && Platform.OS === 'windows' && dimensions.width >= 1200;
  const maxPanesForScreen = dimensions.width < 1600 ? 2 : dimensions.width < 2000 ? 3 : 4;

  return {
    layout,
    dimensions,
    selectedNoteIds,
    updateLayout,
    openNoteInPane,
    closeNoteInPane,
    addPane,
    removePane,
    setActivePane,
    resetLayout,
    getActivePane,
    canSplit,
    maxPanesForScreen,
    canAddPane: canSplit && layout.panes.length < Math.min(FEATURES.maxWindowPanes, maxPanesForScreen),
    canRemovePane: layout.panes.length > 1,
  };
};
