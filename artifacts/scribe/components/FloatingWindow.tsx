import { Feather } from "@expo/vector-icons";
import React, { useRef } from "react";
import {
  Animated,
  Dimensions,
  PanResponder,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { MarkdownView } from "@/components/MarkdownView";
import { useNotes } from "@/contexts/NotesContext";
import { usePanels, type FloatingWindow as FW } from "@/contexts/PanelsContext";
import { useTheme } from "@/contexts/ThemeContext";

const MIN_WIDTH = 220;
const MIN_HEIGHT = 160;

type FloatingWindowsProps = {
  containerWidth: number;
  containerHeight: number;
};

export function FloatingWindowsLayer({
  containerWidth,
  containerHeight,
}: FloatingWindowsProps) {
  const { floatingWindows } = usePanels();
  return (
    <>
      {floatingWindows.map((w) => (
        <SingleWindow
          key={w.id}
          win={w}
          containerWidth={containerWidth}
          containerHeight={containerHeight}
        />
      ))}
    </>
  );
}

function SingleWindow({
  win,
  containerWidth,
  containerHeight,
}: {
  win: FW;
  containerWidth: number;
  containerHeight: number;
}) {
  const { activeTheme } = useTheme();
  const { notes } = useNotes();
  const { closeFloating, updateFloating, bringToFront } = usePanels();
  const c = activeTheme.colors;
  const note = notes.find((n) => n.id === win.noteId);

  const pos = useRef({ x: win.x, y: win.y }).current;
  const size = useRef({ width: win.width, height: win.height }).current;

  const translate = useRef(new Animated.ValueXY({ x: win.x, y: win.y })).current;
  const dim = useRef({
    width: new Animated.Value(win.width),
    height: new Animated.Value(win.height),
  }).current;

  const dragResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, g) =>
        Math.abs(g.dx) > 2 || Math.abs(g.dy) > 2,
      onPanResponderGrant: () => {
        bringToFront(win.id);
      },
      onPanResponderMove: (_, g) => {
        const screenW = containerWidth || Dimensions.get("window").width;
        const screenH = containerHeight || Dimensions.get("window").height;
        const nx = Math.max(
          -size.width + 80,
          Math.min(screenW - 60, pos.x + g.dx),
        );
        const ny = Math.max(
          0,
          Math.min(screenH - 60, pos.y + g.dy),
        );
        translate.setValue({ x: nx, y: ny });
      },
      onPanResponderRelease: (_, g) => {
        const screenW = containerWidth || Dimensions.get("window").width;
        const screenH = containerHeight || Dimensions.get("window").height;
        pos.x = Math.max(
          -size.width + 80,
          Math.min(screenW - 60, pos.x + g.dx),
        );
        pos.y = Math.max(0, Math.min(screenH - 60, pos.y + g.dy));
        translate.setValue({ x: pos.x, y: pos.y });
        updateFloating(win.id, { x: pos.x, y: pos.y });
      },
    }),
  ).current;

  const resizeResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        bringToFront(win.id);
      },
      onPanResponderMove: (_, g) => {
        const newW = Math.max(MIN_WIDTH, size.width + g.dx);
        const newH = Math.max(MIN_HEIGHT, size.height + g.dy);
        dim.width.setValue(newW);
        dim.height.setValue(newH);
      },
      onPanResponderRelease: (_, g) => {
        size.width = Math.max(MIN_WIDTH, size.width + g.dx);
        size.height = Math.max(MIN_HEIGHT, size.height + g.dy);
        dim.width.setValue(size.width);
        dim.height.setValue(size.height);
        updateFloating(win.id, { width: size.width, height: size.height });
      },
    }),
  ).current;

  if (!note) return null;

  return (
    <Animated.View
      style={[
        styles.window,
        {
          backgroundColor: c.surface,
          borderColor: c.border,
          shadowColor: "#000",
          width: dim.width,
          height: dim.height,
          transform: translate.getTranslateTransform(),
          zIndex: win.z,
        },
      ]}
    >
      <View
        {...dragResponder.panHandlers}
        style={[styles.titleBar, { borderBottomColor: c.border, backgroundColor: c.toolbar }]}
      >
        <View style={styles.titleLeft}>
          <Feather name="move" size={12} color={c.mutedText} />
          <Text
            style={[styles.title, { color: c.toolbarText }]}
            numberOfLines={1}
          >
            {note.name}
          </Text>
        </View>
        <Pressable
          onPress={() =>
            updateFloating(win.id, { collapsed: !win.collapsed })
          }
          hitSlop={8}
          style={styles.titleBtn}
        >
          <Feather
            name={win.collapsed ? "maximize-2" : "minimize-2"}
            size={13}
            color={c.mutedText}
          />
        </Pressable>
        <Pressable
          onPress={() => closeFloating(win.id)}
          hitSlop={8}
          style={styles.titleBtn}
        >
          <Feather name="x" size={14} color={c.mutedText} />
        </Pressable>
      </View>

      {!win.collapsed ? (
        <View style={{ flex: 1 }}>
          <MarkdownView
            source={note.content}
            theme={{
              ...activeTheme,
              fontSize: Math.max(13, activeTheme.fontSize - 3),
              paddingHorizontal: 14,
              paddingVertical: 12,
            }}
          />
        </View>
      ) : null}

      {!win.collapsed ? (
        <View
          {...resizeResponder.panHandlers}
          style={[
            styles.resizeHandle,
            { backgroundColor: c.border },
          ]}
        >
          <View style={[styles.resizeDot, { backgroundColor: c.mutedText }]} />
          <View style={[styles.resizeDot, { backgroundColor: c.mutedText }]} />
        </View>
      ) : null}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  window: {
    position: "absolute",
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: "hidden",
    elevation: 14,
    shadowOpacity: 0.25,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 6 },
  },
  titleBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 8,
  },
  titleLeft: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  title: {
    fontSize: 13,
    fontWeight: "600",
    flex: 1,
  },
  titleBtn: {
    width: 22,
    height: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  resizeHandle: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 22,
    height: 22,
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    justifyContent: "center",
    gap: 2,
    padding: 6,
    opacity: 0.7,
  },
  resizeDot: {
    width: 3,
    height: 3,
    borderRadius: 2,
  },
});
