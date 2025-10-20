#!/usr/bin/env python3
"""BEFS Automation 설정 관리"""
import os
import json
from pathlib import Path
from typing import Dict, Any

class BEFSConfig:
    """BEFS 설정 관리자"""
    
    def __init__(self):
        self.config_path = Path.home() / ".befs" / "config.json"
        self.config = self.load_config()
    
    def load_config(self) -> Dict[str, Any]:
        """설정 파일 로드"""
        if self.config_path.exists():
            with open(self.config_path, 'r', encoding='utf-8') as f:
                return json.load(f)
        else:
            return self.create_default_config()
    
    def create_default_config(self) -> Dict[str, Any]:
        """기본 설정 생성"""
        default_config = {
            "mode": "development",  # "development" or "production"
            "version": "0.1.0",
            "features": {
                "meta_hub": True,      # 개발 모드에서만 활성화
                "self_management": True,  # 자기 참조 관리
                "project_hub": True,   # 다른 프로젝트 관리
                "debug_mode": True,    # 디버그 기능
                "dev_tools": True      # 개발자 도구
            },
            "projects": {
                "managed_projects": [
                    "befs-automation"
                ]
            },
            "ui": {
                "show_dev_commands": True,
                "show_meta_info": True,
                "enable_god_mode": True
            }
        }
        
        self.save_config(default_config)
        return default_config
    
    def save_config(self, config: Dict[str, Any] = None):
        """설정 파일 저장"""
        if config:
            self.config = config
        
        self.config_path.parent.mkdir(parents=True, exist_ok=True)
        with open(self.config_path, 'w', encoding='utf-8') as f:
            json.dump(self.config, f, indent=2, ensure_ascii=False)
    
    def is_development_mode(self) -> bool:
        """개발 모드 여부"""
        return self.config.get("mode") == "development"
    
    def is_production_mode(self) -> bool:
        """상용 모드 여부"""
        return self.config.get("mode") == "production"
    
    def feature_enabled(self, feature: str) -> bool:
        """특정 기능 활성화 여부"""
        return self.config.get("features", {}).get(feature, False)
    
    def switch_to_production(self):
        """상용 모드로 전환"""
        self.config["mode"] = "production"
        self.config["features"].update({
            "meta_hub": False,
            "self_management": False, 
            "project_hub": False,
            "debug_mode": False,
            "dev_tools": False
        })
        self.config["ui"].update({
            "show_dev_commands": False,
            "show_meta_info": False,
            "enable_god_mode": False
        })
        self.save_config()
    
    def switch_to_development(self):
        """개발 모드로 전환"""
        self.config["mode"] = "development"
        self.config["features"].update({
            "meta_hub": True,
            "self_management": True,
            "project_hub": True, 
            "debug_mode": True,
            "dev_tools": True
        })
        self.config["ui"].update({
            "show_dev_commands": True,
            "show_meta_info": True,
            "enable_god_mode": True
        })
        self.save_config()
    
    def get_managed_projects(self) -> list:
        """관리 대상 프로젝트 목록"""
        if self.is_production_mode():
            return ["befs-automation"]  # 상용 버전에서는 자기만
        else:
            return self.config.get("projects", {}).get("managed_projects", [])

# 전역 설정 인스턴스
config = BEFSConfig()
