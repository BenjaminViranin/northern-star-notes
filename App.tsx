/**
 * Northern Star Notes App
 * A simple note-taking application with SQLite storage
 */

import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  Alert,
  StatusBar,
  useColorScheme,
} from 'react-native';
import SQLite from 'react-native-sqlite-storage';

// Enable promise for SQLite
SQLite.enablePromise(true);

interface Note {
  id: number;
  title: string;
  content: string;
  created_at: string;
  updated_at: string;
}

function App(): React.JSX.Element {
  const isDarkMode = useColorScheme() === 'dark';
  const [notes, setNotes] = useState<Note[]>([]);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [db, setDb] = useState<SQLite.SQLiteDatabase | null>(null);

  // Initialize database
  useEffect(() => {
    initDatabase();
  }, []);

  const initDatabase = async () => {
    try {
      const database = await SQLite.openDatabase({
        name: 'NotesDB.db',
        location: 'default',
      });

      await database.executeSql(`
        CREATE TABLE IF NOT EXISTS notes (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          title TEXT NOT NULL,
          content TEXT NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);

      setDb(database);
      loadNotes(database);
    } catch (error) {
      console.error('Database initialization error:', error);
      Alert.alert('Error', 'Failed to initialize database');
    }
  };

  const loadNotes = async (database: SQLite.SQLiteDatabase) => {
    try {
      const results = await database.executeSql(
        'SELECT * FROM notes ORDER BY updated_at DESC',
      );

      const loadedNotes: Note[] = [];
      const rows = results[0].rows;

      for (let i = 0; i < rows.length; i++) {
        loadedNotes.push(rows.item(i));
      }

      setNotes(loadedNotes);
    } catch (error) {
      console.error('Load notes error:', error);
      Alert.alert('Error', 'Failed to load notes');
    }
  };

  const saveNote = async () => {
    if (!db || !title.trim() || !content.trim()) {
      Alert.alert('Error', 'Please fill in both title and content');
      return;
    }

    try {
      if (editingId) {
        // Update existing note
        await db.executeSql(
          'UPDATE notes SET title = ?, content = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
          [title.trim(), content.trim(), editingId],
        );
      } else {
        // Create new note
        await db.executeSql(
          'INSERT INTO notes (title, content) VALUES (?, ?)',
          [title.trim(), content.trim()],
        );
      }

      setTitle('');
      setContent('');
      setEditingId(null);
      loadNotes(db);
    } catch (error) {
      console.error('Save note error:', error);
      Alert.alert('Error', 'Failed to save note');
    }
  };

  const editNote = (note: Note) => {
    setTitle(note.title);
    setContent(note.content);
    setEditingId(note.id);
  };

  const deleteNote = async (id: number) => {
    if (!db) return;

    Alert.alert('Delete Note', 'Are you sure you want to delete this note?', [
      {text: 'Cancel', style: 'cancel'},
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await db.executeSql('DELETE FROM notes WHERE id = ?', [id]);
            loadNotes(db);
          } catch (error) {
            console.error('Delete note error:', error);
            Alert.alert('Error', 'Failed to delete note');
          }
        },
      },
    ]);
  };

  const cancelEdit = () => {
    setTitle('');
    setContent('');
    setEditingId(null);
  };

  const renderNote = ({item}: {item: Note}) => (
    <View style={[styles.noteItem, isDarkMode && styles.noteItemDark]}>
      <Text style={[styles.noteTitle, isDarkMode && styles.noteTitleDark]}>
        {item.title}
      </Text>
      <Text style={[styles.noteContent, isDarkMode && styles.noteContentDark]}>
        {item.content}
      </Text>
      <Text style={[styles.noteDate, isDarkMode && styles.noteDateDark]}>
        {new Date(item.updated_at).toLocaleDateString()}
      </Text>
      <View style={styles.noteActions}>
        <TouchableOpacity
          style={styles.editButton}
          onPress={() => editNote(item)}>
          <Text style={styles.buttonText}>Edit</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.deleteButton}
          onPress={() => deleteNote(item.id)}>
          <Text style={styles.buttonText}>Delete</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={[styles.container, isDarkMode && styles.containerDark]}>
      <StatusBar
        barStyle={isDarkMode ? 'light-content' : 'dark-content'}
        backgroundColor={isDarkMode ? '#1a1a1a' : '#f5f5f5'}
      />

      <Text style={[styles.header, isDarkMode && styles.headerDark]}>
        📝 Northern Star Notes
      </Text>

      <View style={styles.inputContainer}>
        <TextInput
          style={[styles.titleInput, isDarkMode && styles.inputDark]}
          placeholder="Note title..."
          placeholderTextColor={isDarkMode ? '#888' : '#666'}
          value={title}
          onChangeText={setTitle}
        />
        <TextInput
          style={[styles.contentInput, isDarkMode && styles.inputDark]}
          placeholder="Write your note here..."
          placeholderTextColor={isDarkMode ? '#888' : '#666'}
          value={content}
          onChangeText={setContent}
          multiline
          numberOfLines={4}
        />
        <View style={styles.buttonContainer}>
          <TouchableOpacity style={styles.saveButton} onPress={saveNote}>
            <Text style={styles.buttonText}>
              {editingId ? 'Update Note' : 'Save Note'}
            </Text>
          </TouchableOpacity>
          {editingId && (
            <TouchableOpacity style={styles.cancelButton} onPress={cancelEdit}>
              <Text style={styles.buttonText}>Cancel</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      <FlatList
        data={notes}
        renderItem={renderNote}
        keyExtractor={item => item.id.toString()}
        style={styles.notesList}
        ListEmptyComponent={
          <Text style={[styles.emptyText, isDarkMode && styles.emptyTextDark]}>
            No notes yet. Create your first note above! ✨
          </Text>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    padding: 20,
  },
  containerDark: {
    backgroundColor: '#1a1a1a',
  },
  header: {
    fontSize: 28,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 20,
    color: '#333',
  },
  headerDark: {
    color: '#fff',
  },
  inputContainer: {
    marginBottom: 20,
  },
  titleInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#fff',
    marginBottom: 10,
    color: '#333',
  },
  contentInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#fff',
    marginBottom: 10,
    minHeight: 100,
    textAlignVertical: 'top',
    color: '#333',
  },
  inputDark: {
    backgroundColor: '#2a2a2a',
    borderColor: '#444',
    color: '#fff',
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 10,
  },
  saveButton: {
    backgroundColor: '#007AFF',
    padding: 12,
    borderRadius: 8,
    flex: 1,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#FF3B30',
    padding: 12,
    borderRadius: 8,
    flex: 1,
    alignItems: 'center',
  },
  editButton: {
    backgroundColor: '#FF9500',
    padding: 8,
    borderRadius: 6,
    flex: 1,
    alignItems: 'center',
    marginRight: 5,
  },
  deleteButton: {
    backgroundColor: '#FF3B30',
    padding: 8,
    borderRadius: 6,
    flex: 1,
    alignItems: 'center',
    marginLeft: 5,
  },
  buttonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  notesList: {
    flex: 1,
  },
  noteItem: {
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 8,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#eee',
  },
  noteItemDark: {
    backgroundColor: '#2a2a2a',
    borderColor: '#444',
  },
  noteTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 5,
    color: '#333',
  },
  noteTitleDark: {
    color: '#fff',
  },
  noteContent: {
    fontSize: 14,
    marginBottom: 10,
    color: '#666',
  },
  noteContentDark: {
    color: '#ccc',
  },
  noteDate: {
    fontSize: 12,
    color: '#999',
    marginBottom: 10,
  },
  noteDateDark: {
    color: '#888',
  },
  noteActions: {
    flexDirection: 'row',
    gap: 10,
  },
  emptyText: {
    textAlign: 'center',
    fontSize: 16,
    color: '#666',
    marginTop: 50,
  },
  emptyTextDark: {
    color: '#ccc',
  },
});

export default App;
