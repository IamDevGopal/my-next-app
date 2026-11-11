"use client";

import { useState, type FormEvent } from "react";
import type { PublicUserData } from "@/features/users/types/user.type";
import type {
  TaskChecklistItem,
  TaskLabel,
} from "../types/task-resources.type";
import { inputClass, buttonClass } from "../constants/task-resource.styles";

export function TextForm({
  label,
  initialValue = "",
  maxLength,
  buttonLabel,
  disabled,
  onSave,
}: {
  label: string;
  initialValue?: string;
  maxLength: number;
  buttonLabel: string;
  disabled: boolean;
  onSave: (value: string) => Promise<boolean>;
}) {
  const [value, setValue] = useState(initialValue);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (value.trim() && (await onSave(value.trim())) && !initialValue)
      setValue("");
  }
  return (
    <form
      className="flex flex-wrap items-end gap-2"
      onSubmit={(event) => void submit(event)}
    >
      <label className="min-w-48 flex-1 text-sm">
        {label}
        <input
          required
          maxLength={maxLength}
          className={inputClass}
          value={value}
          disabled={disabled}
          onChange={(event) => setValue(event.target.value)}
        />
      </label>
      <button
        type="submit"
        className={buttonClass}
        disabled={disabled || !value.trim()}
      >
        {buttonLabel}
      </button>
    </form>
  );
}

export function LabelForm({
  label,
  disabled,
  buttonLabel,
  onSave,
}: {
  label?: TaskLabel;
  disabled: boolean;
  buttonLabel: string;
  onSave: (body: { name: string; color: string }) => Promise<boolean>;
}) {
  const [name, setName] = useState(label?.name ?? "");
  const [color, setColor] = useState(
    label?.color && /^#[0-9a-f]{6}$/i.test(label.color)
      ? label.color
      : "#6366f1",
  );
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (name.trim() && (await onSave({ name: name.trim(), color })) && !label)
      setName("");
  }
  return (
    <form
      className="mt-3 flex flex-wrap items-end gap-2"
      onSubmit={(event) => void submit(event)}
    >
      <label className="min-w-40 flex-1 text-sm">
        Label name
        <input
          className={inputClass}
          required
          maxLength={80}
          value={name}
          disabled={disabled}
          onChange={(event) => setName(event.target.value)}
        />
      </label>
      <label className="text-sm">
        Color
        <input
          type="color"
          className="block h-10 w-14"
          value={color}
          disabled={disabled}
          onChange={(event) => setColor(event.target.value)}
        />
      </label>
      <button
        type="submit"
        className={buttonClass}
        disabled={disabled || !name.trim()}
      >
        {buttonLabel}
      </button>
    </form>
  );
}

export function ItemEditor({
  item,
  people,
  disabled,
  onSave,
}: {
  item: TaskChecklistItem;
  people: PublicUserData[];
  disabled: boolean;
  onSave: (body: {
    label: string;
    assigneeId: string | null;
  }) => Promise<boolean>;
}) {
  const [label, setLabel] = useState(item.label);
  const [assigneeId, setAssigneeId] = useState(item.assigneeId ?? "");
  const options =
    item.assignee && !people.some((person) => person.id === item.assigneeId)
      ? [...people, item.assignee]
      : people;
  return (
    <form
      className="mt-3 flex flex-wrap items-end gap-2"
      onSubmit={(event) => {
        event.preventDefault();
        if (label.trim())
          void onSave({ label: label.trim(), assigneeId: assigneeId || null });
      }}
    >
      <label className="min-w-40 flex-1 text-sm">
        Item label
        <input
          required
          maxLength={220}
          className={inputClass}
          disabled={disabled}
          value={label}
          onChange={(event) => setLabel(event.target.value)}
        />
      </label>
      <label className="text-sm">
        Assigned to
        <select
          className={inputClass}
          disabled={disabled}
          value={assigneeId}
          onChange={(event) => setAssigneeId(event.target.value)}
        >
          <option value="">Unassigned</option>
          {options.map((person) => (
            <option key={person.id} value={person.id}>
              {person.name}
            </option>
          ))}
        </select>
      </label>
      <button
        className={buttonClass}
        type="submit"
        disabled={disabled || !label.trim()}
      >
        Save item
      </button>
    </form>
  );
}

export function ConfirmDelete({
  label,
  disabled,
  onDelete,
}: {
  label: string;
  disabled: boolean;
  onDelete: () => Promise<boolean>;
}) {
  const [armed, setArmed] = useState(false);
  return armed ? (
    <span className="inline-flex gap-2">
      <button
        type="button"
        className={buttonClass + " text-rose-700"}
        disabled={disabled}
        onClick={() =>
          void onDelete().then((saved) => {
            if (saved) setArmed(false);
          })
        }
      >
        Confirm {label.toLowerCase()}
      </button>
      <button
        type="button"
        className={buttonClass}
        disabled={disabled}
        onClick={() => setArmed(false)}
      >
        Cancel
      </button>
    </span>
  ) : (
    <button
      type="button"
      className={buttonClass}
      disabled={disabled}
      onClick={() => setArmed(true)}
    >
      {label}
    </button>
  );
}
