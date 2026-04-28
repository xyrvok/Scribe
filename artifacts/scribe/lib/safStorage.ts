import * as FileSystem from "expo-file-system/legacy";
import { Platform } from "react-native";

const SAF = FileSystem.StorageAccessFramework;

export type SafFolder = {
  uri: string;
  relativePath: string;
};

export type SafFile = {
  uri: string;
  name: string;
  ext: "md" | "txt";
  folderPath: string;
};

export type SafTree = {
  folders: SafFolder[];
  files: SafFile[];
};

export const isAndroidSafSupported = (): boolean =>
  Platform.OS === "android" && !!SAF;

function decodeFilename(uri: string): string {
  try {
    const docPart = uri.split("/document/")[1] ?? uri;
    const decoded = decodeURIComponent(docPart);
    const afterColon = decoded.includes(":")
      ? decoded.slice(decoded.indexOf(":") + 1)
      : decoded;
    const lastSlash = afterColon.lastIndexOf("/");
    return lastSlash >= 0 ? afterColon.slice(lastSlash + 1) : afterColon;
  } catch {
    return uri;
  }
}

function decodeFolderName(uri: string): string {
  return decodeFilename(uri) || "Folder";
}

function splitNameExt(filename: string): { name: string; ext: string } {
  const dot = filename.lastIndexOf(".");
  if (dot <= 0) return { name: filename, ext: "" };
  return {
    name: filename.slice(0, dot),
    ext: filename.slice(dot + 1).toLowerCase(),
  };
}

export async function pickFolder(): Promise<{
  uri: string;
  name: string;
} | null> {
  if (!isAndroidSafSupported()) return null;
  const perms = await SAF.requestDirectoryPermissionsAsync();
  if (!perms.granted) return null;
  const uri = perms.directoryUri;
  const name = decodeFolderName(uri);
  return { uri, name };
}

async function isDirectory(uri: string): Promise<boolean> {
  try {
    await SAF.readDirectoryAsync(uri);
    return true;
  } catch {
    return false;
  }
}

export async function scanFolderTree(rootUri: string): Promise<SafTree> {
  if (!isAndroidSafSupported()) return { folders: [], files: [] };

  const folders: SafFolder[] = [];
  const files: SafFile[] = [];

  async function visit(uri: string, relativePath: string): Promise<void> {
    let entries: string[] = [];
    try {
      entries = await SAF.readDirectoryAsync(uri);
    } catch {
      return;
    }
    const checked = await Promise.all(
      entries.map(async (entryUri) => ({
        uri: entryUri,
        isDir: await isDirectory(entryUri),
      })),
    );
    for (const { uri: entryUri, isDir } of checked) {
      if (isDir) {
        const folderName = decodeFolderName(entryUri);
        const childPath =
          relativePath === "/" ? `/${folderName}` : `${relativePath}/${folderName}`;
        folders.push({ uri: entryUri, relativePath: childPath });
        await visit(entryUri, childPath);
      } else {
        const filename = decodeFilename(entryUri);
        const { name, ext } = splitNameExt(filename);
        if (ext === "md" || ext === "txt") {
          files.push({
            uri: entryUri,
            name,
            ext: ext as "md" | "txt",
            folderPath: relativePath,
          });
        }
      }
    }
  }

  await visit(rootUri, "/");
  return { folders, files };
}

export async function readFile(uri: string): Promise<string> {
  return await SAF.readAsStringAsync(uri);
}

export async function writeFile(uri: string, content: string): Promise<void> {
  await SAF.writeAsStringAsync(uri, content);
}

export async function createFile(
  parentUri: string,
  name: string,
  ext: "md" | "txt",
): Promise<{ uri: string }> {
  const mimeType = ext === "md" ? "text/markdown" : "text/plain";
  const uri = await SAF.createFileAsync(parentUri, name, mimeType);
  return { uri };
}

export async function createSubFolder(
  parentUri: string,
  folderName: string,
): Promise<{ uri: string }> {
  const uri = await SAF.makeDirectoryAsync(parentUri, folderName);
  return { uri };
}

export async function deleteUri(uri: string): Promise<void> {
  await SAF.deleteAsync(uri);
}
