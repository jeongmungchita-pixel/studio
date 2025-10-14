---
trigger: manual
---

# .windsurf/workspace.rules

workspace:
  name: BEFS-AI-AUTOMATION
  description: Gymnastics automation + AI app workspace

# ---------------------------------------------------------------------
# 📁 1️⃣ 코드 구조 및 파일 규칙
# ---------------------------------------------------------------------
structure:
  enforce_folder_structure: true
  allowed_root_folders:
    - src
    - public
    - config
    - tests
    - scripts
  disallowed_patterns:
    - node_modules/*
    - tmp/*
    - __pycache__/*
  protected_files:
    - .env
    - package-lock.json
    - firebase.json
    - .github/workflows/*

# ---------------------------------------------------------------------
# 🧠 2️⃣ AI 행동 정책 (Cascade와 연동됨)
# ---------------------------------------------------------------------
ai_policy:
  require_plan_before_edit: true
  require_summary_before_commit: true
  allow_auto_fix: false
  batch_mode_default: true
  confirm_before_deploy: true
  default_branch_protection: true

# ---------------------------------------------------------------------
# ⚙️ 3️⃣ 코드 품질 및 스타일
# ---------------------------------------------------------------------
code_quality:
  language_defaults:
    javascript:
      linter: eslint
      formatter: prettier
      test_runner: vitest
    python:
      linter: flake8
      formatter: black
      test_runner: pytest
  min_coverage: 80
  enforce_typecheck: true
  forbid_console_logs: true

# ---------------------------------------------------------------------
# 🔐 4️⃣ 보안 및 환경 설정
# ---------------------------------------------------------------------
security:
  block_secrets_in_commit: true
  block_hardcoded_tokens: true
  audit_on_push: true
  sensitive_keywords:
    - password
    - apiKey
    - secret
    - credential

# ---------------------------------------------------------------------
# 🚀 5️⃣ Git 워크플로우 규칙
# ---------------------------------------------------------------------
git_rules:
  branch_protection:
    main:
      required_reviews: 1
      block_direct_push: true
      require_ci_pass: true
    dev:
      block_direct_push: true
  commit_message_format: conventional
  allow_hotfix_direct_push: true
  require_pull_request_template: true

# ---------------------------------------------------------------------
# 🧩 6️⃣ 배포/CI/CD
# ---------------------------------------------------------------------
deployment:
  environment:
    - name: staging
      auto_deploy: false
      require_review: true
    - name: production
      auto_deploy: false
      require_approval: true
  cooldown_minutes: 90
  grouped_deploys: true

# ---------------------------------------------------------------------
# 📈 7️⃣ 모니터링 & 롤백
# ---------------------------------------------------------------------
monitoring:
  alert_thresholds:
    error_rate: 5
    latency_ms: 1000
  auto_rollback_on_threshold_breach: true
  post_deploy_summary: true

# ---------------------------------------------------------------------
# 🧰 8️⃣ 워크스페이스 자동화
# ---------------------------------------------------------------------
automation:
  run_ci_on_branch: [main, dev, feature/*]
  auto_format_on_save: true
  auto_fix_lint_errors: false
  auto_test_on_commit: true

# ---------------------------------------------------------------------
# 🧑‍🤝‍🧑 9️⃣ 협업 기본 규칙
# ---------------------------------------------------------------------
collaboration:
  required_readme_sections:
    - Overview
    - Setup
    - Commands
    - Deployment
  default_issue_template: feature_request.md
  default_pull_request_template: standard_pr.md
  enforce_task_link: true  # 모든 PR에 task ID 필요 (예: #123)

# ---------------------------------------------------------------------
# 📜 10️⃣ 문서화
# ---------------------------------------------------------------------
documentation:
  require_function_docstring: true
  require_api_doc: true
  enforce_readme_at_root: true
  auto_generate_changelog: true