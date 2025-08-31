import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  Dimensions,
  Platform,
} from 'react-native';
import { useTheme } from '../../hooks/useTheme';
import { Header } from '../Header/Header';
import { GroupList } from '../GroupList/GroupList';
import { NoteList } from '../NoteList/NoteList';
import { NoteEditor } from '../NoteEditor/NoteEditor';
import { Group, Note, WindowLayout } from '../../types';
import { FEATURES } from '../../constants';

interface MainLayoutProps {
  groups: Group[];
  notes: Note[];
  selectedGroupId: string | null;
  selectedNoteId: string | null;
  searchQuery: string;
  onGroupSelect: (group: Group | null) => void;
  onNoteSelect: (note: Note) => void;
  onSearchChange: (query: string) => void;
  onGroupCreate: (name: string, color: string) => void;
  onGroupUpdate: (group: Group, updates: { name?: string; color?: string }) => void;
  onGroupDelete: (group: Group) => void;
  onNoteCreate: () => void;
  onNoteUpdate: (note: Note) => void;
  onNoteDelete: (note: Note) => void;
  loading?: boolean;
}

export const MainLayout: React.FC<MainLayoutProps> = ({
  groups,
  notes,
  selectedGroupId,
  selectedNoteId,
  searchQuery,
  onGroupSelect,
  onNoteSelect,
  onSearchChange,
  onGroupCreate,
  onGroupUpdate,
  onGroupDelete,
  onNoteCreate,
  onNoteUpdate,
  onNoteDelete,
  loading = false,
}) => {
  const theme = useTheme();
  const [windowLayout, setWindowLayout] = useState<WindowLayout>({
    type: 'single',
    panes: [
      {
        id: 'main',
        noteId: selectedNoteId,
        width: 100,
        isActive: true,
      },
    ],
  });
  
  const [showSidebar, setShowSidebar] = useState(true);
  const [dimensions, setDimensions] = useState(Dimensions.get('window'));

  useEffect(() => {
    const subscription = Dimensions.addEventListener('change', ({ window }) => {
      setDimensions(window);
      
      // Auto-hide sidebar on small screens
      if (window.width < 768) {
        setShowSidebar(false);
      } else {
        setShowSidebar(true);
      }
    });

    return () => subscription?.remove();
  }, []);

  useEffect(() => {
    // Update window layout when selected note changes
    setWindowLayout(prev => ({
      ...prev,
      panes: prev.panes.map(pane => 
        pane.isActive ? { ...pane, noteId: selectedNoteId } : pane
      ),
    }));
  }, [selectedNoteId]);

  const selectedNote = notes.find(note => note.id === selectedNoteId) || null;
  const filteredNotes = searchQuery
    ? notes.filter(note =>
        note.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        note.content_plain.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : selectedGroupId
    ? notes.filter(note => note.group_id === selectedGroupId)
    : notes;

  const selectedGroup = selectedGroupId
    ? groups.find(group => group.id === selectedGroupId)
    : null;

  const getHeaderTitle = (): string => {
    if (searchQuery) return 'Search Results';
    if (selectedGroup) return selectedGroup.name;
    return 'All Notes';
  };

  const getHeaderSubtitle = (): string => {
    const count = filteredNotes.length;
    return `${count} ${count === 1 ? 'note' : 'notes'}`;
  };

  const toggleSidebar = () => {
    setShowSidebar(!showSidebar);
  };

  const renderSidebar = () => (
    <View style={[
      styles.sidebar,
      {
        backgroundColor: theme.colors.background,
        borderRightColor: theme.colors.border,
        width: showSidebar ? (dimensions.width < 768 ? dimensions.width * 0.8 : 280) : 0,
      },
    ]}>
      {showSidebar && (
        <GroupList
          groups={groups}
          selectedGroupId={selectedGroupId}
          onGroupSelect={onGroupSelect}
          onGroupCreate={onGroupCreate}
          onGroupUpdate={onGroupUpdate}
          onGroupDelete={onGroupDelete}
          loading={loading}
        />
      )}
    </View>
  );

  const renderNotesList = () => (
    <View style={[
      styles.notesList,
      {
        backgroundColor: theme.colors.background,
        borderRightColor: theme.colors.border,
        width: dimensions.width < 768 ? '100%' : 320,
      },
    ]}>
      <NoteList
        notes={filteredNotes}
        selectedNoteId={selectedNoteId}
        onNoteSelect={onNoteSelect}
        onNoteCreate={onNoteCreate}
        onNoteDelete={onNoteDelete}
        loading={loading}
        emptyMessage={searchQuery ? 'No notes found' : 'No notes in this group'}
      />
    </View>
  );

  const renderEditor = () => {
    if (!selectedNote && dimensions.width >= 768) {
      return (
        <View style={[styles.editorPlaceholder, { backgroundColor: theme.colors.background }]}>
          <View style={styles.placeholderContent}>
            <Text style={[styles.placeholderText, { color: theme.colors.textSecondary }]}>
              Select a note to start editing
            </Text>
          </View>
        </View>
      );
    }

    if (!selectedNote) {
      return null;
    }

    return (
      <View style={[styles.editor, { backgroundColor: theme.colors.background }]}>
        <NoteEditor
          noteId={selectedNote.id}
          note={selectedNote}
          onNoteUpdate={onNoteUpdate}
        />
      </View>
    );
  };

  const renderWindowsPanes = () => {
    if (!FEATURES.splitView || windowLayout.type === 'single') {
      return renderEditor();
    }

    return (
      <View style={styles.panesContainer}>
        {windowLayout.panes.map((pane, index) => {
          const paneNote = pane.noteId ? notes.find(n => n.id === pane.noteId) : null;
          
          return (
            <View
              key={pane.id}
              style={[
                styles.pane,
                {
                  width: `${pane.width}%`,
                  backgroundColor: theme.colors.background,
                  borderRightWidth: index < windowLayout.panes.length - 1 ? 1 : 0,
                  borderRightColor: theme.colors.border,
                },
              ]}
            >
              {paneNote ? (
                <NoteEditor
                  noteId={paneNote.id}
                  note={paneNote}
                  onNoteUpdate={onNoteUpdate}
                />
              ) : (
                <View style={styles.emptyPane}>
                  <Text style={[styles.emptyPaneText, { color: theme.colors.textSecondary }]}>
                    No note selected
                  </Text>
                </View>
              )}
            </View>
          );
        })}
      </View>
    );
  };

  // Mobile layout (single column)
  if (dimensions.width < 768) {
    return (
      <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <Header
          title={getHeaderTitle()}
          subtitle={getHeaderSubtitle()}
          showSearch
          searchQuery={searchQuery}
          onSearchChange={onSearchChange}
          leftAction={{
            icon: '☰',
            onPress: toggleSidebar,
          }}
        />
        
        {showSidebar ? renderSidebar() : selectedNote ? renderEditor() : renderNotesList()}
      </View>
    );
  }

  // Desktop layout (multi-column)
  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <Header
        title={getHeaderTitle()}
        subtitle={getHeaderSubtitle()}
        showSearch
        searchQuery={searchQuery}
        onSearchChange={onSearchChange}
        leftAction={{
          icon: showSidebar ? '◀' : '▶',
          onPress: toggleSidebar,
        }}
      />
      
      <View style={styles.content}>
        {renderSidebar()}
        {renderNotesList()}
        {FEATURES.splitView ? renderWindowsPanes() : renderEditor()}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    flexDirection: 'row',
  },
  sidebar: {
    borderRightWidth: 1,
    overflow: 'hidden',
  },
  notesList: {
    borderRightWidth: 1,
  },
  editor: {
    flex: 1,
  },
  editorPlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderContent: {
    alignItems: 'center',
  },
  placeholderText: {
    fontSize: 18,
    textAlign: 'center',
  },
  panesContainer: {
    flex: 1,
    flexDirection: 'row',
  },
  pane: {
    borderRightWidth: 1,
  },
  emptyPane: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyPaneText: {
    fontSize: 16,
  },
});

export default MainLayout;
