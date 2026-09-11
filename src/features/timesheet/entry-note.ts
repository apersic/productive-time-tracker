import {
  DOMParser as ProseMirrorDOMParser,
  DOMSerializer,
  Schema,
  type DOMOutputSpec,
  type Fragment,
  type Mark,
  type Node as PMNode,
} from "prosemirror-model";
import { bulletList, listItem, orderedList } from "prosemirror-schema-list";

export type NoteDoc = PMNode & { readonly __brand: "NoteDoc" };

export type EntryNote = { kind: "empty" } | { kind: "present"; doc: NoteDoc };

export const noteSchema = new Schema({
  nodes: {
    doc: {
      content: "block+",
    },
    paragraph: {
      content: "inline*",
      group: "block",
      parseDOM: [{ tag: "p" }],
      toDOM() {
        return ["p", 0];
      },
    },
    bullet_list: {
      ...bulletList,
      content: "list_item+",
      group: "block",
    },
    ordered_list: {
      ...orderedList,
      content: "list_item+",
      group: "block",
    },
    list_item: {
      ...listItem,
      content: "paragraph block*",
    },
    text: {
      group: "inline",
    },
    hard_break: {
      inline: true,
      group: "inline",
      selectable: false,
      parseDOM: [{ tag: "br" }],
      toDOM() {
        return ["br"];
      },
    },
  },
  marks: {
    strong: {
      parseDOM: [{ tag: "strong" }, { tag: "b" }],
      toDOM() {
        return ["strong", 0];
      },
    },
    em: {
      parseDOM: [{ tag: "em" }, { tag: "i" }],
      toDOM() {
        return ["em", 0];
      },
    },
  },
});

export const emptyNote: EntryNote = { kind: "empty" };

export function noteDocShowsPlaceholder(doc: PMNode): boolean {
  if (doc.childCount !== 1) {
    return false;
  }
  const child = doc.firstChild;
  if (!child || child.type !== noteSchema.nodes.paragraph) {
    return false;
  }
  return child.content.size === 0;
}

export function entryNoteFromDoc(doc: PMNode): EntryNote {
  if (doc.type.schema !== noteSchema || doc.type !== noteSchema.nodes.doc) {
    return emptyNote;
  }
  const branded = doc as NoteDoc;
  if (!/\S/.test(branded.textContent)) {
    return emptyNote;
  }
  return { kind: "present", doc: branded };
}

export function parseEntryNote(html: string): EntryNote {
  if (typeof DOMParser === "undefined") {
    return emptyNote;
  }
  const parsed = new DOMParser().parseFromString(html, "text/html");
  const doc = ProseMirrorDOMParser.fromSchema(noteSchema).parse(parsed.body);
  return entryNoteFromDoc(doc);
}

export function serializeEntryNote(note: EntryNote): string {
  switch (note.kind) {
    case "empty":
      return "";
    case "present":
      return serializeFragmentHtml(
        note.doc.content,
        DOMSerializer.fromSchema(noteSchema),
      );
    default: {
      const _exhaustive: never = note;
      return _exhaustive;
    }
  }
}

export const noteIdentity = serializeEntryNote;

export function noteFromText(text: string): EntryNote {
  if (!/\S/.test(text)) {
    return emptyNote;
  }
  const inline = inlineFromText(text);
  const paragraph =
    inline.length === 0
      ? noteSchema.node("paragraph")
      : noteSchema.node("paragraph", null, inline);
  return entryNoteFromDoc(noteSchema.node("doc", null, [paragraph]));
}

export function entryTitle(args: {
  service: { name: string };
  task?: { title: string };
}): string {
  const taskTitle = args.task?.title;
  if (taskTitle !== undefined && taskTitle.length > 0) {
    return `${args.service.name} · ${taskTitle}`;
  }
  return args.service.name;
}

function inlineFromText(text: string): PMNode[] {
  const hardBreak = noteSchema.nodes.hard_break;
  const parts = text.split("\n");
  const inline: PMNode[] = [];
  for (let i = 0; i < parts.length; i += 1) {
    if (i > 0 && hardBreak) {
      inline.push(hardBreak.create());
    }
    const part = parts[i];
    if (part) {
      inline.push(noteSchema.text(part));
    }
  }
  return inline;
}

const VOID_TAGS = new Set(["br", "img", "hr", "input", "meta", "link"]);

function serializeFragmentHtml(
  fragment: Fragment,
  serializer: DOMSerializer,
): string {
  let html = "";
  fragment.forEach((child) => {
    html += serializePmNode(child, serializer);
  });
  return html;
}

