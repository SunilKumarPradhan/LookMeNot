"""Ad-hoc generator for a large synthetic Langfuse-style trace, used to perf-test
the virtualized chat window. Not part of the shipped app; run manually:

    python scripts/generate_stress_trace.py > scripts/stress-raw.json
    python backend/parse.py scripts/stress-raw.json -o scripts/stress-parsed.json
"""

import json
import sys

TURNS = 240  # 5 flattened entries per turn -> ~1200 entries


def build_trace(turns: int) -> dict:
    messages = []
    for n in range(turns):
        messages.append(
            {
                "role": "user",
                "content": [{"type": "text", "text": f"User question #{n}: how do I handle case {n}?"}],
            }
        )
        messages.append(
            {
                "role": "assistant",
                "content": [
                    {"type": "thinking", "thinking": f"Reasoning about step {n}. Considering edge cases and prior context."},
                    {"type": "text", "text": f"Here is my answer for turn {n}, referencing the search results below."},
                    {
                        "type": "tool_use",
                        "id": f"tool_{n}",
                        "name": "search",
                        "input": {"query": f"case {n} handling"},
                    },
                ],
            }
        )
        messages.append(
            {
                "role": "user",
                "content": [
                    {
                        "type": "tool_result",
                        "tool_use_id": f"tool_{n}",
                        "content": f"Search result payload for turn {n}:\n- item A\n- item B\n- item C",
                    }
                ],
            }
        )
    return {"messages": messages}


if __name__ == "__main__":
    turns = int(sys.argv[1]) if len(sys.argv) > 1 else TURNS
    json.dump(build_trace(turns), sys.stdout, ensure_ascii=False)
