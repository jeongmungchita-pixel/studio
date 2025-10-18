#!/usr/bin/env python3
"""BEFS Firebase 연결 테스트"""
import json
import requests
from datetime import datetime

def test_firebase_connection(config_file="befs_firebase_config.json"):
    """Firebase 연결 테스트"""
    
    print(f"🧪 Firebase 연결 테스트: {config_file}")
    
    try:
        # 설정 로드
        with open(config_file) as f:
            config = json.load(f)
        
        print(f"📁 네임스페이스: {config['namespace']}")
        
        # 테스트 데이터 전송
        test_data = {
            "title": "Firebase 연결 테스트",
            "timestamp": datetime.now().isoformat(),
            "status": "success"
        }
        
        url = f"{config['databaseURL']}/{config['namespace']}/test.json"
        response = requests.put(url, json=test_data)
        
        if response.status_code == 200:
            print("✅ Firebase 연결 성공!")
            print(f"   데이터 저장됨: {config['namespace']}/test/")
            return True
        else:
            print(f"❌ Firebase 연결 실패: {response.status_code}")
            return False
            
    except Exception as e:
        print(f"❌ 오류 발생: {e}")
        return False

if __name__ == "__main__":
    test_firebase_connection()
