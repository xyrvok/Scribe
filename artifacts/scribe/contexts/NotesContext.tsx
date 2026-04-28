import AsyncStorage from "@react-native-async-storage/async-storage";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

const NOTES_KEY = "scribe.notes.v1";
const FOLDERS_KEY = "scribe.folders.v1";
const ACTIVE_NOTE_KEY = "scribe.activeNote.v1";
const VAULT_NAME_KEY = "scribe.vaultName.v1";

export type NoteFile = {
  id: string;
  name: string;
  folderPath: string;
  ext: "md" | "txt";
  content: string;
  createdAt: number;
  updatedAt: number;
};

export type FolderEntry = {
  path: string;
};

const generateId = () =>
  Date.now().toString() + Math.random().toString(36).slice(2, 9);

const SAMPLE_NOTES: NoteFile[] = [
  {
    id: "welcome",
    name: "Welcome",
    folderPath: "/",
    ext: "md",
    content: `# Welcome to Scribe

A distraction-free writing space inspired by Writer Lite and Pure Writer.

## What you can do here

- Write in Markdown with **bold**, *italic*, \`code\`, and [links](https://example.com)
- Customize fonts, colors, spacing in *Themes*
- Pin notes to the right side for reference while you write
- Open multiple floating windows for side-by-side reading

> The cursor jumps out of quotes when you press Enter. Try it.

Swipe in from the right edge to open the file panel.

---

Happy writing.`,
    createdAt: Date.now() - 1000 * 60 * 60 * 24,
    updatedAt: Date.now() - 1000 * 60 * 60 * 24,
  },
  {
    id: "shortcuts-tip",
    name: "Tips",
    folderPath: "/",
    ext: "md",
    content: `# Tips

## Smart pairs

Type \`"\`, \`(\`, \`[\`, \`{\`, or \`'\` and Scribe inserts the matching close character. Press **Enter** while the cursor sits before a closing pair and the cursor jumps past it instead of breaking the line.

## Custom shortcuts

Open the menu and tap *Shortcuts* to add your own. Each shortcut can:

- Insert plain text (em-dash, ellipsis, signature)
- Wrap selection (markdown bold, italic, code)
- Insert a paired character (smart-pair behavior)

## Pinning

Long-press a note in the file panel to pin it to the top or bottom of the right side. Two pinned notes share the right side half-and-half so you can keep an outline above and references below while you write.`,
    createdAt: Date.now() - 1000 * 60 * 60 * 12,
    updatedAt: Date.now() - 1000 * 60 * 60 * 12,
  },
  {
    id: "journal-jan",
    name: "January",
    folderPath: "/Journal",
    ext: "md",
    content: `# January

A new year. The page is open.

> "Begin doing what you want to do now." — Marie Beynon Ray

What I want to write about this year:

- Slow mornings
- The light through the kitchen window
- The neighbour's cat
- Letters I never sent`,
    createdAt: Date.now() - 1000 * 60 * 60 * 6,
    updatedAt: Date.now() - 1000 * 60 * 60 * 6,
  },
  {
    id: "draft-essay",
    name: "On attention",
    folderPath: "/Drafts",
    ext: "md",
    content: `# On attention

The first draft is mostly about getting the shape down. Don't fix the prose yet. Don't pick at the words. Pour it out and then walk away for an hour.

When you come back, read it aloud. The sentences that make you stumble are the sentences that need work.`,
    createdAt: Date.now() - 1000 * 60 * 30,
    updatedAt: Date.now() - 1000 * 60 * 30,
  },
];

const SAMPLE_FOLDERS: FolderEntry[] = [
  { path: "/" },
  { path: "/Journal" },
  { path: "/Drafts" },
];

type NotesContextValue = {
  notes: NoteFile[];
  folders: FolderEntry[];
  activeNoteId: string | null;
  activeNote: NoteFile | null;
  vaultName: string;
  setVaultName: (name: string) => void;
  setActiveNote: (id: string | null) => void;
  createNote: (folderPath?: string, name?: string) => NoteFile;
  updateNoteContent: (id: string, content: string) => void;
  renameNote: (id: string, name: string) => void;
  moveNote: (id: string, folderPath: string) => void;
  deleteNote: (id: string) => void;
  createFolder: (path: string) => void;
  deleteFolder: (path: string) => void;
  notesInFolder: (folderPath: string) => NoteFile[];
  childFolders: (folderPath: string) => FolderEntry[];
  getNote: (id: string) => NoteFile | undefined;
};

const NotesContext = createContext<NotesContextValue | null>(null);

