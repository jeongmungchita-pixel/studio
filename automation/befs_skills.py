#!/usr/bin/env python3
"""BEFS Skills 목록 조회"""
import requests

try:
    response = requests.get("http://127.0.0.1:8765/skills", timeout=2)
    if response.status_code == 200:
        skills = response.json()
        
        if not skills:
            print("🎓 등록된 Skill이 없습니다")
            exit(0)
        
        print(f"🎓 Skills ({len(skills)}개)\n")
        print("=" * 60)
        
        for skill in skills:
            print(f"\n✨ [{skill['id']}] {skill['name']}")
            if skill.get('command'):
                print(f"   명령: {skill['command']}")
            if skill.get('description'):
                print(f"   설명: {skill['description']}")
            if skill.get('tags'):
                print(f"   태그: {skill['tags']}")
        
        print("\n" + "=" * 60)
    else:
        print("❌ Skills 조회 실패")
except requests.exceptions.ConnectionError:
    print("❌ BEFS Agent가 실행되지 않았습니다")
    print("   실행: python3 ~/automation/befs_start.py")
except Exception as e:
    print(f"❌ 오류: {e}")
