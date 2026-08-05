"""Flattens raw Langfuse-style agent trace JSON into a clean, ordered array of chat entries."""

import argparse
import json
import re
import sys

SINGLE_FIELD_KEYS = ("command", "file_path", "path", "query", "pattern")
KNOWN_ROLES = ("user", "assistant", "system")
ANSI_RE = re.compile(r"\x1b\[[0-?]*[ -/]*[@-~]")
CONTROL_RE = re.compile(r"[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]")
SYSTEM_CONTEXT_PREFIXES = (
    "<system-reminder>",
    "<local-command-stdout>",
    "[system notification",
    "this session is being continued from a previous conversation",
)
EMPTY_TOOL_RESULT_TEXT = "Tool result block present; result content is empty in this JSON capture."


class ParseError(Exception):
    pass


def is_parsed_entry_array(data):
    return isinstance(data, list) and all(
        isinstance(item, dict)
        and isinstance(item.get("index"), int)
        and isinstance(item.get("role"), str)
        and isinstance(item.get("type"), str)
        for item in data
    )


def locate_messages(data):
    if isinstance(data, dict):
        messages = data.get("messages")
        if isinstance(messages, list):
            return messages

        input_val = data.get("input")
        if isinstance(input_val, dict):
            messages = input_val.get("messages")
            if isinstance(messages, list):
                return messages
        if isinstance(input_val, list):
            return input_val

    if isinstance(data, list):
        return data

    raise ParseError("Could not locate a messages array")


def normalize_role(role):
    if role in KNOWN_ROLES:
        return role, role
    return "user", (role if role is not None else "unknown")


def is_system_context_text(text):
    normalized = text.lstrip().lower()
    return any(normalized.startswith(prefix) for prefix in SYSTEM_CONTEXT_PREFIXES)


def clean_text(text):
    text = ANSI_RE.sub("", str(text))
    return CONTROL_RE.sub("", text)


def cleanup_system_context_text(text):
    stripped = clean_text(text).strip()
    lower = stripped.lower()
    if lower.startswith("<system-reminder>") and lower.endswith("</system-reminder>"):
        return stripped[len("<system-reminder>") : -len("</system-reminder>")].strip()
    if lower.startswith("<local-command-stdout>") and lower.endswith("</local-command-stdout>"):
        return stripped[len("<local-command-stdout>") : -len("</local-command-stdout>")].strip()
    return stripped


def normalize_content(content):
    if content is None:
        return []
    if isinstance(content, str):
        return [{"type": "text", "text": content}]
    if isinstance(content, list):
        blocks = []
        for item in content:
            if isinstance(item, str):
                blocks.append({"type": "text", "text": item})
            elif isinstance(item, dict):
                blocks.append(item)
            else:
                blocks.append({"type": "unknown", "text": repr(item)})
        return blocks
    return [{"type": "unknown", "text": repr(content)}]


def coerce_bool(value, default=False):
    if isinstance(value, bool):
        return value
    if isinstance(value, str):
        return value.strip().lower() not in ("false", "0", "", "no")
    if value is None:
        return default
    return bool(value)


def stringify_tool_input(input_obj):
    if isinstance(input_obj, str):
        return input_obj
    if isinstance(input_obj, dict):
        present = [k for k in SINGLE_FIELD_KEYS if k in input_obj]
        if len(present) == 1:
            return str(input_obj[present[0]])
    return json.dumps(input_obj, ensure_ascii=False)


def stable_entry_key(entry):
    payload = {
        "role": entry.get("role"),
        "type": entry.get("type"),
        "text": entry.get("text", ""),
        "tool": entry.get("tool"),
        "toolInput": entry.get("toolInput"),
        "toolUseId": entry.get("toolUseId"),
    }
    return json.dumps(payload, ensure_ascii=False, sort_keys=True)


def reindex_entries(entries):
    return [{"index": idx, **{k: v for k, v in entry.items() if k != "index"}} for idx, entry in enumerate(entries)]


def parse_optional_output(output_data):
    if output_data is None:
        return [], ["Output JSON was empty or not provided; showing input transcript only."]
    if is_parsed_entry_array(output_data):
        return output_data, []
    try:
        return parse_trace(output_data), []
    except ParseError:
        return [], ["Output JSON did not contain a messages array; showing input transcript only."]


def parse_capture(input_data, output_data=None):
    entries = parse_trace(input_data)
    warnings = []

    output_entries, output_warnings = parse_optional_output(output_data)
    warnings.extend(output_warnings)

    if output_entries:
        seen = {stable_entry_key(entry) for entry in entries}
        for entry in output_entries:
            key = stable_entry_key(entry)
            if key not in seen:
                entries.append(entry)
                seen.add(key)

    source_kind = "input+output" if output_entries else "input-only"
    return {
        "entries": reindex_entries(entries),
        "sourceKind": source_kind,
        "warnings": warnings,
    }


