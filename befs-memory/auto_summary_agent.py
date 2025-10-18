import openai, datetime, os, re
from pathlib import Path

base = Path("~/windsurf-memory").expanduser()
notes = base / "session-notes.md"
report_dir = base / "reports"
report_dir.mkdir(exist_ok=True)

def summarize_text(text):
    import textwrap
    prompt = f"""다음은 BEFS 작업 세션 로그입니다.
핵심 주제, 작업 진행률, 다음 단계 계획을 한눈에 볼 수 있도록 요약해주세요.

{text[:3000]}"""
    try:
        import openai
        client = openai.OpenAI()
        resp = client.chat.completions.create(
            model="gpt-5-mini",
            messages=[{"role":"system","content":"당신은 문서 정리 전문가입니다."},
                      {"role":"user","content":prompt}],
            temperature=0.3)
        return textwrap.fill(resp.choices[0].message.content, 80)
    except Exception as e:
        return f"[AI 요약 실패: {e}]"

if notes.exists():
    txt = notes.read_text()
    latest_block = txt.split("## ")[-1] if "## " in txt else txt
    summary = summarize_text(latest_block)
    timestamp = datetime.datetime.now().strftime("%Y-%m-%d %H:%M")
    report = report_dir / f"report_{datetime.datetime.now():%Y%m%d_%H%M}.md"
    report.write_text(f"# 📘 자동 세션 요약\n\n⏰ {timestamp}\n\n---\n\n{summary}")
    print("✅ 자동 요약 보고서 생성됨:", report)
