import React, {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import {
  Platform,
  ScrollView,
  StyleSheet,
  TextInput,
  type TextInputSelectionChangeEventData,
  View,
  type NativeSyntheticEvent,
} from "react-native";

import { FONT_FAMILY_MAP } from "@/constants/defaultThemes";
import { useNotes } from "@/contexts/NotesContext";
import type { Shortcut } from "@/contexts/ShortcutsContext";
import { useTheme } from "@/contexts/ThemeContext";

const PAIR_OPEN_TO_CLOSE: Record<string, string> = {
  '"': '"',
  "'": "'",
  "(": ")",
  "[": "]",
  "{": "}",
  "`": "`",
  "\u201c": "\u201d",
  "\u2018": "\u2019",
  "«": "»",
};

const CLOSE_CHARS = new Set(Object.values(PAIR_OPEN_TO_CLOSE));

type Selection = { start: number; end: number };

export type EditorHandle = {
  applyShortcut: (s: Shortcut) => void;
  focus: () => void;
  insertText: (text: string) => void;
};

type EditorProps = {
  noteId: string;
  initialContent: string;
  autoFocus?: boolean;
  onChangeContent?: (content: string) => void;
  onSelectionChange?: (sel: Selection) => void;
  registerHandle?: (h: EditorHandle | null) => void;
};

export function Editor({
  noteId,
  initialContent,
  autoFocus = false,
  onChangeContent,
  onSelectionChange,
  registerHandle,
}: EditorProps) {
  const { activeTheme } = useTheme();
  const { updateNoteContent } = useNotes();
  const c = activeTheme.colors;

  const [content, setContent] = useState(initialContent);
  const cursorRef = useRef<Selection>({
    start: initialContent.length,
    end: initialContent.length,
  });
  const [forcedSelection, setForcedSelection] = useState<Selection | undefined>(
    undefined,
  );
  const inputRef = useRef<TextInput>(null);

  // Reset content when note changes
  useEffect(() => {
    setContent(initialContent);
    cursorRef.current = {
      start: initialContent.length,
      end: initialContent.length,
    };
  }, [noteId, initialContent]);

  // Persist content with debounce
  useEffect(() => {
    const t = setTimeout(() => {
      updateNoteContent(noteId, content);
      onChangeContent?.(content);
    }, 250);
    return () => clearTimeout(t);
  }, [content, noteId, updateNoteContent, onChangeContent]);

  // Clear forced selection after one render cycle
  useEffect(() => {
    if (!forcedSelection) return;
    const t = setTimeout(() => setForcedSelection(undefined), 30);
    return () => clearTimeout(t);
  }, [forcedSelection]);

  const handleSelectionChange = useCallback(
    (e: NativeSyntheticEvent<TextInputSelectionChangeEventData>) => {
      cursorRef.current = e.nativeEvent.selection;
      onSelectionChange?.(e.nativeEvent.selection);
    },
    [onSelectionChange],
  );

  const setCursor = useCallback((position: number) => {
    cursorRef.current = { start: position, end: position };
    setForcedSelection({ start: position, end: position });
  }, []);

  const handleChangeText = useCallback(
    (newText: string) => {
      const oldText = content;
      const oldStart = cursorRef.current.start;
      const oldEnd = cursorRef.current.end;
      const lenDiff = newText.length - oldText.length;

      // Single character insertion at cursor (typical typing)
      if (lenDiff === 1 && oldStart === oldEnd) {
        const insertedAt = oldStart;
        const insertedChar = newText[insertedAt] ?? "";
        const charAfterCursor = oldText[oldStart] ?? "";

        // Smart enter: cursor is right before a closing pair char and user pressed Enter.
        // Skip the line break, jump cursor past the closing char.
        if (insertedChar === "\n" && CLOSE_CHARS.has(charAfterCursor)) {
          setContent(oldText);
          setCursor(oldStart + 1);
          return;
        }

        // Auto-pair: opening pair char typed -> insert matching close, cursor in between.
        if (PAIR_OPEN_TO_CLOSE[insertedChar]) {
          // Don't auto-pair if next char is the same (avoid "" -> """")
          const closeChar = PAIR_OPEN_TO_CLOSE[insertedChar];
          if (charAfterCursor !== closeChar) {
            const updated =
              newText.slice(0, insertedAt + 1) +
              closeChar +
              newText.slice(insertedAt + 1);
            setContent(updated);
            setCursor(insertedAt + 1);
            return;
          }
        }

        // Skip-over: typed a closing char that's already there
        if (CLOSE_CHARS.has(insertedChar) && charAfterCursor === insertedChar) {
          setContent(oldText);
          setCursor(oldStart + 1);
          return;
        }
      }

      setContent(newText);
    },
    [content, setCursor],
  );

  const applyShortcut = useCallback(
    (s: Shortcut) => {
      const start = cursorRef.current.start;
      const end = cursorRef.current.end;
      const before = content.slice(0, start);
      const middle = content.slice(start, end);
      const after = content.slice(end);

      if (s.kind === "insert") {
        const updated = before + s.payload + after;
        setContent(updated);
        setCursor(start + s.payload.length);
        return;
      }

      if (s.kind === "wrap") {
        const open = s.payload;
        const close = s.closing ?? s.payload;
        if (middle.length > 0) {
          const updated = before + open + middle + close + after;
          setContent(updated);
          setCursor(end + open.length + close.length);
        } else {
          const updated = before + open + close + after;
          setContent(updated);
          setCursor(start + open.length);
        }
        return;
      }

      if (s.kind === "pair") {
        const open = s.payload;
        const close = s.closing ?? s.payload;
        if (middle.length > 0) {
          const updated = before + open + middle + close + after;
          setContent(updated);
          setCursor(end + open.length + close.length);
        } else {
          const updated = before + open + close + after;
          setContent(updated);
          setCursor(start + open.length);
        }
        return;
      }
    },
    [content, setCursor],
  );

  const focus = useCallback(() => {
    inputRef.current?.focus();
  }, []);

  const insertText = useCallback(
    (text: string) => {
      const start = cursorRef.current.start;
      const end = cursorRef.current.end;
      const updated = content.slice(0, start) + text + content.slice(end);
      setContent(updated);
      setCursor(start + text.length);
    },
    [content, setCursor],
  );

  // Expose handle to parent
  useEffect(() => {
    registerHandle?.({ applyShortcut, focus, insertText });
    return () => registerHandle?.(null);
  }, [registerHandle, applyShortcut, focus, insertText]);

  const fontFamily = FONT_FAMILY_MAP[activeTheme.fontFamily];
  const lineHeightPx = activeTheme.fontSize * activeTheme.lineHeight;

  return (
    <ScrollView
      style={[styles.scroll, { backgroundColor: c.background }]}
      contentContainerStyle={[
        styles.scrollContent,
        {
          paddingHorizontal: activeTheme.paddingHorizontal,
          paddingVertical: activeTheme.paddingVertical,
        },
      ]}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="interactive"
      showsVerticalScrollIndicator={false}
    >
      <View style={{ width: "100%", maxWidth: activeTheme.maxWidth, alignSelf: "center" }}>
        <TextInput
          ref={inputRef}
          value={content}
          onChangeText={handleChangeText}
          onSelectionChange={handleSelectionChange}
          selection={forcedSelection}
          autoFocus={autoFocus}
          multiline
          textAlignVertical="top"
          autoCorrect
          autoCapitalize="sentences"
          spellCheck
          placeholder="Begin writing…"
          placeholderTextColor={c.mutedText}
          selectionColor={c.selection}
          underlineColorAndroid="transparent"
          scrollEnabled={false}
          style={[
            styles.input,
            {
              color: c.text,
              fontFamily,
              fontSize: activeTheme.fontSize,
              lineHeight: lineHeightPx,
              letterSpacing: activeTheme.letterSpacing,
              minHeight: 400,
              ...(Platform.OS === "web"
                ? ({
                    outlineWidth: 0,
                    outlineStyle: "none",
                  } as object)
                : {}),
            },
          ]}
        />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  input: {
    width: "100%",
    padding: 0,
    margin: 0,
    borderWidth: 0,
  },
});
