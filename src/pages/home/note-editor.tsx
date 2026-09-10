import { Box, useRecipe } from "@chakra-ui/react";
import { baseKeymap, toggleMark } from "prosemirror-commands";
import { history, redo, undo } from "prosemirror-history";
import { inputRules, wrappingInputRule } from "prosemirror-inputrules";
import { keymap } from "prosemirror-keymap";
import type { Node as PMNode } from "prosemirror-model";
import { splitListItem } from "prosemirror-schema-list";
import { EditorState } from "prosemirror-state";
import { EditorView } from "prosemirror-view";
import { useEffect, useRef } from "react";
import { cn } from "../../lib/helpers";
import {
  entryNoteFromDoc,
  noteDocShowsPlaceholder,
  noteIdentity,
  noteSchema,
  type EntryNote,
} from "../../lib/timesheet/entry-note.ts";

const listItemType = noteSchema.nodes.list_item;
const bulletListType = noteSchema.nodes.bullet_list;
const strongMark = noteSchema.marks.strong;
const emMark = noteSchema.marks.em;

const noteEditorPlugins = [
  history(),
  inputRules({
    rules: [wrappingInputRule(/^\s*([-+*])\s$/, bulletListType)],
  }),
  keymap({
    "Mod-z": undo,
    "Mod-y": redo,
    "Shift-Mod-z": redo,
    "Mod-b": toggleMark(strongMark),
    "Mod-i": toggleMark(emMark),
    Enter: splitListItem(listItemType),
  }),
  keymap(baseKeymap),
];

function emptyEditorDoc(): PMNode {
  return noteSchema.node("doc", null, [noteSchema.node("paragraph")]);
}

function editorAttributes(
  state: EditorState,
  placeholder: string,
): { [name: string]: string } {
  if (noteDocShowsPlaceholder(state.doc)) {
    return { class: "is-empty", "data-placeholder": placeholder };
  }
  return {};
}

function docFromNote(note: EntryNote): PMNode {
  switch (note.kind) {
    case "empty":
      return emptyEditorDoc();
    case "present":
      return note.doc;
    default: {
      const _exhaustive: never = note;
      return _exhaustive;
    }
  }
}

export function NoteEditor(props: {
  value: EntryNote;
  onChange: (note: EntryNote) => void;
  disabled?: boolean;
  placeholder: string;
}) {
  const mountRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  const onChangeRef = useRef(props.onChange);
  const disabledRef = useRef(props.disabled === true);
  const placeholderRef = useRef(props.placeholder);
  const initialValueRef = useRef(props.value);
  const disabled = props.disabled === true;
  const textarea = useRecipe({ key: "textarea" });
  const textareaStyles = textarea({ size: "md", variant: "outline" });
  onChangeRef.current = props.onChange;
  disabledRef.current = disabled;
  placeholderRef.current = props.placeholder;

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) {
      return;
    }
    const view = new EditorView(mount, {
      state: EditorState.create({
        doc: docFromNote(initialValueRef.current),
        plugins: noteEditorPlugins,
      }),
      editable: () => !disabledRef.current,
      attributes: (state) => editorAttributes(state, placeholderRef.current),
      dispatchTransaction(tr) {
        const next = view.state.apply(tr);
        view.updateState(next);
        if (tr.docChanged) {
          onChangeRef.current(entryNoteFromDoc(next.doc));
        }
      },
    });
    viewRef.current = view;
    return () => {
      view.destroy();
      viewRef.current = null;
    };
  }, []);

  useEffect(() => {
    viewRef.current?.setProps({ editable: () => !disabledRef.current });
  }, [disabled]);

  useEffect(() => {
    const view = viewRef.current;
    if (!view) {
      return;
    }
    if (
      noteIdentity(entryNoteFromDoc(view.state.doc)) ===
      noteIdentity(props.value)
    ) {
      return;
    }
    const nextDoc = docFromNote(props.value);
    const tr = view.state.tr.replaceWith(
      0,
      view.state.doc.content.size,
      nextDoc.content,
    );
    view.updateState(view.state.apply(tr));
  }, [props.value]);

  return (
    <Box
      className={cn("note-editor", textarea.className)}
      css={textareaStyles}
      minH="10"
      h="auto"
      color="fg"
      bg={disabled ? "bg.muted" : "transparent"}
      cursor={disabled ? "not-allowed" : "text"}
      data-disabled={disabled || undefined}
      _focusWithin={{
        borderColor: "colorPalette.focusRing",
        boxShadow: "0 0 0 1px var(--shadow-color)",
        "--shadow-color": "colors.colorPalette.focusRing",
      }}
      onClick={() => viewRef.current?.focus()}
    >
      <div ref={mountRef} className="note-editor-mount" />
    </Box>
  );
}
