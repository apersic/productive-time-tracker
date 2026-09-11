import type { ReactNode } from "react";
import type { Mark, Node as PMNode } from "prosemirror-model";
import type { EntryNote } from "../../features/timesheet";

type PresentNote = Extract<EntryNote, { kind: "present" }>;

type NoteNodeName =
  | "doc"
  | "paragraph"
  | "bullet_list"
  | "ordered_list"
  | "list_item"
  | "text"
  | "hard_break";

type NoteMarkName = "strong" | "em";

export function NoteView(props: { note: PresentNote }) {
  return <div className="entry-note">{renderChildren(props.note.doc)}</div>;
}

function noteNodeName(node: PMNode): NoteNodeName | undefined {
  switch (node.type.name) {
    case "doc":
    case "paragraph":
    case "bullet_list":
    case "ordered_list":
    case "list_item":
    case "text":
    case "hard_break":
      return node.type.name;
    default:
      return undefined;
  }
}

function noteMarkName(name: string): NoteMarkName | undefined {
  switch (name) {
    case "strong":
    case "em":
      return name;
    default:
      return undefined;
  }
}

function wrapTextMarks(text: string, marks: readonly Mark[]): ReactNode {
  let content: ReactNode = text;
  for (let i = marks.length - 1; i >= 0; i -= 1) {
    const mark = marks[i];
    if (!mark) {
      continue;
    }
    const name = noteMarkName(mark.type.name);
    if (name === undefined) {
      continue;
    }
    switch (name) {
      case "strong":
        content = <strong>{content}</strong>;
        break;
      case "em":
        content = <em>{content}</em>;
        break;
      default: {
        const _exhaustive: never = name;
        return _exhaustive;
      }
    }
  }
  return content;
}

function renderNode(node: PMNode, key: number): ReactNode {
  const name = noteNodeName(node);
  if (name === undefined) {
    return null;
  }
  switch (name) {
    case "doc":
      return <div key={key}>{renderChildren(node)}</div>;
    case "paragraph":
      return <p key={key}>{renderChildren(node)}</p>;
    case "bullet_list":
      return <ul key={key}>{renderChildren(node)}</ul>;
    case "ordered_list":
      return <ol key={key}>{renderChildren(node)}</ol>;
    case "list_item":
      return <li key={key}>{renderChildren(node)}</li>;
    case "text":
      return wrapTextMarks(node.text ?? "", node.marks);
    case "hard_break":
      return <br key={key} />;
    default: {
      const _exhaustive: never = name;
      return _exhaustive;
    }
  }
}

function renderChildren(node: PMNode): ReactNode {
  const children: ReactNode[] = [];
  node.forEach((child, _offset, index) => {
    children.push(renderNode(child, index));
  });
  return children;
}