function serializePmNode(node: PMNode, serializer: DOMSerializer): string {
  let html: string;
  if (node.isText) {
    html = escapeHtml(node.text ?? "");
  } else {
    const toDOM = serializer.nodes[node.type.name];
    html = toDOM
      ? htmlFromSpec(toDOM(node), node, serializer)
      : serializeFragmentHtml(node.content, serializer);
  }
  return applyMarksHtml(html, node.marks, serializer);
}

function applyMarksHtml(
  html: string,
  marks: readonly Mark[],
  serializer: DOMSerializer,
): string {
  let result = html;
  for (let i = marks.length - 1; i >= 0; i -= 1) {
    const mark = marks[i];
    if (!mark) {
      continue;
    }
    const toDOM = serializer.marks[mark.type.name];
    if (!toDOM) {
      continue;
    }
    result = htmlFromMarkSpec(toDOM(mark, true), result);
  }
  return result;
}

function htmlFromMarkSpec(spec: DOMOutputSpec, inner: string): string {
  if (typeof spec === "string") {
    return escapeHtml(spec);
  }
  if (Array.isArray(spec)) {
    return htmlFromMarkArraySpec(spec, inner);
  }
  return inner;
}

function htmlFromMarkArraySpec(
  spec: readonly unknown[],
  inner: string,
): string {
  const tag = spec[0];
  if (typeof tag !== "string") {
    return inner;
  }
  const localName = localTagName(tag);
  let index = 1;
  const second = spec[1];
  let attrs = "";
  if (isAttrMap(second)) {
    index = 2;
    attrs = htmlAttrs(second);
  }
  let content = "";
  let hole = false;
  for (; index < spec.length; index += 1) {
    const child = spec[index];
    if (child === 0) {
      content += inner;
      hole = true;
      continue;
    }
    if (typeof child === "string") {
      content += escapeHtml(child);
      continue;
    }
    if (Array.isArray(child)) {
      content += htmlFromMarkArraySpec(child, inner);
    }
  }
  if (!hole) {
    content += inner;
  }
  if (VOID_TAGS.has(localName)) {
    return `<${localName}${attrs}>`;
  }
  return `<${localName}${attrs}>${content}</${localName}>`;
}

function htmlFromSpec(
  spec: DOMOutputSpec,
  node: PMNode,
  serializer: DOMSerializer,
): string {
  if (typeof spec === "string") {
    return escapeHtml(spec);
  }
  if (Array.isArray(spec)) {
    return htmlFromArraySpec(spec, node, serializer);
  }
  return serializeFragmentHtml(node.content, serializer);
}

function htmlFromArraySpec(
  spec: readonly unknown[],
  node: PMNode,
  serializer: DOMSerializer,
): string {
  const tag = spec[0];
  if (typeof tag !== "string") {
    return serializeFragmentHtml(node.content, serializer);
  }
  const localName = localTagName(tag);
  let index = 1;
  const second = spec[1];
  let attrs = "";
  if (isAttrMap(second)) {
    index = 2;
    attrs = htmlAttrs(second);
  }
  let inner = "";
  for (; index < spec.length; index += 1) {
    const child = spec[index];
    if (child === 0) {
      inner += serializeFragmentHtml(node.content, serializer);
      continue;
    }
    if (typeof child === "string") {
      inner += escapeHtml(child);
      continue;
    }
    if (Array.isArray(child)) {
      inner += htmlFromArraySpec(child, node, serializer);
    }
  }
  if (VOID_TAGS.has(localName)) {
    return `<${localName}${attrs}>`;
  }
  return `<${localName}${attrs}>${inner}</${localName}>`;
}

function localTagName(tag: string): string {
  const space = tag.indexOf(" ");
  return (space > 0 ? tag.slice(space + 1) : tag).toLowerCase();
}

function isAttrMap(value: unknown): value is Record<string, unknown> {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value) &&
    !("nodeType" in value)
  );
}

function htmlAttrs(attrs: Record<string, unknown>): string {
  let result = "";
  for (const name of Object.keys(attrs)) {
    const value = attrs[name];
    if (value == null) {
      continue;
    }
    result += ` ${name}="${escapeAttr(String(value))}"`;
  }
  return result;
}

function escapeHtml(text: string): string {
  return text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function escapeAttr(text: string): string {
  return escapeHtml(text).replaceAll('"', "&quot;");
}
