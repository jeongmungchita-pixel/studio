#!/usr/bin/env python3
"""동기화 시스템 최적화 도구"""
import os
import requests
import subprocess
import json
import time
from datetime import datetime
from concurrent.futures import ThreadPoolExecutor, as_completed

STUDIO_DIR = os.getcwd()
BEFS_URL = "http://127.0.0.1:8765"

class SyncOptimizer:
    def __init__(self):
        self.befs_available = self.check_befs_connection()
        self.optimization_results = {}
    
    def check_befs_connection(self):
        """BEFS Agent 연결 상태 확인"""
        try:
            response = requests.get(f"{BEFS_URL}/health", timeout=2)
            return response.status_code == 200
        except:
            return False
    
    def optimize_git_operations(self):
        """Git 작업 최적화"""
        print("🔧 Git 작업 최적화 중...")
        
        optimizations = []
        
        # Git 설정 최적화
        git_configs = [
            ("core.preloadindex", "true"),
            ("core.fscache", "true"),
            ("gc.auto", "256"),
            ("fetch.parallel", "4")
        ]
        
        for config, value in git_configs:
            try:
                result = subprocess.run(
                    ["git", "config", "--local", config, value],
                    cwd=STUDIO_DIR,
                    capture_output=True,
                    text=True
                )
                if result.returncode == 0:
                    optimizations.append(f"✅ {config} = {value}")
                else:
                    optimizations.append(f"❌ {config} 설정 실패")
            except Exception as e:
                optimizations.append(f"❌ {config} 오류: {e}")
        
        self.optimization_results["git"] = optimizations
        return optimizations
    
    def optimize_sync_performance(self):
        """동기화 성능 최적화"""
        print("⚡ 동기화 성능 최적화 중...")
        
        optimizations = []
        
        # 동기화 스크립트 병렬 처리 설정
        sync_scripts = [
            "automation/codex_sync.py",
            "automation/sync_coding_style.py"
        ]
        
        # 각 스크립트의 성능 측정
        for script in sync_scripts:
            script_path = os.path.join(STUDIO_DIR, script)
            if os.path.exists(script_path):
                # 스크립트 최적화 가능성 체크
                with open(script_path, 'r', encoding='utf-8') as f:
                    content = f.read()
                    
                # 최적화 포인트 찾기
                if "timeout=" in content:
                    optimizations.append(f"✅ {script}: 타임아웃 설정됨")
                else:
                    optimizations.append(f"⚠️ {script}: 타임아웃 설정 권장")
                
                if "concurrent" in content or "threading" in content:
                    optimizations.append(f"✅ {script}: 병렬 처리 지원")
                else:
                    optimizations.append(f"💡 {script}: 병렬 처리 개선 가능")
        
        self.optimization_results["performance"] = optimizations
        return optimizations
    
    def optimize_befs_integration(self):
        """BEFS 통합 최적화"""
        print("🤖 BEFS 통합 최적화 중...")
        
        optimizations = []
        
        if not self.befs_available:
            optimizations.append("❌ BEFS Agent 연결 불가")
            return optimizations
        
        try:
            # BEFS 상태 확인
            health_response = requests.get(f"{BEFS_URL}/health", timeout=2)
            if health_response.status_code == 200:
                health_data = health_response.json()
                optimizations.append(f"✅ BEFS Agent 실행 중 (v{health_data.get('version', 'unknown')})")
            
            # Tasks 개수 확인
            tasks_response = requests.get(f"{BEFS_URL}/tasks", timeout=2)
            if tasks_response.status_code == 200:
                tasks = tasks_response.json()
                task_count = len(tasks)
                optimizations.append(f"📋 Tasks: {task_count}개")
                
                if task_count > 100:
                    optimizations.append("⚠️ Task 정리 권장 (100개 초과)")
            
            # Skills 개수 확인  
            skills_response = requests.get(f"{BEFS_URL}/skills", timeout=2)
            if skills_response.status_code == 200:
                skills = skills_response.json()
                skill_count = len(skills)
                optimizations.append(f"🎓 Skills: {skill_count}개")
                
                if skill_count < 5:
                    optimizations.append("💡 더 많은 스킬 추가 권장")
        
        except Exception as e:
            optimizations.append(f"❌ BEFS 최적화 오류: {e}")
        
        self.optimization_results["befs"] = optimizations
        return optimizations
    
    def create_optimized_sync_script(self):
        """최적화된 통합 동기화 스크립트 생성"""
        print("📝 최적화된 동기화 스크립트 생성 중...")
        
        script_content = '''#!/usr/bin/env python3
"""최적화된 통합 동기화 스크립트"""
import os
import sys
import subprocess
import requests
import json
import time
from datetime import datetime
from concurrent.futures import ThreadPoolExecutor, as_completed

STUDIO_DIR = os.getcwd()
BEFS_URL = "http://127.0.0.1:8765"

def run_sync_task(task_name, task_func):
    """동기화 작업 실행"""
    start_time = time.time()
    try:
        result = task_func()
        duration = time.time() - start_time
        return {
            "task": task_name,
            "success": True,
            "duration": duration,
            "result": result
        }
    except Exception as e:
        duration = time.time() - start_time
        return {
            "task": task_name,
            "success": False,
            "duration": duration,
            "error": str(e)
        }

def sync_git_changes():
    """Git 변경사항 동기화"""
    # Git 상태 확인
    result = subprocess.run(
        ["git", "status", "--porcelain"],
        cwd=STUDIO_DIR,
        capture_output=True,
        text=True,
        timeout=5
    )
    
    changes = result.stdout.strip()
    if changes:
        return f"변경사항 {len(changes.split())}개 감지"
    return "변경사항 없음"

def sync_coding_style():
    """코딩 스타일 동기화"""
    # 간단한 스타일 체크
    ts_files = subprocess.run(
        ["find", "src", "-name", "*.ts", "-o", "-name", "*.tsx"],
        cwd=STUDIO_DIR,
        capture_output=True,
        text=True,
        timeout=10
    )
    
    file_count = len(ts_files.stdout.strip().split('\\n')) if ts_files.stdout.strip() else 0
    return f"TypeScript 파일 {file_count}개 분석 완료"

def sync_befs_status():
    """BEFS 상태 동기화"""
    try:
        response = requests.get(f"{BEFS_URL}/health", timeout=2)
        if response.status_code == 200:
            data = response.json()
            return f"BEFS Agent 정상 (v{data.get('version', 'unknown')})"
        else:
            return "BEFS Agent 응답 오류"
    except:
        return "BEFS Agent 연결 실패"

def main():
    """메인 동기화 실행"""
    print("🚀 최적화된 동기화 시작")
    print("=" * 50)
    
    # 병렬 실행할 작업들
    sync_tasks = [
        ("Git 변경사항", sync_git_changes),
        ("코딩 스타일", sync_coding_style),
        ("BEFS 상태", sync_befs_status)
    ]
    
    # 병렬 실행
    with ThreadPoolExecutor(max_workers=3) as executor:
        futures = {
            executor.submit(run_sync_task, name, func): name 
            for name, func in sync_tasks
        }
        
        results = []
        for future in as_completed(futures):
            result = future.result()
            results.append(result)
            
            status = "✅" if result["success"] else "❌"
            duration = f"{result['duration']:.2f}s"
            
            if result["success"]:
                print(f"{status} {result['task']}: {result['result']} ({duration})")
            else:
                print(f"{status} {result['task']}: {result['error']} ({duration})")
    
    # 총 실행 시간
    total_duration = sum(r['duration'] for r in results)
    success_count = sum(1 for r in results if r['success'])
    
    print("=" * 50)
    print(f"🎉 동기화 완료: {success_count}/{len(results)} 성공")
    print(f"⏱️ 총 실행 시간: {total_duration:.2f}초")

if __name__ == "__main__":
    main()
'''
        
        script_path = os.path.join(STUDIO_DIR, "automation", "optimized_sync.py")
        with open(script_path, 'w', encoding='utf-8') as f:
            f.write(script_content)
        
        # 실행 권한 부여
        os.chmod(script_path, 0o755)
        
        return f"✅ 최적화된 동기화 스크립트 생성: {script_path}"
    
    def run_optimization(self):
        """전체 최적화 실행"""
        print("🔄 동기화 시스템 최적화 시작")
        print("=" * 60)
        
        # 각 최적화 단계 실행
        optimizations = [
            ("Git 작업", self.optimize_git_operations),
            ("성능", self.optimize_sync_performance),
            ("BEFS 통합", self.optimize_befs_integration),
            ("통합 스크립트", self.create_optimized_sync_script)
        ]
        
        all_results = {}
        
        for name, func in optimizations:
            print(f"\n🔧 {name} 최적화:")
            try:
                if name == "통합 스크립트":
                    result = func()
                    print(f"  {result}")
                    all_results[name] = [result]
                else:
                    results = func()
                    for result in results:
                        print(f"  {result}")
                    all_results[name] = results
            except Exception as e:
                error_msg = f"❌ {name} 최적화 오류: {e}"
                print(f"  {error_msg}")
                all_results[name] = [error_msg]
        
        # 최적화 결과 요약
        print("\n" + "=" * 60)
        print("📊 최적화 결과 요약:")
        
        total_optimizations = 0
        successful_optimizations = 0
        
        for category, results in all_results.items():
            success_count = sum(1 for r in results if r.startswith("✅"))
            total_count = len(results)
            total_optimizations += total_count
            successful_optimizations += success_count
            
            print(f"  {category}: {success_count}/{total_count} 성공")
        
        success_rate = (successful_optimizations / total_optimizations * 100) if total_optimizations > 0 else 0
        print(f"\n🎯 전체 성공률: {success_rate:.1f}% ({successful_optimizations}/{total_optimizations})")
        
        return all_results

def main():
    optimizer = SyncOptimizer()
    results = optimizer.run_optimization()
    
    # 결과를 JSON 파일로 저장
    results_file = os.path.join(STUDIO_DIR, "automation", "sync_optimization_results.json")
    with open(results_file, 'w', encoding='utf-8') as f:
        json.dump({
            "timestamp": datetime.now().isoformat(),
            "results": results
        }, f, ensure_ascii=False, indent=2)
    
    print(f"\n💾 최적화 결과 저장됨: {results_file}")

if __name__ == "__main__":
    main()