def flatten_tool_result_content(content):
    if content is None:
        return EMPTY_TOOL_RESULT_TEXT
    if isinstance(content, str):
        return clean_text(content) or EMPTY_TOOL_RESULT_TEXT
    if isinstance(content, list):
        parts = []
        for item in content:
            if isinstance(item, str):
                parts.append(clean_text(item))
            elif isinstance(item, dict):
                parts.append(clean_text(item.get("text") or item.get("thinking") or json.dumps(item, ensure_ascii=False)))
            else:
                parts.append(clean_text(repr(item)))
        return clean_text("\n".join(parts)) or EMPTY_TOOL_RESULT_TEXT
    return clean_text(json.dumps(content, ensure_ascii=False))


def infer_block_type(block):
    btype = block.get("type")
    if btype:
        return btype
    if "text" in block:
        return "text"
    if "thinking" in block:
        return "thinking"
    return "unknown"


def flatten_block(block, msg_role, msg_raw_role, m_idx, tool_names):
    if block is None:
        return None
    if isinstance(block, str):
        block = {"type": "text", "text": block}

    btype = infer_block_type(block)

    if btype == "text":
        text = clean_text(block.get("text") or "")
        if text == "":
            return None
        role = "system" if is_system_context_text(text) else msg_role
        rendered_text = cleanup_system_context_text(text) if role == "system" else text
        return {"role": role, "type": "text", "text": rendered_text, "messageIndex": m_idx, "rawRole": msg_raw_role}

    if btype == "thinking":
        text = clean_text(block.get("thinking") or block.get("text") or "")
        if text == "" and block.get("signature"):
            text = "Thinking block present; thinking text is empty in this JSON capture."
        if text == "":
            return None
        entry = {"role": "assistant", "type": "thinking", "text": text, "messageIndex": m_idx, "rawRole": msg_raw_role}
        if block.get("signature"):
            entry["hasThinkingSignature"] = True
        return entry

    if btype == "tool_use":
        tool_name = block.get("name") or "unknown"
        tool_id = block.get("id")
        if tool_id:
            tool_names[tool_id] = tool_name
        input_obj = block.get("input") or {}
        entry = {
            "role": "assistant",
            "type": "tool_use",
            "tool": tool_name,
            "toolInput": stringify_tool_input(input_obj),
            "toolInputRaw": input_obj,
            "messageIndex": m_idx,
            "rawRole": msg_raw_role,
        }
        if tool_id:
            entry["toolUseId"] = tool_id
        return entry

    if btype == "tool_result":
        tool_id = block.get("tool_use_id")
        tool_name = tool_names.get(tool_id, "unknown") if tool_id else "unknown"
        entry = {
            "role": "tool",
            "type": "tool_result",
            "tool": tool_name,
            "isError": coerce_bool(block.get("is_error"), False),
            "text": flatten_tool_result_content(block.get("content")),
            "messageIndex": m_idx,
            "rawRole": msg_raw_role,
        }
        if tool_id:
            entry["toolUseId"] = tool_id
        return entry

    return {"role": msg_role, "type": "unknown", "text": json.dumps(block, ensure_ascii=False), "messageIndex": m_idx, "rawRole": msg_raw_role}


def parse_trace(data):
    messages = locate_messages(data)

    entries = []
    tool_names = {}
    idx = 0

    for m_idx, message in enumerate(messages):
        if not isinstance(message, dict):
            entries.append({
                "index": idx,
                "role": "system",
                "type": "unknown",
                "text": f"<parse error: message at position {m_idx} is not an object>",
                "messageIndex": m_idx,
                "rawRole": "unknown",
            })
            idx += 1
            continue
        try:
            role, raw_role = normalize_role(message.get("role"))
            content = message.get("content")
            blocks = normalize_content(content)
            for block in blocks:
                entry = flatten_block(block, role, raw_role, m_idx, tool_names)
                if entry is not None:
                    entry = {"index": idx, **entry}
                    idx += 1
                    entries.append(entry)
        except Exception as exc:
            entries.append({
                "index": idx,
                "role": "system",
                "type": "unknown",
                "text": f"<parse error: {exc}>",
                "messageIndex": m_idx,
                "rawRole": "unknown",
            })
            idx += 1

    return entries


def main():
    parser = argparse.ArgumentParser(description="Flatten a raw Langfuse-style trace JSON into a clean chat-entry array.")
    parser.add_argument("input", help="Path to raw trace JSON file")
    parser.add_argument("-o", "--output", help="Path to write parsed JSON output (defaults to stdout)")
    args = parser.parse_args()

    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8")

    try:
        with open(args.input, "r", encoding="utf-8-sig") as f:
            data = json.load(f)
    except FileNotFoundError:
        print(f"Error: input file not found: {args.input}", file=sys.stderr)
        sys.exit(1)
    except json.JSONDecodeError as exc:
        print(f"Error: invalid JSON in {args.input}: {exc}", file=sys.stderr)
        sys.exit(1)

    try:
        entries = parse_trace(data)
    except ParseError as exc:
        print(f"Error: {exc}", file=sys.stderr)
        sys.exit(1)

    output_json = json.dumps(entries, ensure_ascii=False, indent=2)

    if args.output:
        with open(args.output, "w", encoding="utf-8") as f:
            f.write(output_json)
            f.write("\n")
    else:
        print(output_json)


if __name__ == "__main__":
    main()
