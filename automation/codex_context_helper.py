#!/usr/bin/env python3
"""Wrapper for Codex context helper."""
from befs_automation.codex.context import (
    copy_context_to_clipboard,
    generate_context_markdown,
    open_context_file,
)


def main():
    print("🤖 Codex 컨텍스트 업데이트 도우미")
    print("=" * 50)
    print("\n선택하세요:")
    print("1. 컨텍스트 파일 생성")
    print("2. 컨텍스트 파일 생성 + VS Code에서 열기")
    print("3. 컨텍스트 클립보드에 복사")
    choice = input("\n선택 (1-3): ").strip()
    if choice == "1":
        generate_context_markdown()
    elif choice == "2":
        open_context_file()
    elif choice == "3":
        copy_context_to_clipboard()
    else:
        print("❌ 잘못된 선택입니다.")


if __name__ == "__main__":
    main()
