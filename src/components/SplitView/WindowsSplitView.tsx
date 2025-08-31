import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  StyleSheet,
  Dimensions,
  PanResponder,
  Animated,
  Platform,
} from 'react-native';
import { useTheme } from '../../hooks/useTheme';
import { NoteEditor } from '../NoteEditor/NoteEditor';
import { Note, WindowLayout, WindowPane } from '../../types';
import { FEATURES } from '../../constants';

interface WindowsSplitViewProps {
  notes: Note[];
  layout: WindowLayout;
  onLayoutChange: (layout: WindowLayout) => void;
  onNoteUpdate: (note: Note) => void;
  selectedNoteIds: string[];
  onNoteSelect: (noteId: string, paneId: string) => void;
}

interface ResizablePane {
  id: string;
  noteId: string | null;
  width: number;
  isActive: boolean;
}

export const WindowsSplitView: React.FC<WindowsSplitViewProps> = ({
  notes,
  layout,
  onLayoutChange,
  onNoteUpdate,
  selectedNoteIds,
  onNoteSelect,
}) => {
  const theme = useTheme();
  const [dimensions, setDimensions] = useState(Dimensions.get('window'));
  const [panes, setPanes] = useState<ResizablePane[]>(layout.panes);
  const [dragX] = useState(new Animated.Value(0));

  // Only render on Windows
  if (!FEATURES.splitView || Platform.OS !== 'windows') {
    const firstNote = selectedNoteIds[0] ? notes.find(n => n.id === selectedNoteIds[0]) : null;
    return firstNote ? (
      <NoteEditor
        noteId={firstNote.id}
        note={firstNote}
        onNoteUpdate={onNoteUpdate}
      />
    ) : null;
  }

  useEffect(() => {
    const subscription = Dimensions.addEventListener('change', ({ window }) => {
      setDimensions(window);
      adjustPanesForScreenSize(window.width);
    });

    return () => subscription?.remove();
  }, []);

  useEffect(() => {
    setPanes(layout.panes);
  }, [layout]);

  const adjustPanesForScreenSize = (screenWidth: number) => {
    let maxPanes = 4;
    
    if (screenWidth < 1200) maxPanes = 2;
    else if (screenWidth < 1600) maxPanes = 3;
    
    if (panes.length > maxPanes) {
      const newPanes = panes.slice(0, maxPanes);
      const totalWidth = newPanes.reduce((sum, pane) => sum + pane.width, 0);
      
      // Redistribute width evenly
      const evenWidth = 100 / newPanes.length;
      const adjustedPanes = newPanes.map(pane => ({
        ...pane,
        width: evenWidth,
      }));
      
      setPanes(adjustedPanes);
      onLayoutChange({
        type: maxPanes === 2 ? 'split-2' : maxPanes === 3 ? 'split-3' : 'split-4',
        panes: adjustedPanes,
      });
    }
  };

  const createPanResponder = (paneIndex: number) => {
    return PanResponder.create({
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        dragX.setOffset(0);
      },
      onPanResponderMove: (_, gestureState) => {
        const deltaX = gestureState.dx;
        const screenWidth = dimensions.width - 280 - 320; // Subtract sidebar and notes list
        const deltaPercent = (deltaX / screenWidth) * 100;
        
        updatePaneWidths(paneIndex, deltaPercent);
      },
      onPanResponderRelease: () => {
        dragX.flattenOffset();
      },
    });
  };

  const updatePaneWidths = (paneIndex: number, deltaPercent: number) => {
    if (paneIndex >= panes.length - 1) return;
    
    const newPanes = [...panes];
    const currentPane = newPanes[paneIndex];
    const nextPane = newPanes[paneIndex + 1];
    
    const minWidth = 20; // Minimum 20% width
    const maxCurrentWidth = currentPane.width + nextPane.width - minWidth;
    const maxNextWidth = currentPane.width + nextPane.width - minWidth;
    
    const newCurrentWidth = Math.max(minWidth, Math.min(maxCurrentWidth, currentPane.width + deltaPercent));
    const newNextWidth = Math.max(minWidth, Math.min(maxNextWidth, nextPane.width - deltaPercent));
    
    newPanes[paneIndex] = { ...currentPane, width: newCurrentWidth };
    newPanes[paneIndex + 1] = { ...nextPane, width: newNextWidth };
    
    setPanes(newPanes);
    onLayoutChange({
      ...layout,
      panes: newPanes,
    });
  };

  const addPane = useCallback(() => {
    if (panes.length >= FEATURES.maxWindowPanes) return;
    
    const newPaneWidth = 100 / (panes.length + 1);
    const adjustedPanes = panes.map(pane => ({
      ...pane,
      width: (pane.width * panes.length) / (panes.length + 1),
      isActive: false,
    }));
    
    const newPane: ResizablePane = {
      id: `pane-${Date.now()}`,
      noteId: null,
      width: newPaneWidth,
      isActive: true,
    };
    
    const newPanes = [...adjustedPanes, newPane];
    setPanes(newPanes);
    
    const newLayoutType = 
      newPanes.length === 2 ? 'split-2' :
      newPanes.length === 3 ? 'split-3' :
      'split-4';
    
    onLayoutChange({
      type: newLayoutType,
      panes: newPanes,
    });
  }, [panes, onLayoutChange, layout]);

  const removePane = useCallback((paneId: string) => {
    if (panes.length <= 1) return;
    
    const paneIndex = panes.findIndex(p => p.id === paneId);
    if (paneIndex === -1) return;
    
    const removedPane = panes[paneIndex];
    const newPanes = panes.filter(p => p.id !== paneId);
    
    // Redistribute the removed pane's width
    const redistributeWidth = removedPane.width / newPanes.length;
    const adjustedPanes = newPanes.map(pane => ({
      ...pane,
      width: pane.width + redistributeWidth,
    }));
    
    setPanes(adjustedPanes);
    
    const newLayoutType = 
      adjustedPanes.length === 1 ? 'single' :
      adjustedPanes.length === 2 ? 'split-2' :
      adjustedPanes.length === 3 ? 'split-3' :
      'split-4';
    
    onLayoutChange({
      type: newLayoutType,
      panes: adjustedPanes,
    });
  }, [panes, onLayoutChange]);

  const setActivePane = useCallback((paneId: string) => {
    const newPanes = panes.map(pane => ({
      ...pane,
      isActive: pane.id === paneId,
    }));
    
    setPanes(newPanes);
    onLayoutChange({
      ...layout,
      panes: newPanes,
    });
  }, [panes, layout, onLayoutChange]);

  const renderPane = (pane: ResizablePane, index: number) => {
    const note = pane.noteId ? notes.find(n => n.id === pane.noteId) : null;
    const isLastPane = index === panes.length - 1;
    
    return (
      <View key={pane.id} style={styles.paneContainer}>
        <View
          style={[
            styles.pane,
            {
              width: `${pane.width}%`,
              backgroundColor: theme.colors.background,
              borderColor: pane.isActive ? theme.colors.primary : theme.colors.border,
            },
          ]}
          onTouchStart={() => setActivePane(pane.id)}
        >
          <View style={[styles.paneHeader, { backgroundColor: theme.colors.surface }]}>
            <Text style={[styles.paneTitle, { color: theme.colors.text }]}>
              {note ? note.title : 'Empty Pane'}
            </Text>
            
            <View style={styles.paneActions}>
              {panes.length < FEATURES.maxWindowPanes && (
                <TouchableOpacity
                  style={[styles.paneAction, { backgroundColor: theme.colors.primary }]}
                  onPress={addPane}
                >
                  <Text style={styles.paneActionText}>+</Text>
                </TouchableOpacity>
              )}
              
              {panes.length > 1 && (
                <TouchableOpacity
                  style={[styles.paneAction, { backgroundColor: theme.colors.error }]}
                  onPress={() => removePane(pane.id)}
                >
                  <Text style={styles.paneActionText}>×</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
          
          <View style={styles.paneContent}>
            {note ? (
              <NoteEditor
                noteId={note.id}
                note={note}
                onNoteUpdate={onNoteUpdate}
              />
            ) : (
              <View style={styles.emptyPane}>
                <Text style={[styles.emptyPaneText, { color: theme.colors.textSecondary }]}>
                  Select a note to edit in this pane
                </Text>
              </View>
            )}
          </View>
        </View>
        
        {!isLastPane && (
          <View
            style={[styles.resizeHandle, { backgroundColor: theme.colors.border }]}
            {...createPanResponder(index).panHandlers}
          />
        )}
      </View>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={styles.panesContainer}>
        {panes.map((pane, index) => renderPane(pane, index))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  panesContainer: {
    flex: 1,
    flexDirection: 'row',
  },
  paneContainer: {
    flexDirection: 'row',
  },
  pane: {
    borderWidth: 2,
    borderRadius: 8,
    margin: 4,
    overflow: 'hidden',
  },
  paneHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  paneTitle: {
    fontSize: 14,
    fontWeight: '600',
    flex: 1,
  },
  paneActions: {
    flexDirection: 'row',
  },
  paneAction: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 4,
  },
  paneActionText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  paneContent: {
    flex: 1,
  },
  emptyPane: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyPaneText: {
    fontSize: 16,
    textAlign: 'center',
  },
  resizeHandle: {
    width: 4,
    cursor: 'col-resize',
  },
});

export default WindowsSplitView;
