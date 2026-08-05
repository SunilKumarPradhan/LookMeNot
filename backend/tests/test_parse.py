import unittest

from parse import parse_capture, parse_trace


FRESH_CAPTURE = {
    "tools": [
        {
            "name": "Bash",
            "description": "Huge tool schema text that must not become a chat bubble",
            "input_schema": {"type": "object"},
        }
    ],
    "messages": [
        {"role": "system", "content": "<system-reminder>Keep context compact.</system-reminder>"},
        {"role": "user", "content": [{"type": "text", "text": "Find config."}]},
        {
            "role": "assistant",
            "content": [
                {"type": "text", "text": "Searching."},
                {"type": "tool_use", "id": "toolu_1", "name": "Bash", "input": {"command": "pwd"}},
            ],
        },
        {
            "role": "user",
            "content": [{"type": "tool_result", "tool_use_id": "toolu_1", "is_error": False, "content": "/tmp/project"}],
        },
    ],
}


class ParseFreshCaptureTest(unittest.TestCase):
    def test_root_messages_parse_and_root_tools_are_metadata_only(self):
        entries = parse_trace(FRESH_CAPTURE)

        self.assertEqual([entry["type"] for entry in entries], ["text", "text", "text", "tool_use", "tool_result"])
        self.assertFalse(any("Huge tool schema" in entry.get("text", "") for entry in entries))

    def test_tool_result_role_is_forced_to_tool(self):
        entries = parse_trace(FRESH_CAPTURE)
        tool_result = next(entry for entry in entries if entry["type"] == "tool_result")

        self.assertEqual(tool_result["role"], "tool")
        self.assertEqual(tool_result["rawRole"], "user")
        self.assertEqual(tool_result["tool"], "Bash")

    def test_empty_output_is_optional(self):
        result = parse_capture(FRESH_CAPTURE, None)

        self.assertEqual(result["sourceKind"], "input-only")
        self.assertGreater(len(result["entries"]), 0)
        self.assertIn("Output JSON was empty", result["warnings"][0])

    def test_output_entries_merge_without_duplicates(self):
        output = {
            "messages": [
                {"role": "assistant", "content": [{"type": "text", "text": "Final answer."}]},
            ]
        }

        result = parse_capture(FRESH_CAPTURE, output)

        self.assertEqual(result["sourceKind"], "input+output")
        self.assertEqual(result["entries"][-1]["text"], "Final answer.")

    def test_terminal_ansi_sequences_are_stripped(self):
        capture = {
            "messages": [
                {
                    "role": "user",
                    "content": [
                        {
                            "type": "tool_result",
                            "tool_use_id": "missing",
                            "content": "\x1b[36mvite\x1b[39m build\x07",
                        }
                    ],
                }
            ]
        }

        entries = parse_trace(capture)

        self.assertEqual(entries[0]["text"], "vite build")

    def test_empty_signed_thinking_block_is_visible(self):
        capture = {
            "messages": [
                {
                    "role": "assistant",
                    "content": [{"type": "thinking", "thinking": "", "signature": "abc"}],
                }
            ]
        }

        entries = parse_trace(capture)

        self.assertEqual(entries[0]["type"], "thinking")
        self.assertTrue(entries[0]["hasThinkingSignature"])
        self.assertIn("Thinking block present", entries[0]["text"])

    def test_empty_tool_result_block_is_visible(self):
        capture = {
            "messages": [
                {
                    "role": "user",
                    "content": [{"type": "tool_result", "tool_use_id": "missing", "content": []}],
                }
            ]
        }

        entries = parse_trace(capture)

        self.assertEqual(entries[0]["type"], "tool_result")
        self.assertIn("Tool result block present", entries[0]["text"])

    def test_structured_tool_result_block_is_visible(self):
        capture = {
            "messages": [
                {
                    "role": "user",
                    "content": [{"type": "tool_result", "tool_use_id": "missing", "content": [{"status": "ok"}]}],
                }
            ]
        }

        entries = parse_trace(capture)

        self.assertEqual(entries[0]["type"], "tool_result")
        self.assertIn('"status": "ok"', entries[0]["text"])


if __name__ == "__main__":
    unittest.main()