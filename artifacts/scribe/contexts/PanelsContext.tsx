import AsyncStorage from "@react-native-async-storage/async-storage";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

const PINNED_KEY = "scribe.pinned.v1";
const FLOATING_KEY = "scribe.floating.v1";
const VIEW_MODE_KEY = "scribe.viewMode.v1";
const WORD_COUNT_KEY = "scribe.showWordCount.v1";

export type FileViewMode = "tree" | "list" | "folders";

export type PinnedSlot = "top" | "bottom";

export type PinnedItem = {
  slot: PinnedSlot;
  noteId: string;
};

export type FloatingWindow = {
  id: string;
  noteId: string;
  x: number;
  y: number;
  width: number;
  height: number;
  z: number;
  collapsed: boolean;
};

const generateId = () =>
  Date.now().toString() + Math.random().toString(36).slice(2, 8);

type PanelsContextValue = {
  // Side panel (right swipe)
  rightPanelOpen: boolean;
  setRightPanelOpen: (v: boolean) => void;
  toggleRightPanel: () => void;

  // Left menu
  leftMenuOpen: boolean;
  setLeftMenuOpen: (v: boolean) => void;
  toggleLeftMenu: () => void;

  // Pinned
  pinned: PinnedItem[];
  setPinned: (slot: PinnedSlot, noteId: string | null) => void;
  clearPinned: () => void;

  // Floating windows
  floatingWindows: FloatingWindow[];
  openFloating: (noteId: string) => void;
  closeFloating: (id: string) => void;
  updateFloating: (id: string, partial: Partial<FloatingWindow>) => void;
  bringToFront: (id: string) => void;
  closeAllFloating: () => void;

  // Search overlay
  searchOpen: boolean;
  setSearchOpen: (v: boolean) => void;

  // File browser view mode
  viewMode: FileViewMode;
  setViewMode: (m: FileViewMode) => void;

  // Editor floating word count toggle
  showWordCount: boolean;
  setShowWordCount: (v: boolean) => void;
};

const PanelsContext = createContext<PanelsContextValue | null>(null);

export function PanelsProvider({ children }: { children: React.ReactNode }) {
  const [rightPanelOpen, setRightPanelOpen] = useState(false);
  const [leftMenuOpen, setLeftMenuOpen] = useState(false);
  const [pinned, setPinnedState] = useState<PinnedItem[]>([]);
  const [floatingWindows, setFloatingWindows] = useState<FloatingWindow[]>([]);
  const [searchOpen, setSearchOpen] = useState(false);
  const [viewMode, setViewModeState] = useState<FileViewMode>("tree");
  const [showWordCount, setShowWordCountState] = useState(true);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const [p, f, vm, wc] = await Promise.all([
          AsyncStorage.getItem(PINNED_KEY),
          AsyncStorage.getItem(FLOATING_KEY),
          AsyncStorage.getItem(VIEW_MODE_KEY),
          AsyncStorage.getItem(WORD_COUNT_KEY),
        ]);
        if (p) setPinnedState(JSON.parse(p));
        if (f) setFloatingWindows(JSON.parse(f));
        if (vm === "tree" || vm === "list" || vm === "folders")
          setViewModeState(vm);
        if (wc !== null) setShowWordCountState(wc === "1");
      } catch (err) {
        console.warn("Failed to load panels", err);
      } finally {
        setHydrated(true);
      }
    })();
  }, []);

  const setViewMode = useCallback((m: FileViewMode) => {
    setViewModeState(m);
    AsyncStorage.setItem(VIEW_MODE_KEY, m).catch(() => {});
  }, []);

  const setShowWordCount = useCallback((v: boolean) => {
    setShowWordCountState(v);
    AsyncStorage.setItem(WORD_COUNT_KEY, v ? "1" : "0").catch(() => {});
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    AsyncStorage.setItem(PINNED_KEY, JSON.stringify(pinned)).catch(() => {});
  }, [pinned, hydrated]);

  useEffect(() => {
    if (!hydrated) return;
    AsyncStorage.setItem(FLOATING_KEY, JSON.stringify(floatingWindows)).catch(
      () => {},
    );
  }, [floatingWindows, hydrated]);

  const toggleRightPanel = useCallback(
    () => setRightPanelOpen((v) => !v),
    [],
  );
  const toggleLeftMenu = useCallback(() => setLeftMenuOpen((v) => !v), []);

  const setPinned = useCallback((slot: PinnedSlot, noteId: string | null) => {
    setPinnedState((prev) => {
      const others = prev.filter((p) => p.slot !== slot);
      if (!noteId) return others;
      return [...others, { slot, noteId }];
    });
  }, []);

  const clearPinned = useCallback(() => setPinnedState([]), []);

  const openFloating = useCallback(
    (noteId: string) => {
      setFloatingWindows((prev) => {
        // If already open, just bring to front
        const existing = prev.find((w) => w.noteId === noteId);
        if (existing) {
          const maxZ = Math.max(...prev.map((w) => w.z), 0);
          return prev.map((w) =>
            w.id === existing.id
              ? { ...w, z: maxZ + 1, collapsed: false }
              : w,
          );
        }
        const maxZ = prev.reduce((acc, w) => Math.max(acc, w.z), 0);
        const offset = prev.length * 28;
        const next: FloatingWindow = {
          id: generateId(),
          noteId,
          x: 40 + offset,
          y: 80 + offset,
          width: 320,
          height: 380,
          z: maxZ + 1,
          collapsed: false,
        };
        return [...prev, next];
      });
    },
    [],
  );

  const closeFloating = useCallback((id: string) => {
    setFloatingWindows((prev) => prev.filter((w) => w.id !== id));
  }, []);

  const updateFloating = useCallback(
    (id: string, partial: Partial<FloatingWindow>) => {
      setFloatingWindows((prev) =>
        prev.map((w) => (w.id === id ? { ...w, ...partial } : w)),
      );
    },
    [],
  );

  const bringToFront = useCallback((id: string) => {
    setFloatingWindows((prev) => {
      const maxZ = Math.max(...prev.map((w) => w.z), 0);
      return prev.map((w) => (w.id === id ? { ...w, z: maxZ + 1 } : w));
    });
  }, []);

  const closeAllFloating = useCallback(() => setFloatingWindows([]), []);

  const value = useMemo(
    () => ({
      rightPanelOpen,
      setRightPanelOpen,
      toggleRightPanel,
      leftMenuOpen,
      setLeftMenuOpen,
      toggleLeftMenu,
      pinned,
      setPinned,
      clearPinned,
      floatingWindows,
      openFloating,
      closeFloating,
      updateFloating,
      bringToFront,
      closeAllFloating,
      searchOpen,
      setSearchOpen,
      viewMode,
      setViewMode,
      showWordCount,
      setShowWordCount,
    }),
    [
      rightPanelOpen,
      toggleRightPanel,
      leftMenuOpen,
      toggleLeftMenu,
      pinned,
      setPinned,
      clearPinned,
      floatingWindows,
      openFloating,
      closeFloating,
      updateFloating,
      bringToFront,
      closeAllFloating,
      searchOpen,
      viewMode,
      setViewMode,
      showWordCount,
      setShowWordCount,
    ],
  );

  return (
    <PanelsContext.Provider value={value}>{children}</PanelsContext.Provider>
  );
}

export function usePanels() {
  const ctx = useContext(PanelsContext);
  if (!ctx) throw new Error("usePanels must be used inside PanelsProvider");
  return ctx;
}
