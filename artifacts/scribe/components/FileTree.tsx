import { Feather } from "@expo/vector-icons";
import React, { useMemo, useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { useNotes, type NoteFile } from "@/contexts/NotesContext";
import { useTheme } from "@/contexts/ThemeContext";

type FileTreeProps = {
  onOpenNote: (id: string) => void;
  onLongPressNote: (id: string) => void;
  activeNoteId: string | null;
};

type TreeNode = {
  type: "folder" | "file";
  name: string;
  path: string;
  noteId?: string;
  children?: TreeNode[];
};

function buildTree(
  folderPath: string,
  notes: NoteFile[],
  childFoldersOf: (path: string) => { path: string }[],
): TreeNode[] {
  const folderChildren: TreeNode[] = childFoldersOf(folderPath).map((f) => {
    const name = f.path.split("/").filter(Boolean).pop() ?? "/";
    return {
      type: "folder",
      name,
      path: f.path,
      children: buildTree(f.path, notes, childFoldersOf),
    };
  });
  const fileChildren: TreeNode[] = notes
    .filter((n) => n.folderPath === folderPath)
    .sort((a, b) => b.updatedAt - a.updatedAt)
    .map((n) => ({
      type: "file",
      name: `${n.name}.${n.ext}`,
      path: `${folderPath === "/" ? "" : folderPath}/${n.name}.${n.ext}`,
      noteId: n.id,
    }));
  return [...folderChildren, ...fileChildren];
}

function TreeRow({
  node,
  depth,
  expanded,
  toggleExpand,
  onOpenNote,
  onLongPressNote,
  activeNoteId,
}: {
  node: TreeNode;
  depth: number;
  expanded: Set<string>;
  toggleExpand: (path: string) => void;
  onOpenNote: (id: string) => void;
  onLongPressNote: (id: string) => void;
  activeNoteId: string | null;
}) {
  const { activeTheme } = useTheme();
  const c = activeTheme.colors;
  const isFolder = node.type === "folder";
  const isOpen = isFolder && expanded.has(node.path);
  const active = node.noteId && node.noteId === activeNoteId;

  return (
    <>
      <Pressable
        onPress={() => {
          if (isFolder) toggleExpand(node.path);
          else if (node.noteId) onOpenNote(node.noteId);
        }}
        onLongPress={() => {
          if (node.noteId) onLongPressNote(node.noteId);
        }}
        style={({ pressed }) => [
          styles.row,
          {
            paddingLeft: 12 + depth * 16,
            backgroundColor: pressed
              ? c.surface
              : active
                ? c.surface
                : "transparent",
          },
        ]}
      >
        <Feather
          name={
            isFolder
              ? isOpen
                ? "chevron-down"
                : "chevron-right"
              : "file-text"
          }
          size={14}
          color={c.mutedText}
        />
        <Text
          style={[
            styles.rowText,
            {
              color: active ? c.accent : c.text,
              fontWeight: isFolder ? "600" : "400",
            },
          ]}
          numberOfLines={1}
        >
          {node.name}
        </Text>
      </Pressable>
      {isFolder && isOpen && node.children
        ? node.children.map((child) => (
            <TreeRow
              key={child.path}
              node={child}
              depth={depth + 1}
              expanded={expanded}
              toggleExpand={toggleExpand}
              onOpenNote={onOpenNote}
              onLongPressNote={onLongPressNote}
              activeNoteId={activeNoteId}
            />
          ))
        : null}
    </>
  );
}

export function FileTree({
  onOpenNote,
  onLongPressNote,
  activeNoteId,
}: FileTreeProps) {
  const { notes, childFolders, vaultName } = useNotes();
  const { activeTheme } = useTheme();
  const c = activeTheme.colors;
  const [expanded, setExpanded] = useState<Set<string>>(
    () => new Set(["/", "/Journal", "/Drafts"]),
  );

  const root: TreeNode[] = useMemo(
    () => buildTree("/", notes, childFolders),
    [notes, childFolders],
  );

  const toggleExpand = (path: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return next;
    });
  };

  return (
    <ScrollView
      style={{ flex: 1 }}
      contentContainerStyle={{ paddingVertical: 6 }}
      showsVerticalScrollIndicator={false}
    >
      <View style={[styles.vaultHeader, { borderBottomColor: c.border }]}>
        <Feather name="folder" size={14} color={c.accent} />
        <Text style={[styles.vaultName, { color: c.text }]} numberOfLines={1}>
          {vaultName}
        </Text>
      </View>
      {root.map((node) => (
        <TreeRow
          key={node.path}
          node={node}
          depth={0}
          expanded={expanded}
          toggleExpand={toggleExpand}
          onOpenNote={onOpenNote}
          onLongPressNote={onLongPressNote}
          activeNoteId={activeNoteId}
        />
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  vaultHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    marginBottom: 4,
  },
  vaultName: {
    fontSize: 13,
    fontWeight: "600",
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 8,
    paddingRight: 12,
  },
  rowText: {
    flex: 1,
    fontSize: 14,
  },
});