export function NotesProvider({ children }: { children: React.ReactNode }) {
  const [notes, setNotes] = useState<NoteFile[]>([]);
  const [folders, setFolders] = useState<FolderEntry[]>([]);
  const [activeNoteId, setActiveNoteId] = useState<string | null>(null);
  const [vaultName, setVaultNameState] = useState<string>("My Vault");
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const [n, f, a, v] = await Promise.all([
          AsyncStorage.getItem(NOTES_KEY),
          AsyncStorage.getItem(FOLDERS_KEY),
          AsyncStorage.getItem(ACTIVE_NOTE_KEY),
          AsyncStorage.getItem(VAULT_NAME_KEY),
        ]);
        if (n && f) {
          setNotes(JSON.parse(n));
          setFolders(JSON.parse(f));
        } else {
          setNotes(SAMPLE_NOTES);
          setFolders(SAMPLE_FOLDERS);
        }
        if (a) setActiveNoteId(a);
        else setActiveNoteId("welcome");
        if (v) setVaultNameState(v);
      } catch (err) {
        console.warn("Failed to load notes", err);
        setNotes(SAMPLE_NOTES);
        setFolders(SAMPLE_FOLDERS);
        setActiveNoteId("welcome");
      } finally {
        setHydrated(true);
      }
    })();
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    AsyncStorage.setItem(NOTES_KEY, JSON.stringify(notes)).catch(() => {});
  }, [notes, hydrated]);

  useEffect(() => {
    if (!hydrated) return;
    AsyncStorage.setItem(FOLDERS_KEY, JSON.stringify(folders)).catch(() => {});
  }, [folders, hydrated]);

  useEffect(() => {
    if (!hydrated) return;
    AsyncStorage.setItem(ACTIVE_NOTE_KEY, activeNoteId ?? "").catch(() => {});
  }, [activeNoteId, hydrated]);

  useEffect(() => {
    if (!hydrated) return;
    AsyncStorage.setItem(VAULT_NAME_KEY, vaultName).catch(() => {});
  }, [vaultName, hydrated]);

  const setActiveNote = useCallback((id: string | null) => {
    setActiveNoteId(id);
  }, []);

  const setVaultName = useCallback((name: string) => {
    setVaultNameState(name);
  }, []);

  const createNote = useCallback(
    (folderPath: string = "/", name: string = "Untitled"): NoteFile => {
      const note: NoteFile = {
        id: generateId(),
        name,
        folderPath,
        ext: "md",
        content: "",
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      setNotes((prev) => [note, ...prev]);
      setActiveNoteId(note.id);
      return note;
    },
    [],
  );

  const updateNoteContent = useCallback((id: string, content: string) => {
    setNotes((prev) =>
      prev.map((n) =>
        n.id === id ? { ...n, content, updatedAt: Date.now() } : n,
      ),
    );
  }, []);

  const renameNote = useCallback((id: string, name: string) => {
    setNotes((prev) =>
      prev.map((n) =>
        n.id === id ? { ...n, name, updatedAt: Date.now() } : n,
      ),
    );
  }, []);

  const moveNote = useCallback((id: string, folderPath: string) => {
    setNotes((prev) =>
      prev.map((n) =>
        n.id === id ? { ...n, folderPath, updatedAt: Date.now() } : n,
      ),
    );
  }, []);

  const deleteNote = useCallback(
    (id: string) => {
      setNotes((prev) => prev.filter((n) => n.id !== id));
      if (activeNoteId === id) setActiveNoteId(null);
    },
    [activeNoteId],
  );

  const createFolder = useCallback((path: string) => {
    const cleaned = path.startsWith("/") ? path : `/${path}`;
    setFolders((prev) => {
      if (prev.some((p) => p.path === cleaned)) return prev;
      return [...prev, { path: cleaned }];
    });
  }, []);

  const deleteFolder = useCallback((path: string) => {
    if (path === "/") return;
    setFolders((prev) => prev.filter((f) => f.path !== path));
    setNotes((prev) =>
      prev.map((n) => (n.folderPath === path ? { ...n, folderPath: "/" } : n)),
    );
  }, []);

  const notesInFolder = useCallback(
    (folderPath: string) =>
      notes
        .filter((n) => n.folderPath === folderPath)
        .sort((a, b) => b.updatedAt - a.updatedAt),
    [notes],
  );

  const childFolders = useCallback(
    (folderPath: string): FolderEntry[] => {
      const prefix = folderPath === "/" ? "/" : `${folderPath}/`;
      return folders
        .filter((f) => {
          if (f.path === folderPath) return false;
          if (!f.path.startsWith(prefix)) return false;
          const rest = f.path.slice(prefix.length);
          return rest.length > 0 && !rest.includes("/");
        })
        .sort((a, b) => a.path.localeCompare(b.path));
    },
    [folders],
  );

  const getNote = useCallback(
    (id: string) => notes.find((n) => n.id === id),
    [notes],
  );

  const activeNote = useMemo(
    () => (activeNoteId ? (notes.find((n) => n.id === activeNoteId) ?? null) : null),
    [activeNoteId, notes],
  );

  const value = useMemo(
    () => ({
      notes,
      folders,
      activeNoteId,
      activeNote,
      vaultName,
      setVaultName,
      setActiveNote,
      createNote,
      updateNoteContent,
      renameNote,
      moveNote,
      deleteNote,
      createFolder,
      deleteFolder,
      notesInFolder,
      childFolders,
      getNote,
    }),
    [
      notes,
      folders,
      activeNoteId,
      activeNote,
      vaultName,
      setVaultName,
      setActiveNote,
      createNote,
      updateNoteContent,
      renameNote,
      moveNote,
      deleteNote,
      createFolder,
      deleteFolder,
      notesInFolder,
      childFolders,
      getNote,
    ],
  );

  return (
    <NotesContext.Provider value={value}>{children}</NotesContext.Provider>
  );
}

export function useNotes() {
  const ctx = useContext(NotesContext);
  if (!ctx) throw new Error("useNotes must be used inside NotesProvider");
  return ctx;
}
